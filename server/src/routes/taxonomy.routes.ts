import { Router } from 'express';
import * as taxonomy from '../controllers/taxonomy.controller';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/auth';

export const categoryRouter = Router();
categoryRouter.get('/', taxonomy.listCategories);
categoryRouter.post(
  '/',
  requireAuth,
  requireRole('editor', 'admin'),
  validate(taxonomy.categorySchema),
  taxonomy.createCategory
);
categoryRouter.put(
  '/:id',
  requireAuth,
  requireRole('editor', 'admin'),
  validate(taxonomy.categorySchema.partial()),
  taxonomy.updateCategory
);
categoryRouter.delete('/:id', requireAuth, requireRole('admin'), taxonomy.deleteCategory);

export const tagRouter = Router();
tagRouter.get('/', taxonomy.listTags);
tagRouter.delete('/:id', requireAuth, requireRole('admin'), taxonomy.deleteTag);
