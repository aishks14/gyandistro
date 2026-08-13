import { Router } from 'express';
import * as auth from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/register', authLimiter, validate(auth.registerSchema), auth.register);
router.post('/login', authLimiter, validate(auth.loginSchema), auth.login);
router.post('/refresh', auth.refresh);
router.post('/logout', auth.logout);
router.post('/logout-all', requireAuth, auth.logoutEverywhere);
router.get('/me', requireAuth, auth.me);

export default router;
