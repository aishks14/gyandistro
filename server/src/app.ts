import express, { type Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error';
import { globalLimiter } from './middleware/rateLimit';
import { uploadsAbsoluteDir } from './controllers/upload.controller';
import { getSitemap } from './controllers/sitemap.controller';

export function createApp(): Application {
  const app = express();

  // Correct client IPs behind Render/Railway/Nginx, so rate limits work.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Security headers: CSP, HSTS, no MIME sniffing, no framing.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", ...env.clientOrigin],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"]
        }
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: env.isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false
    })
  );

  // Only the listed origins may send credentialed requests.
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.clientOrigin.includes(origin)) return callback(null, true);
        callback(new Error(`Origin ${origin} is not allowed`));
      },
      credentials: true
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(compression());
  app.use(morgan(env.isProd ? 'combined' : 'dev'));
  app.use('/api', globalLimiter);

  // Images uploaded into article bodies. A plain static mount — no auth on
  // the read side, same as any other public image on the site; the write
  // side (the upload endpoint itself) is what's gated by role and rate limit.
  app.use(
    '/uploads',
    express.static(uploadsAbsoluteDir, {
      maxAge: env.isProd ? '30d' : 0,
      // Prevents a browser from executing an uploaded file as HTML/script
      // even if a future mistake let something other than an image through.
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff')
    })
  );

  app.get('/', (_req, res) => {
    res.json({ success: true, message: 'GyanDistro API. See /api/health.' });
  });

  app.get('/sitemap.xml', getSitemap);
  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
