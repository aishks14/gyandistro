import type { Request, Response, NextFunction, RequestHandler } from 'express';

/** Wraps an async route so a rejected promise reaches the error middleware. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
