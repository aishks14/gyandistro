import { Schema, model, Document, Types } from 'mongoose';

/**
 * One row per issued refresh token. Storing only the SHA-256 hash means a
 * database leak does not hand an attacker usable sessions.
 */
export interface IRefreshToken extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  tokenHash: string;
  userAgent?: string;
  ip?: string;
  revokedAt?: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, index: true },
    userAgent: String,
    ip: String,
    revokedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Mongo removes expired sessions on its own.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = model<IRefreshToken>('RefreshToken', refreshTokenSchema);
