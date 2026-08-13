import type { Request, Response } from 'express';
import { z } from 'zod';
import { RoleRequest } from '../models/RoleRequest';
import { User, USER_ROLES } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { revokeAllForUser } from '../services/token.service';

export const createRequestSchema = z.object({
  requestedRole: z.enum(USER_ROLES),
  message: z.string().max(500).optional()
});

export const decisionSchema = z.object({
  decision: z.enum(['approved', 'denied']),
  note: z.string().max(500).optional()
});

const POPULATE_USER = { path: 'user', select: 'name email role avatarUrl' };
const POPULATE_DECIDER = { path: 'decidedBy', select: 'name email' };

/** A reader (or anyone) asks for a different role. One open request at a time. */
export const createRequest = asyncHandler(async (req: Request, res: Response) => {
  const { requestedRole, message } = req.body as z.infer<typeof createRequestSchema>;

  if (requestedRole === req.user!.role) {
    throw ApiError.badRequest(`You already have the ${requestedRole} role`);
  }

  const alreadyPending = await RoleRequest.findOne({ user: req.user!.id, status: 'pending' });
  if (alreadyPending) {
    throw ApiError.conflict('You already have a pending request. Wait for a decision, or cancel it first.');
  }

  const request = await RoleRequest.create({
    user: req.user!.id,
    currentRoleAtRequest: req.user!.role,
    requestedRole,
    message
  });

  res.status(201).json({ success: true, data: request });
});

/** The requester's own history — pending and past decisions. */
export const myRequests = asyncHandler(async (req: Request, res: Response) => {
  const requests = await RoleRequest.find({ user: req.user!.id })
    .populate(POPULATE_DECIDER)
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: requests });
});

/** A requester can withdraw their own request while it is still pending. */
export const cancelRequest = asyncHandler(async (req: Request, res: Response) => {
  const request = await RoleRequest.findById(req.params.id);
  if (!request) throw ApiError.notFound('That request no longer exists');
  if (request.user.toString() !== req.user!.id) {
    throw ApiError.forbidden('You can only cancel your own request');
  }
  if (request.status !== 'pending') {
    throw ApiError.badRequest('Only a pending request can be cancelled');
  }

  await request.deleteOne();
  res.json({ success: true, message: 'Request cancelled' });
});

/** Admin queue — defaults to pending, but any status can be viewed. */
export const listRequests = asyncHandler(async (req: Request, res: Response) => {
  const status = (req.query.status as string) || 'pending';
  const filter = status === 'all' ? {} : { status };

  const requests = await RoleRequest.find(filter)
    .populate(POPULATE_USER)
    .populate(POPULATE_DECIDER)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  res.json({ success: true, data: requests });
});

/** Admin approves or denies. Approval changes the role and revokes old sessions. */
export const decideRequest = asyncHandler(async (req: Request, res: Response) => {
  const { decision, note } = req.body as z.infer<typeof decisionSchema>;

  const request = await RoleRequest.findById(req.params.id);
  if (!request) throw ApiError.notFound('That request no longer exists');
  if (request.status !== 'pending') {
    throw ApiError.badRequest('That request has already been decided');
  }

  request.status = decision;
  request.decidedBy = req.user!.id as unknown as typeof request.decidedBy;
  request.decisionNote = note;
  request.decidedAt = new Date();
  await request.save();

  if (decision === 'approved') {
    const user = await User.findByIdAndUpdate(
      request.user,
      { role: request.requestedRole },
      { new: true }
    );
    if (!user) throw ApiError.notFound('That account no longer exists');

    // Same reasoning as the direct admin role-change route: an old access
    // token still carries the previous role until it expires, so every
    // existing session is revoked to force a fresh, correctly-scoped login.
    await revokeAllForUser(user._id.toString());
  }

  await request.populate([POPULATE_USER, POPULATE_DECIDER]);
  res.json({ success: true, data: request });
});