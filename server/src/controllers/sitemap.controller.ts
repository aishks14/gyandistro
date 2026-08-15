import type { Request, Response } from 'express';
import { Post } from '../models/Post';
import { asyncHandler } from '../utils/asyncHandler';
import { env } from '../config/env';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeBaseUrl(req: Request): string {
  const explicitOrigin = env.clientOrigin[0];
  if (explicitOrigin) return explicitOrigin.replace(/\/+$/, '');
  return `${req.protocol}://${req.get('host')}`.replace(/\/+$/, '');
}

export const getSitemap = asyncHandler(async (req: Request, res: Response) => {
  const baseUrl = normalizeBaseUrl(req);
  const staticPages = ['', '/about', '/contact', '/privacy', '/terms'];

  const posts = await Post.find({ status: 'published' })
    .select('slug updatedAt publishedAt')
    .sort({ publishedAt: -1, updatedAt: -1 })
    .lean();

  const urls = [
    ...staticPages.map((path) => ({
      loc: `${baseUrl}${path}`,
      lastmod: new Date().toISOString()
    })),
    ...posts.map((post) => ({
      loc: `${baseUrl}/article/${post.slug}`,
      lastmod: new Date(post.updatedAt ?? post.publishedAt ?? new Date()).toISOString()
    }))
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <lastmod>${url.lastmod}</lastmod>
  </url>`
  )
  .join('\n')}
</urlset>`;

  res.type('application/xml').send(body);
});
