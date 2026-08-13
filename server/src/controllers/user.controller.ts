import type { Request, Response } from 'express';
import { z } from 'zod';
import { User, USER_ROLES } from '../models/User';
import { Post } from '../models/Post';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { cleanText } from '../utils/sanitize';
import { buildMeta, parsePaging } from '../utils/pagination';
import { revokeAllForUser } from '../services/token.service';

const urlOrEmpty = z.string().url().or(z.literal('')).optional();

export const profileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: urlOrEmpty,
  social: z
    .object({
      website: urlOrEmpty,
      twitter: urlOrEmpty,
      linkedin: urlOrEmpty,
      github: urlOrEmpty,
      instagram: urlOrEmpty,
      youtube: urlOrEmpty
    })
    .optional()
});

export const roleSchema = z.object({ role: z.enum(USER_ROLES) });

export const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: z
    .string()
    .min(8, 'Use at least 8 characters')
    .regex(/[a-z]/, 'Add a lowercase letter')
    .regex(/[A-Z]/, 'Add an uppercase letter')
    .regex(/[0-9]/, 'Add a number')
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof profileSchema>;
  const user = await User.findById(req.user!.id);
  if (!user) throw ApiError.notFound('Account not found');

  if (body.name) user.name = cleanText(body.name);
  if (body.bio !== undefined) user.bio = cleanText(body.bio);
  if (body.avatarUrl !== undefined) user.avatarUrl = body.avatarUrl;
  if (body.social) user.social = { ...user.social, ...body.social };

  await user.save();
  res.json({ success: true, data: user });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body as z.infer<typeof passwordSchema>;
  const user = await User.findById(req.user!.id).select('+password');
  if (!user) throw ApiError.notFound('Account not found');

  const ok = await user.comparePassword(currentPassword);
  if (!ok) throw ApiError.unauthorized('Your current password is incorrect');

  user.password = newPassword;
  await user.save();
  // Changing a password ends every other session.
  await revokeAllForUser(user._id.toString());

  res.json({ success: true, message: 'Password changed. Sign in again on your other devices.' });
});

export const getAuthorProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id).lean();
  if (!user || !user.isActive) throw ApiError.notFound('That author does not exist');

  const posts = await Post.find({ author: user._id, status: 'published' })
    .select('title slug excerpt coverImageUrl publishedAt readingMinutes views')
    .sort({ publishedAt: -1 })
    .limit(20)
    .lean();

  res.json({ success: true, data: { author: user, posts } });
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePaging(req.query as Record<string, unknown>, 20);
  const { search, role } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;
  if (search?.trim()) {
    filter.$or = [
      { name: { $regex: search.trim(), $options: 'i' } },
      { email: { $regex: search.trim(), $options: 'i' } }
    ];
  }

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter)
  ]);

  res.json({ success: true, data: items, meta: buildMeta(page, limit, total) });
});

export const changeRole = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body as z.infer<typeof roleSchema>;
  if (req.params.id === req.user!.id) {
    throw ApiError.badRequest('You cannot change your own role');
  }

  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  if (!user) throw ApiError.notFound('That account does not exist');

  // A demoted user should not keep an old token with the old role.
  await revokeAllForUser(user._id.toString());
  res.json({ success: true, data: user });
});

export const setActive = asyncHandler(async (req: Request, res: Response) => {
  const isActive = Boolean((req.body as { isActive?: boolean }).isActive);
  if (req.params.id === req.user!.id) {
    throw ApiError.badRequest('You cannot deactivate your own account');
  }

  const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
  if (!user) throw ApiError.notFound('That account does not exist');
  if (!isActive) await revokeAllForUser(user._id.toString());

  res.json({ success: true, data: user });
});
