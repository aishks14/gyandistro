import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { RefreshToken } from '../models/RefreshToken';
import type { IUser } from '../models/User';

export interface AccessTokenPayload {
  sub: string;
  role: string;
  email: string;
  name: string;
}

export function signAccessToken(user: IUser): string {
  const payload: AccessTokenPayload = {
    sub: user._id.toString(),
    role: user.role,
    email: user.email,
    name: user.name
  };
  const options = { expiresIn: env.accessTtl } as SignOptions;
  return jwt.sign(payload, env.accessSecret, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.accessSecret) as AccessTokenPayload;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Issues a refresh token and records only its hash. */
export async function issueRefreshToken(
  user: IUser,
  meta: { userAgent?: string; ip?: string }
): Promise<string> {
  const raw = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + env.refreshTtlDays * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(raw),
    userAgent: meta.userAgent,
    ip: meta.ip,
    expiresAt
  });

  return raw;
}

/**
 * Rotation: the presented token is retired and a fresh one takes its place,
 * so a stolen token is usable at most once.
 */
export async function rotateRefreshToken(
  raw: string,
  meta: { userAgent?: string; ip?: string }
) {
  const record = await RefreshToken.findOne({
    tokenHash: hashToken(raw),
    revokedAt: null,
    expiresAt: { $gt: new Date() }
  }).populate<{ user: IUser }>('user');

  if (!record || !record.user) return null;

  record.revokedAt = new Date();
  await record.save();

  const user = record.user as unknown as IUser;
  const nextRaw = await issueRefreshToken(user, meta);
  return { user, refreshToken: nextRaw };
}

export async function revokeRefreshToken(raw: string): Promise<void> {
  await RefreshToken.updateOne(
    { tokenHash: hashToken(raw), revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

export async function revokeAllForUser(userId: string): Promise<void> {
  await RefreshToken.updateMany(
    { user: userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}
