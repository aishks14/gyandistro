import type { Request, Response } from 'express';
import { z } from 'zod';
import { Types, type FilterQuery } from 'mongoose';
import { Post, type IPost, POST_STATUSES } from '../models/Post';
import { Category } from '../models/Category';
import { Tag } from '../models/Tag';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { uniqueSlug, toSlug } from '../utils/slug';
import { cleanPostHtml, makeExcerpt, readingMinutes } from '../utils/sanitize';
import { buildMeta, parsePaging } from '../utils/pagination';
import { hasAtLeast } from '../middleware/auth';

export const postSchema = z.object({
  title: z.string().min(4, 'Title is too short').max(180),
  content: z.string().min(20, 'Write a little more before saving'),
  excerpt: z.string().max(400).optional(),
  coverImageUrl: z.string().url().or(z.literal('')).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).max(12).optional(),
  status: z.enum(POST_STATUSES).optional(),
  isFeatured: z.boolean().optional(),
  isSponsored: z.boolean().optional(),
  sponsorName: z.string().max(80).optional(),
  hasAffiliateLinks: z.boolean().optional(),
  allowComments: z.boolean().optional(),
  seo: z
    .object({
      metaTitle: z.string().max(70).optional(),
      metaDescription: z.string().max(180).optional(),
      keywords: z.array(z.string()).max(15).optional()
    })
    .optional()
});

const POPULATE = [
  { path: 'author', select: 'name avatarUrl bio social role' },
  { path: 'category', select: 'name slug colour' },
  { path: 'tags', select: 'name slug' }
];

/** Finds or creates a category by name and keeps its post count honest. */
async function resolveCategory(name?: string) {
  if (!name?.trim()) return undefined;
  const slug = toSlug(name);
  const found = await Category.findOneAndUpdate(
    { slug },
    { $setOnInsert: { name: name.trim(), slug } },
    { upsert: true, new: true }
  );
  return found._id;
}

async function resolveTags(names: string[] = []) {
  const ids: Types.ObjectId[] = [];
  for (const raw of names) {
    const name = raw.trim().toLowerCase();
    if (!name) continue;
    const slug = toSlug(name);
    const tag = await Tag.findOneAndUpdate(
      { slug },
      { $setOnInsert: { name, slug } },
      { upsert: true, new: true }
    );
    ids.push(tag._id);
  }
  return ids;
}

async function refreshCounts(categoryId?: Types.ObjectId, tagIds: Types.ObjectId[] = []) {
  if (categoryId) {
    const count = await Post.countDocuments({ category: categoryId, status: 'published' });
    await Category.findByIdAndUpdate(categoryId, { postCount: count });
  }
  for (const tagId of tagIds) {
    const count = await Post.countDocuments({ tags: tagId, status: 'published' });
    await Tag.findByIdAndUpdate(tagId, { postCount: count });
  }
}

/** Authors own their drafts; editors and admins can touch anything. */
function canEdit(req: Request, post: IPost): boolean {
  if (!req.user) return false;
  if (hasAtLeast(req.user.role, 'editor')) return true;

  // `post.author` is an ObjectId on a raw document, but a full User object
  // once `.populate('author', ...)` has run (as getPostBySlug does). Calling
  // .toString() on the populated object gives "[object Object]", which can
  // never equal req.user.id — so without this branch, an author viewing
  // their own unpublished draft is incorrectly told it does not exist.
  const authorId = (post.author as unknown as { _id?: unknown })?._id ?? post.author;
  return authorId?.toString() === req.user.id;
}

export const listPosts = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePaging(req.query as Record<string, unknown>);
  const { category, tag, author, search, status, featured, sort } = req.query as Record<string, string>;

  const filter: FilterQuery<IPost> = {};

  // Anyone below editor only ever sees published posts through this route.
  const wantsDrafts = status && status !== 'published';
  if (wantsDrafts && req.user && hasAtLeast(req.user.role, 'editor')) {
    filter.status = status as IPost['status'];
  } else if (wantsDrafts && req.user) {
    filter.status = status as IPost['status'];
    filter.author = new Types.ObjectId(req.user.id);
  } else {
    filter.status = 'published';
  }

  if (category) {
    const cat = await Category.findOne({ slug: category });
    if (!cat) return res.json({ success: true, data: [], meta: buildMeta(page, limit, 0) });
    filter.category = cat._id;
  }
  if (tag) {
    const tagDoc = await Tag.findOne({ slug: tag });
    if (!tagDoc) return res.json({ success: true, data: [], meta: buildMeta(page, limit, 0) });
    filter.tags = tagDoc._id;
  }
  if (author && Types.ObjectId.isValid(author)) filter.author = new Types.ObjectId(author);
  if (featured === 'true') filter.isFeatured = true;
  if (search?.trim()) filter.$text = { $search: search.trim() };

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    newest: { publishedAt: -1, createdAt: -1 },
    oldest: { publishedAt: 1, createdAt: 1 },
    popular: { views: -1 },
    discussed: { commentCount: -1 }
  };

  const [items, total] = await Promise.all([
    Post.find(filter)
      .select('-content')
      .populate(POPULATE)
      .sort(sortMap[sort] ?? sortMap.newest)
      .skip(skip)
      .limit(limit)
      .lean(),
    Post.countDocuments(filter)
  ]);

  res.json({ success: true, data: items, meta: buildMeta(page, limit, total) });
});

export const getPostBySlug = asyncHandler(async (req: Request, res: Response) => {
  const key = req.params.slug;
  // Readers arrive with a slug; the editor screen arrives with an id.
  const post = Types.ObjectId.isValid(key)
    ? await Post.findById(key).populate(POPULATE)
    : await Post.findOne({ slug: key }).populate(POPULATE);
  if (!post) throw ApiError.notFound('That article does not exist');

  if (post.status !== 'published' && !canEdit(req, post)) {
    throw ApiError.notFound('That article does not exist');
  }

  if (post.status === 'published') {
    await Post.updateOne({ _id: post._id }, { $inc: { views: 1 } });
  }

  res.json({ success: true, data: post });
});

export const createPost = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof postSchema>;

  const content = cleanPostHtml(body.content);
  const categoryId = await resolveCategory(body.category);
  const tagIds = await resolveTags(body.tags);

  // Only editors and admins may publish or feature straight away.
  const privileged = hasAtLeast(req.user!.role, 'editor');
  const status = privileged ? body.status ?? 'draft' : body.status === 'published' ? 'pending' : body.status ?? 'draft';

  const post = await Post.create({
    title: body.title,
    slug: await uniqueSlug(Post, body.title),
    content,
    excerpt: body.excerpt?.trim() || makeExcerpt(content),
    coverImageUrl: body.coverImageUrl || undefined,
    author: req.user!.id,
    category: categoryId,
    tags: tagIds,
    status,
    readingMinutes: readingMinutes(content),
    isFeatured: privileged ? Boolean(body.isFeatured) : false,
    isSponsored: Boolean(body.isSponsored),
    sponsorName: body.sponsorName,
    hasAffiliateLinks: Boolean(body.hasAffiliateLinks),
    allowComments: body.allowComments ?? true,
    seo: {
      metaTitle: body.seo?.metaTitle,
      metaDescription: body.seo?.metaDescription,
      keywords: body.seo?.keywords ?? []
    },
    publishedAt: status === 'published' ? new Date() : null
  });

  await refreshCounts(categoryId, tagIds);
  await post.populate(POPULATE);
  res.status(201).json({ success: true, data: post });
});

export const updatePost = asyncHandler(async (req: Request, res: Response) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw ApiError.notFound('That article does not exist');
  if (!canEdit(req, post)) throw ApiError.forbidden('You can only edit your own articles');

  const body = req.body as Partial<z.infer<typeof postSchema>>;
  const privileged = hasAtLeast(req.user!.role, 'editor');

  if (body.title && body.title !== post.title) {
    post.title = body.title;
    post.slug = await uniqueSlug(Post, body.title, post._id.toString());
  }
  if (body.content) {
    post.content = cleanPostHtml(body.content);
    post.readingMinutes = readingMinutes(post.content);
  }
  if (body.excerpt !== undefined) post.excerpt = body.excerpt || makeExcerpt(post.content);
  if (body.coverImageUrl !== undefined) post.coverImageUrl = body.coverImageUrl || undefined;
  if (body.category !== undefined) post.category = await resolveCategory(body.category);
  if (body.tags) post.tags = await resolveTags(body.tags);
  if (body.allowComments !== undefined) post.allowComments = body.allowComments;
  if (body.isSponsored !== undefined) post.isSponsored = body.isSponsored;
  if (body.sponsorName !== undefined) post.sponsorName = body.sponsorName;
  if (body.hasAffiliateLinks !== undefined) post.hasAffiliateLinks = body.hasAffiliateLinks;
  if (body.seo) {
    post.seo = {
      metaTitle: body.seo.metaTitle ?? post.seo?.metaTitle,
      metaDescription: body.seo.metaDescription ?? post.seo?.metaDescription,
      keywords: body.seo.keywords ?? post.seo?.keywords ?? []
    };
  }
  if (body.isFeatured !== undefined && privileged) post.isFeatured = body.isFeatured;

  if (body.status) {
    const next = !privileged && body.status === 'published' ? 'pending' : body.status;
    if (next === 'published' && !post.publishedAt) post.publishedAt = new Date();
    post.status = next;
  }

  await post.save();
  await refreshCounts(post.category ?? undefined, post.tags);
  await post.populate(POPULATE);
  res.json({ success: true, data: post });
});

export const deletePost = asyncHandler(async (req: Request, res: Response) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw ApiError.notFound('That article does not exist');
  if (!canEdit(req, post)) throw ApiError.forbidden('You can only delete your own articles');

  await post.deleteOne();
  await refreshCounts(post.category ?? undefined, post.tags);
  res.json({ success: true, message: 'Article deleted' });
});

export const toggleLike = asyncHandler(async (req: Request, res: Response) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw ApiError.notFound('That article does not exist');

  const userId = new Types.ObjectId(req.user!.id);
  const already = post.likes.some((id) => id.equals(userId));

  if (already) post.likes = post.likes.filter((id) => !id.equals(userId));
  else post.likes.push(userId);

  await post.save();
  res.json({ success: true, data: { liked: !already, likeCount: post.likes.length } });
});

/** Home-page rail: the numbers under the masthead. */
export const stats = asyncHandler(async (_req: Request, res: Response) => {
  const [published, categories, tags, views] = await Promise.all([
    Post.countDocuments({ status: 'published' }),
    Category.countDocuments(),
    Tag.countDocuments(),
    Post.aggregate<{ total: number }>([
      { $match: { status: 'published' } },
      { $group: { _id: null, total: { $sum: '$views' } } }
    ])
  ]);

  res.json({
    success: true,
    data: {
      published,
      categories,
      tags,
      views: views[0]?.total ?? 0
    }
  });
});
