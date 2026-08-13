import { Router } from 'express';
import * as roleRequests from '../controllers/roleRequest.controller';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/auth';
import { writeLimiter } from '../middleware/rateLimit';

const router = Router();

// Any signed-in user can ask for a different role and see their own history.
router.post(
  '/',
  requireAuth,
  writeLimiter,
  validate(roleRequests.createRequestSchema),
  roleRequests.createRequest
);
router.get('/me', requireAuth, roleRequests.myRequests);
router.delete('/:id', requireAuth, roleRequests.cancelRequest);

// Only admins triage the queue and decide.
router.get('/', requireAuth, requireRole('admin'), roleRequests.listRequests);
router.patch(
  '/:id/decision',
  requireAuth,
  requireRole('admin'),
  validate(roleRequests.decisionSchema),
  roleRequests.decideRequest
);

export default router;