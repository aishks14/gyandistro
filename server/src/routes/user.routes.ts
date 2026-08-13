import { Router } from 'express';
import * as users from '../controllers/user.controller';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, requireRole('admin'), users.listUsers);
router.get('/:id', users.getAuthorProfile);
router.put('/me', requireAuth, validate(users.profileSchema), users.updateProfile);
router.put('/me/password', requireAuth, validate(users.passwordSchema), users.changePassword);
router.patch('/:id/role', requireAuth, requireRole('admin'), validate(users.roleSchema), users.changeRole);
router.patch('/:id/active', requireAuth, requireRole('admin'), users.setActive);

export default router;
