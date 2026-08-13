import type { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Images an author drops into the body of an article — as opposed to
 * cover images, which stay a plain URL field the author pastes in themselves.
 *
 * Three deliberate security choices here, all worth keeping if this file
 * is ever touched again:
 *
 *  1. The stored filename is always machine-generated, never derived from
 *     what the browser sends. Trusting a client-supplied filename is how
 *     path traversal and extension-spoofing bugs get in.
 *  2. The file extension comes from a fixed MIME allowlist, not from the
 *     original filename either — the same reasoning as above.
 *  3. SVG is deliberately excluded. An SVG can carry an embedded <script>,
 *     which makes it a stored-XSS vector if it's ever opened directly
 *     rather than rendered as a flat image.
 */

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

export const uploadsAbsoluteDir = path.resolve(process.cwd(), env.uploads.dir);

function ensureUploadsDir(): void {
  if (!fs.existsSync(uploadsAbsoluteDir)) {
    fs.mkdirSync(uploadsAbsoluteDir, { recursive: true });
  }
}
ensureUploadsDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsAbsoluteDir);
  },
  filename: (_req, file, cb) => {
    const ext = ALLOWED_MIME_TO_EXT[file.mimetype];
    if (!ext) {
      // multer still needs a callback; fileFilter below is what actually
      // rejects the request. This branch is only reached for an allowed
      // type, so it exists purely as a type-safe fallback.
      return cb(null, `${crypto.randomBytes(16).toString('hex')}.bin`);
    }
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: env.uploads.maxSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TO_EXT[file.mimetype]) {
      cb(new ApiError(415, 'Only JPEG, PNG, WebP or GIF images are accepted'));
      return;
    }
    cb(null, true);
  }
});

/** `requireAuth` + `requireRole` run first in the route; this only handles the file. */
export const uploadSingleImage = upload.single('image');

export const handleImageUpload = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('No image was received');

  const base = env.uploads.baseUrl ?? `${req.protocol}://${req.get('host')}`;
  const url = `${base}/uploads/${req.file.filename}`;

  res.status(201).json({
    success: true,
    data: { url, filename: req.file.filename, size: req.file.size }
  });
});

/**
 * multer's own errors (file too large, wrong field name, ...) arrive as
 * MulterError, not ApiError — normalised here so the client always gets the
 * same JSON envelope regardless of which layer rejected the upload.
 */
export function multerErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: (err?: unknown) => void
) {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `Image is larger than the ${env.uploads.maxSizeMb}MB limit`
        : err.message;
    return res.status(400).json({ success: false, message });
  }
  next(err);
}