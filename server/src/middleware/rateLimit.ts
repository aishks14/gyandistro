import rateLimit from 'express-rate-limit';

/** Site-wide ceiling. Generous enough that ordinary reading never trips it. */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 900,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Try again in a few minutes.' }
});

/** Sign-in / sign-up. Tight, because this is where credential stuffing lands. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Try again in 15 minutes.' }
});

/** Writes that cost money or moderation time. */
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Slow down a moment, then try again.' }
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'AI assist is limited to 10 calls a minute.' }
});

export const pdfLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many PDF downloads. Try again in a minute.' }
});
