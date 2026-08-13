import { Router } from 'express';
import * as posts from '../controllers/post.controller';
import * as comments from '../controllers/comment.controller';
import { validate } from '../middleware/validate';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth';
import { writeLimiter } from '../middleware/rateLimit';

const router = Router();

router.get('/stats', posts.stats);
router.get('/', optionalAuth, posts.listPosts);
router.get('/:slug', optionalAuth, posts.getPostBySlug);

// Comments live under their article.
router.get('/:slug/comments', comments.listComments);
router.post(
  '/:slug/comments',
  requireAuth,
  writeLimiter,
  validate(comments.commentSchema),
  comments.addComment
);

router.post(
  '/',
  requireAuth,
  requireRole('author', 'editor', 'admin'),
  writeLimiter,
  validate(posts.postSchema),
  posts.createPost
);
router.put(
  '/:id',
  requireAuth,
  requireRole('author', 'editor', 'admin'),
  validate(posts.postSchema.partial()),
  posts.updatePost
);
router.delete('/:id', requireAuth, requireRole('author', 'editor', 'admin'), posts.deletePost);
router.post('/:id/like', requireAuth, posts.toggleLike);

export default router;
