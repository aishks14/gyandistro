import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/token.service';
import { ApiError } from '../utils/ApiError';
import type { UserRole } from '../models/User';

function readToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

/** Hard gate: no valid access token, no entry. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) return next(ApiError.unauthorized());
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role as UserRole,
      email: payload.email,
      name: payload.name
    };
    next();
  } catch {
    next(ApiError.unauthorized('Your session expired. Sign in again.'));
  }
}

/** Soft gate: attaches the user when a token is present, never rejects. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role as UserRole,
      email: payload.email,
      name: payload.name
    };
  } catch {
    /* ignore an expired token on a public route */
  }
  next();
}

/** Role gate. Use after requireAuth: requireRole('editor', 'admin'). */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`This action needs one of: ${roles.join(', ')}`));
    }
    next();
  };
}

const RANK: Record<UserRole, number> = { reader: 0, author: 1, editor: 2, admin: 3 };

export function hasAtLeast(role: UserRole, minimum: UserRole): boolean {
  return RANK[role] >= RANK[minimum];
}
