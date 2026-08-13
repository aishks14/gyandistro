import type { UserRole } from '../models/User';

declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: string;
      role: UserRole;
      email: string;
      name: string;
    }
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
