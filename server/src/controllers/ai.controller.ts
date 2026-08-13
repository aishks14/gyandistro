import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import * as ai from '../services/ai.service';

export const aiInputSchema = z.object({
  content: z.string().min(20, 'Give the assistant more to work with').max(40000),
  title: z.string().max(180).optional()
});

export const status = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: ai.aiStatus() });
});

export const summarise = asyncHandler(async (req: Request, res: Response) => {
  const { content } = req.body as z.infer<typeof aiInputSchema>;
  res.json({ success: true, data: { summary: await ai.summarise(content) } });
});

export const excerpt = asyncHandler(async (req: Request, res: Response) => {
  const { content } = req.body as z.infer<typeof aiInputSchema>;
  res.json({ success: true, data: { excerpt: await ai.suggestExcerpt(content) } });
});

export const titles = asyncHandler(async (req: Request, res: Response) => {
  const { content } = req.body as z.infer<typeof aiInputSchema>;
  res.json({ success: true, data: { titles: await ai.suggestTitles(content) } });
});

export const tags = asyncHandler(async (req: Request, res: Response) => {
  const { content } = req.body as z.infer<typeof aiInputSchema>;
  res.json({ success: true, data: { tags: await ai.suggestTags(content) } });
});

export const seo = asyncHandler(async (req: Request, res: Response) => {
  const { content, title } = req.body as z.infer<typeof aiInputSchema>;
  res.json({ success: true, data: await ai.suggestSeo(title ?? '', content) });
});

export const improve = asyncHandler(async (req: Request, res: Response) => {
  const { content } = req.body as z.infer<typeof aiInputSchema>;
  res.json({ success: true, data: { content: await ai.improveDraft(content) } });
});
