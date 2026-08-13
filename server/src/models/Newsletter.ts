import { Schema, model, Document, Types } from 'mongoose';

export interface INewsletterSubscriber extends Document {
  _id: Types.ObjectId;
  email: string;
  isConfirmed: boolean;
  source?: string;
  createdAt: Date;
}

const schema = new Schema<INewsletterSubscriber>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    isConfirmed: { type: Boolean, default: false },
    source: String
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const NewsletterSubscriber = model<INewsletterSubscriber>(
  'NewsletterSubscriber',
  schema
);
