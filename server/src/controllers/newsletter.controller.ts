import type { Request, Response } from 'express';
import { z } from 'zod';
import { NewsletterSubscriber } from '../models/Newsletter';
import { asyncHandler } from '../utils/asyncHandler';

export const subscribeSchema = z.object({
  email: z.string().email('Enter a valid email'),
  source: z.string().max(40).optional()
});

export const subscribe = asyncHandler(async (req: Request, res: Response) => {
  const { email, source } = req.body as z.infer<typeof subscribeSchema>;
  await NewsletterSubscriber.updateOne(
    { email },
    { $setOnInsert: { email, source: source ?? 'footer' } },
    { upsert: true }
  );
  res.status(201).json({ success: true, message: 'You are on the list' });
});

export const listSubscribers = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await NewsletterSubscriber.find().sort({ createdAt: -1 }).limit(1000).lean();
  res.json({ success: true, data: rows });
});
