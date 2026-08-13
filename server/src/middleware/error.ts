import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`No route matches ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  let statusCode = err.statusCode ?? 500;
  let message = err.message ?? 'Something went wrong';
  let details = err.details;

  // Duplicate key — surface the field that clashed.
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'value';
    message = `That ${field} is already taken`;
  }

  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    details = Object.values(err.errors).map((e: any) => ({
      field: e.path,
      message: e.message
    }));
    message = 'Check the highlighted fields';
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'That identifier is not valid';
  }

  if (statusCode >= 500) {
    console.error('[error]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    // Stack traces stay out of production responses.
    ...(env.isProd ? {} : { stack: err.stack })
  });
}
