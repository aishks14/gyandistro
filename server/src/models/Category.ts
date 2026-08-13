import { Schema, model, Document, Types } from 'mongoose';

export interface ICategory extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  colour: string;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, maxlength: 300 },
    colour: { type: String, default: '#F0A92E' },
    postCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const Category = model<ICategory>('Category', categorySchema);
