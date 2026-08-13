import type { Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { User, type IUser } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import {
  issueRefreshToken,
  revokeAllForUser,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken
} from '../services/token.service';

const REFRESH_COOKIE = 'gd_refresh';
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const strongPassword = z
  .string()
  .min(8, 'Use at least 8 characters')
  .regex(/[a-z]/, 'Add a lowercase letter')
  .regex(/[A-Z]/, 'Add an uppercase letter')
  .regex(/[0-9]/, 'Add a number');

export const registerSchema = z.object({
  name: z.string().min(2, 'Name is too short').max(80),
  email: z.string().email('Enter a valid email'),
  password: strongPassword
});

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password')
});

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,              // JavaScript can never read it
    secure: env.isProd,          // HTTPS only in production
    sameSite: env.isProd ? 'none' : 'lax',
    domain: env.cookieDomain,
    path: '/api/auth',
    maxAge: env.refreshTtlDays * 24 * 60 * 60 * 1000
  });
}

function publicUser(user: IUser) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    bio: user.bio ?? '',
    avatarUrl: user.avatarUrl ?? '',
    social: user.social ?? {},
    createdAt: user.createdAt
  };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body as z.infer<typeof registerSchema>;

  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict('An account with that email already exists');

  // The very first account to be created owns the site.
  const isFirstUser = (await User.estimatedDocumentCount()) === 0;

  const user = await User.create({
    name,
    email,
    password,
    role: isFirstUser ? 'admin' : 'reader'
  });

  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user, {
    userAgent: req.get('user-agent') ?? undefined,
    ip: req.ip
  });
  setRefreshCookie(res, refreshToken);

  res.status(201).json({ success: true, data: { user: publicUser(user), accessToken } });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const user = await User.findOne({ email }).select(
    '+password +failedLoginAttempts +lockedUntil'
  );
  // Same message either way, so the response cannot be used to enumerate accounts.
  if (!user) throw ApiError.unauthorized('Email or password is incorrect');

  if (user.isLocked()) {
    const minutes = Math.ceil(((user.lockedUntil?.getTime() ?? 0) - Date.now()) / 60000);
    throw ApiError.tooMany(`Account locked after repeated failures. Try again in ${minutes} min.`);
  }

  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');

  const ok = await user.comparePassword(password);
  if (!ok) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    throw ApiError.unauthorized('Email or password is incorrect');
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user, {
    userAgent: req.get('user-agent') ?? undefined,
    ip: req.ip
  });
  setRefreshCookie(res, refreshToken);

  res.json({ success: true, data: { user: publicUser(user), accessToken } });
});

/** Trades a valid refresh cookie for a new access token and a new cookie. */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  if (!raw) throw ApiError.unauthorized('No active session');

  const rotated = await rotateRefreshToken(raw, {
    userAgent: req.get('user-agent') ?? undefined,
    ip: req.ip
  });
  if (!rotated) throw ApiError.unauthorized('Session is no longer valid. Sign in again.');

  setRefreshCookie(res, rotated.refreshToken);
  res.json({
    success: true,
    data: { user: publicUser(rotated.user), accessToken: signAccessToken(rotated.user) }
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  if (raw) await revokeRefreshToken(raw);
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth', domain: env.cookieDomain });
  res.json({ success: true, message: 'Signed out' });
});

export const logoutEverywhere = asyncHandler(async (req: Request, res: Response) => {
  await revokeAllForUser(req.user!.id);
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth', domain: env.cookieDomain });
  res.json({ success: true, message: 'Signed out on every device' });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) throw ApiError.notFound('Account not found');
  res.json({ success: true, data: publicUser(user) });
});
