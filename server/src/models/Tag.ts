import { Schema, model, Document, Types } from 'mongoose';

export interface ITag extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const tagSchema = new Schema<ITag>(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 40 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    postCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const Tag = model<ITag>('Tag', tagSchema);
