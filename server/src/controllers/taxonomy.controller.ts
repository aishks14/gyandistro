import type { Request, Response } from 'express';
import { z } from 'zod';
import { Category } from '../models/Category';
import { Tag } from '../models/Tag';
import { Post } from '../models/Post';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { toSlug, uniqueSlug } from '../utils/slug';

export const categorySchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(300).optional(),
  colour: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #F0A92E').optional()
});

export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await Category.find().sort({ name: 1 }).lean();
  res.json({ success: true, data: rows });
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof categorySchema>;
  const exists = await Category.findOne({ slug: toSlug(body.name) });
  if (exists) throw ApiError.conflict('That category already exists');

  const category = await Category.create({
    ...body,
    slug: await uniqueSlug(Category, body.name)
  });
  res.status(201).json({ success: true, data: category });
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as Partial<z.infer<typeof categorySchema>>;
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('That category does not exist');

  if (body.name && body.name !== category.name) {
    category.name = body.name;
    category.slug = await uniqueSlug(Category, body.name, category._id.toString());
  }
  if (body.description !== undefined) category.description = body.description;
  if (body.colour) category.colour = body.colour;

  await category.save();
  res.json({ success: true, data: category });
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('That category does not exist');

  const inUse = await Post.countDocuments({ category: category._id });
  if (inUse > 0) throw ApiError.badRequest(`${inUse} article(s) still use this category`);

  await category.deleteOne();
  res.json({ success: true, message: 'Category deleted' });
});

export const listTags = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await Tag.find().sort({ postCount: -1, name: 1 }).limit(200).lean();
  res.json({ success: true, data: rows });
});

export const deleteTag = asyncHandler(async (req: Request, res: Response) => {
  const tag = await Tag.findById(req.params.id);
  if (!tag) throw ApiError.notFound('That tag does not exist');
  await Post.updateMany({ tags: tag._id }, { $pull: { tags: tag._id } });
  await tag.deleteOne();
  res.json({ success: true, message: 'Tag deleted' });
});
