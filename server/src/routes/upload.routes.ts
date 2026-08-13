import { Router } from 'express';
import * as uploads from '../controllers/upload.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { writeLimiter } from '../middleware/rateLimit';

const router = Router();

// Only accounts that can write articles can upload images for them.
router.post(
  '/image',
  requireAuth,
  requireRole('author', 'editor', 'admin'),
  writeLimiter,
  uploads.uploadSingleImage,
  uploads.multerErrorHandler,
  uploads.handleImageUpload
);

export default router;