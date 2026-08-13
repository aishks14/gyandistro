import { Schema, model, Document, Types } from 'mongoose';

export const POST_STATUSES = ['draft', 'pending', 'published', 'archived'] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export interface IPost extends Document {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl?: string;
  author: Types.ObjectId;
  category?: Types.ObjectId;
  tags: Types.ObjectId[];
  status: PostStatus;
  readingMinutes: number;
  views: number;
  likes: Types.ObjectId[];
  commentCount: number;
  isFeatured: boolean;
  isSponsored: boolean;
  sponsorName?: string;
  hasAffiliateLinks: boolean;
  allowComments: boolean;
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    keywords: string[];
  };
  aiSummary?: string;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    excerpt: { type: String, required: true, maxlength: 400 },
    content: { type: String, required: true },
    coverImageUrl: String,
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', index: true },
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag', index: true }],
    status: { type: String, enum: POST_STATUSES, default: 'draft', index: true },
    readingMinutes: { type: Number, default: 1 },
    views: { type: Number, default: 0 },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    commentCount: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false, index: true },
    isSponsored: { type: Boolean, default: false },
    sponsorName: String,
    hasAffiliateLinks: { type: Boolean, default: false },
    allowComments: { type: Boolean, default: true },
    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: { type: [String], default: [] }
    },
    aiSummary: String,
    publishedAt: { type: Date, default: null, index: true }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Powers the search box on the home page.
postSchema.index({ title: 'text', excerpt: 'text', content: 'text' });
// Powers the default "newest published first" feed.
postSchema.index({ status: 1, publishedAt: -1 });

postSchema.virtual('likeCount').get(function likeCount(this: IPost) {
  return this.likes?.length ?? 0;
});

export const Post = model<IPost>('Post', postSchema);
