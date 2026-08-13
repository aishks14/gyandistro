import type { Request, Response } from 'express';
import { z } from 'zod';
import { Ad, AD_PLACEMENTS } from '../models/Ad';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

export const adSchema = z.object({
  name: z.string().min(2).max(80),
  placement: z.enum(AD_PLACEMENTS),
  kind: z.enum(['image', 'html']).default('image'),
  imageUrl: z.string().url().or(z.literal('')).optional(),
  targetUrl: z.string().url().or(z.literal('')).optional(),
  html: z.string().max(8000).optional(),
  weight: z.number().int().min(1).max(100).default(1),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional()
});

/** Weighted random pick: a creative with weight 3 shows three times as often. */
function pickWeighted<T extends { weight: number }>(items: T[]): T | null {
  if (!items.length) return null;
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

/** Public: returns one live creative for a slot, or null so the slot collapses. */
export const serveAd = asyncHandler(async (req: Request, res: Response) => {
  const placement = req.params.placement;
  const now = new Date();

  const candidates = await Ad.find({
    placement,
    isActive: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] }
    ]
  }).lean();

  const chosen = pickWeighted(candidates);
  if (!chosen) return res.json({ success: true, data: null });

  await Ad.updateOne({ _id: chosen._id }, { $inc: { impressions: 1 } });
  res.json({ success: true, data: chosen });
});

export const trackClick = asyncHandler(async (req: Request, res: Response) => {
  await Ad.updateOne({ _id: req.params.id }, { $inc: { clicks: 1 } });
  res.json({ success: true });
});

export const listAds = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await Ad.find().sort({ createdAt: -1 }).lean();
  const withCtr = rows.map((ad) => ({
    ...ad,
    ctr: ad.impressions ? Number(((ad.clicks / ad.impressions) * 100).toFixed(2)) : 0
  }));
  res.json({ success: true, data: withCtr });
});

export const createAd = asyncHandler(async (req: Request, res: Response) => {
  const ad = await Ad.create(req.body);
  res.status(201).json({ success: true, data: ad });
});

export const updateAd = asyncHandler(async (req: Request, res: Response) => {
  const ad = await Ad.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!ad) throw ApiError.notFound('That ad unit does not exist');
  res.json({ success: true, data: ad });
});

export const deleteAd = asyncHandler(async (req: Request, res: Response) => {
  const ad = await Ad.findByIdAndDelete(req.params.id);
  if (!ad) throw ApiError.notFound('That ad unit does not exist');
  res.json({ success: true, message: 'Ad unit deleted' });
});
