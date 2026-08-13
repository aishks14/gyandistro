import { Router } from 'express';
import * as comments from '../controllers/comment.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/pending', requireAuth, requireRole('editor', 'admin'), comments.pendingComments);
router.get('/mine', requireAuth, comments.myComments);
router.patch('/:id/status', requireAuth, requireRole('editor', 'admin'), comments.moderateCommentStatus);
router.delete('/:id', requireAuth, comments.deleteComment);

export default router;
