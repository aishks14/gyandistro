import { Schema, model, Document, Types } from 'mongoose';

export const COMMENT_STATUSES = ['visible', 'pending', 'rejected', 'deleted'] as const;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];

export interface IComment extends Document {
  _id: Types.ObjectId;
  post: Types.ObjectId;
  author: Types.ObjectId;
  parent?: Types.ObjectId | null;
  depth: number;
  body: string;
  status: CommentStatus;
  moderationNote?: string;
  likes: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
    depth: { type: Number, default: 0, max: 3 },
    body: { type: String, required: true, maxlength: 3000 },
    status: { type: String, enum: COMMENT_STATUSES, default: 'visible', index: true },
    moderationNote: String,
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: true }
);

commentSchema.index({ post: 1, createdAt: 1 });

export const Comment = model<IComment>('Comment', commentSchema);
