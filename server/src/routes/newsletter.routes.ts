import { Router } from 'express';
import * as newsletter from '../controllers/newsletter.controller';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/auth';
import { writeLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/', writeLimiter, validate(newsletter.subscribeSchema), newsletter.subscribe);
router.get('/', requireAuth, requireRole('admin'), newsletter.listSubscribers);

export default router;
