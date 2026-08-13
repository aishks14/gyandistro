import { Router } from 'express';
import * as ads from '../controllers/ad.controller';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/serve/:placement', ads.serveAd);
router.post('/:id/click', ads.trackClick);

router.get('/', requireAuth, requireRole('admin'), ads.listAds);
router.post('/', requireAuth, requireRole('admin'), validate(ads.adSchema), ads.createAd);
router.put('/:id', requireAuth, requireRole('admin'), validate(ads.adSchema.partial()), ads.updateAd);
router.delete('/:id', requireAuth, requireRole('admin'), ads.deleteAd);

export default router;
