import type { Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Comment } from '../models/Comment';
import { Post } from '../models/Post';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { cleanText } from '../utils/sanitize';
import { moderateComment } from '../services/ai.service';
import { hasAtLeast } from '../middleware/auth';

const MAX_DEPTH = 3;

export const commentSchema = z.object({
  body: z.string().min(2, 'Write a little more').max(3000),
  parent: z.string().optional()
});

export interface CommentNode {
  _id: string;
  body: string;
  status: string;
  createdAt: Date;
  depth: number;
  likeCount: number;
  author: unknown;
  replies: CommentNode[];
}

/** Flat list from Mongo, tree for the UI. */
function buildTree(rows: Array<Record<string, any>>): CommentNode[] {
  const byId = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const row of rows) {
    byId.set(String(row._id), {
      _id: String(row._id),
      body: row.status === 'deleted' ? '[removed]' : row.body,
      status: row.status,
      createdAt: row.createdAt,
      depth: row.depth,
      likeCount: row.likes?.length ?? 0,
      author: row.author,
      replies: []
    });
  }

  for (const row of rows) {
    const node = byId.get(String(row._id))!;
    const parentId = row.parent ? String(row.parent) : null;
    if (parentId && byId.has(parentId)) byId.get(parentId)!.replies.push(node);
    else roots.push(node);
  }

  return roots;
}

export const listComments = asyncHandler(async (req: Request, res: Response) => {
  const post = await Post.findOne({ slug: req.params.slug }).select('_id');
  if (!post) throw ApiError.notFound('That article does not exist');

  const rows = await Comment.find({ post: post._id, status: { $ne: 'rejected' } })
    .populate({ path: 'author', select: 'name avatarUrl role' })
    .sort({ createdAt: 1 })
    .lean();

  res.json({ success: true, data: buildTree(rows) });
});

export const addComment = asyncHandler(async (req: Request, res: Response) => {
  const { body, parent } = req.body as z.infer<typeof commentSchema>;

  const post = await Post.findOne({ slug: req.params.slug });
  if (!post) throw ApiError.notFound('That article does not exist');
  if (!post.allowComments) throw ApiError.forbidden('Comments are closed on this article');
  if (post.status !== 'published') throw ApiError.forbidden('This article is not live yet');

  let depth = 0;
  if (parent) {
    if (!Types.ObjectId.isValid(parent)) throw ApiError.badRequest('That reply target is not valid');
    const parentComment = await Comment.findById(parent);
    if (!parentComment || !parentComment.post.equals(post._id)) {
      throw ApiError.notFound('The comment you replied to is gone');
    }
    depth = parentComment.depth + 1;
    if (depth > MAX_DEPTH) throw ApiError.badRequest('Replies only nest three levels deep');
  }

  const text = cleanText(body);
  if (!text) throw ApiError.badRequest('Write a little more');

  // AI moderation is advisory: if it is off or unreachable, the comment goes live.
  const verdict = await moderateComment(text);

  const comment = await Comment.create({
    post: post._id,
    author: req.user!.id,
    parent: parent ?? null,
    depth,
    body: text,
    status: verdict.allow ? 'visible' : 'pending',
    moderationNote: verdict.allow ? undefined : verdict.reason
  });

  if (verdict.allow) {
    await Post.updateOne({ _id: post._id }, { $inc: { commentCount: 1 } });
  }

  await comment.populate({ path: 'author', select: 'name avatarUrl role' });

  res.status(201).json({
    success: true,
    data: comment,
    message: verdict.allow ? undefined : 'Held for review by a moderator'
  });
});

export const deleteComment = asyncHandler(async (req: Request, res: Response) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw ApiError.notFound('That comment is already gone');

  const isCommentOwner = comment.author.toString() === req.user!.id;
  const isPrivileged = hasAtLeast(req.user!.role, 'editor');

  // An article's own author may also moderate comments left on that
  // article, even without an editor role — the same courtesy most
  // publishing platforms extend to writers over their own comment threads.
  let isArticleOwner = false;
  if (!isCommentOwner && !isPrivileged) {
    const post = await Post.findById(comment.post).select('author');
    isArticleOwner = post?.author.toString() === req.user!.id;
  }

  if (!isCommentOwner && !isPrivileged && !isArticleOwner) {
    throw ApiError.forbidden('You can only delete your own comments');
  }

  comment.status = 'deleted';
  comment.body = '[removed]';
  await comment.save();
  await Post.updateOne({ _id: comment.post }, { $inc: { commentCount: -1 } });

  res.json({ success: true, message: 'Comment removed' });
});

export const moderateCommentStatus = asyncHandler(async (req: Request, res: Response) => {
  const status = (req.body as { status?: string }).status;
  if (!status || !['visible', 'rejected'].includes(status)) {
    throw ApiError.badRequest('Status must be "visible" or "rejected"');
  }

  const comment = await Comment.findById(req.params.id);
  if (!comment) throw ApiError.notFound('That comment is gone');

  const wasVisible = comment.status === 'visible';
  comment.status = status as 'visible' | 'rejected';
  await comment.save();

  if (!wasVisible && status === 'visible') {
    await Post.updateOne({ _id: comment.post }, { $inc: { commentCount: 1 } });
  }
  if (wasVisible && status === 'rejected') {
    await Post.updateOne({ _id: comment.post }, { $inc: { commentCount: -1 } });
  }

  res.json({ success: true, data: comment });
});

export const pendingComments = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await Comment.find({ status: 'pending' })
    .populate({ path: 'author', select: 'name email' })
    .populate({ path: 'post', select: 'title slug' })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: rows });
});

/** Every comment left on any article this user wrote — their own inbox. */
export const myComments = asyncHandler(async (req: Request, res: Response) => {
  const myPostIds = await Post.find({ author: req.user!.id }).distinct('_id');

  const rows = await Comment.find({ post: { $in: myPostIds }, status: { $ne: 'deleted' } })
    .populate({ path: 'author', select: 'name avatarUrl role' })
    .populate({ path: 'post', select: 'title slug' })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  res.json({ success: true, data: rows });
});
