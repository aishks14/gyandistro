import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export const USER_ROLES = ['reader', 'author', 'editor', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface SocialLinks {
  website?: string;
  twitter?: string;
  linkedin?: string;
  github?: string;
  instagram?: string;
  youtube?: string;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  bio?: string;
  avatarUrl?: string;
  social: SocialLinks;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil?: Date | null;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
  isLocked(): boolean;
}

const socialSchema = new Schema<SocialLinks>(
  {
    website: String,
    twitter: String,
    linkedin: String,
    github: String,
    instagram: String,
    youtube: String
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    // select:false keeps the hash out of every ordinary query result.
    password: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: 'reader', index: true },
    bio: { type: String, maxlength: 500 },
    avatarUrl: String,
    social: { type: socialSchema, default: {} },
    isActive: { type: Boolean, default: true },
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockedUntil: { type: Date, default: null, select: false },
    lastLoginAt: { type: Date, default: null }
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isLocked = function isLocked() {
  return Boolean(this.lockedUntil && this.lockedUntil.getTime() > Date.now());
};

export const User = model<IUser>('User', userSchema);
