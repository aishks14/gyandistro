import { Router } from 'express';
import * as ai from '../controllers/ai.controller';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/auth';
import { aiLimiter } from '../middleware/rateLimit';

const router = Router();

router.get('/status', ai.status);

// Every generative call needs an author-or-above account.
router.use(requireAuth, requireRole('author', 'editor', 'admin'), aiLimiter);
router.post('/summarise', validate(ai.aiInputSchema), ai.summarise);
router.post('/excerpt', validate(ai.aiInputSchema), ai.excerpt);
router.post('/titles', validate(ai.aiInputSchema), ai.titles);
router.post('/tags', validate(ai.aiInputSchema), ai.tags);
router.post('/seo', validate(ai.aiInputSchema), ai.seo);
router.post('/improve', validate(ai.aiInputSchema), ai.improve);

export default router;
