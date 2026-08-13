import { Schema, model, Document, Types } from 'mongoose';
import type { UserRole } from './User';

export const ROLE_REQUEST_STATUSES = ['pending', 'approved', 'denied'] as const;
export type RoleRequestStatus = (typeof ROLE_REQUEST_STATUSES)[number];

export interface IRoleRequest extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  currentRoleAtRequest: UserRole;
  requestedRole: UserRole;
  message?: string;
  status: RoleRequestStatus;
  decidedBy?: Types.ObjectId | null;
  decisionNote?: string;
  decidedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const roleRequestSchema = new Schema<IRoleRequest>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    currentRoleAtRequest: {
      type: String,
      enum: ['reader', 'author', 'editor', 'admin'],
      required: true
    },
    requestedRole: {
      type: String,
      enum: ['reader', 'author', 'editor', 'admin'],
      required: true
    },
    message: { type: String, maxlength: 500 },
    status: { type: String, enum: ROLE_REQUEST_STATUSES, default: 'pending', index: true },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    decisionNote: { type: String, maxlength: 500 },
    decidedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

// A user should only ever have one open request at a time — the controller
// enforces this at creation time; this index makes that check fast.
roleRequestSchema.index({ user: 1, status: 1 });

export const RoleRequest = model<IRoleRequest>('RoleRequest', roleRequestSchema);