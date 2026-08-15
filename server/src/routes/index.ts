import { Router } from 'express';
import authRoutes from './auth.routes';
import postRoutes from './post.routes';
import commentRoutes from './comment.routes';
import userRoutes from './user.routes';
import adRoutes from './ad.routes';
import aiRoutes from './ai.routes';
import newsletterRoutes from './newsletter.routes';
import roleRequestRoutes from './roleRequest.routes';
import uploadRoutes from './upload.routes';
import analyticsRoutes from './analytics.routes';
import { categoryRouter, tagRouter } from './taxonomy.routes';
import { getSitemap } from '../controllers/sitemap.controller';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, service: 'gyandistro-api', time: new Date().toISOString() });
});

router.get('/sitemap.xml', getSitemap);

router.use('/auth', authRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/categories', categoryRouter);
router.use('/tags', tagRouter);
router.use('/users', userRoutes);
router.use('/ads', adRoutes);
router.use('/ai', aiRoutes);
router.use('/newsletter', newsletterRoutes);
router.use('/role-requests', roleRequestRoutes);
router.use('/uploads', uploadRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
