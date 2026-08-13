import { Schema, model, Document, Types } from 'mongoose';

export const AD_PLACEMENTS = [
  'header',
  'sidebar',
  'in-article',
  'below-post',
  'footer'
] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

export interface IAd extends Document {
  _id: Types.ObjectId;
  name: string;
  placement: AdPlacement;
  /** "image" = house creative, "html" = pasted network code (AdSense, Ezoic, ...) */
  kind: 'image' | 'html';
  imageUrl?: string;
  targetUrl?: string;
  html?: string;
  weight: number;
  isActive: boolean;
  impressions: number;
  clicks: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const adSchema = new Schema<IAd>(
  {
    name: { type: String, required: true, trim: true },
    placement: { type: String, enum: AD_PLACEMENTS, required: true, index: true },
    kind: { type: String, enum: ['image', 'html'], default: 'image' },
    imageUrl: String,
    targetUrl: String,
    html: String,
    weight: { type: Number, default: 1, min: 1, max: 100 },
    isActive: { type: Boolean, default: true, index: true },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const Ad = model<IAd>('Ad', adSchema);
