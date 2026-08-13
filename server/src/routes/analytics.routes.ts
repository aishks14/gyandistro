import { Router } from 'express';
import * as analytics from '../controllers/analytics.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// An author sees their own numbers; editor+ may also pass ?userId= to view
// someone else's (the controller enforces that check, not the route).
router.get('/author', requireAuth, requireRole('author', 'editor', 'admin'), analytics.authorAnalytics);

// The whole content pipeline, every author included — editor+ only.
router.get('/site', requireAuth, requireRole('editor', 'admin'), analytics.siteAnalytics);

// Users, ads, newsletter growth — admin only.
router.get('/platform', requireAuth, requireRole('admin'), analytics.platformAnalytics);

export default router;
