export type UserRole = 'reader' | 'author' | 'editor' | 'admin';
export type PostStatus = 'draft' | 'pending' | 'published' | 'archived';
export type AdPlacement = 'header' | 'sidebar' | 'in-article' | 'below-post' | 'footer';

export interface SocialLinks {
  website?: string;
  twitter?: string;
  linkedin?: string;
  github?: string;
  instagram?: string;
  youtube?: string;
}

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  bio?: string;
  avatarUrl?: string;
  social?: SocialLinks;
  isActive?: boolean;
  createdAt?: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  colour: string;
  postCount: number;
}

export interface Tag {
  _id: string;
  name: string;
  slug: string;
  postCount: number;
}

export interface Post {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  coverImageUrl?: string;
  author: User;
  category?: Category;
  tags: Tag[];
  status: PostStatus;
  readingMinutes: number;
  views: number;
  likes: string[];
  commentCount: number;
  isFeatured: boolean;
  isSponsored: boolean;
  sponsorName?: string;
  hasAffiliateLinks: boolean;
  allowComments: boolean;
  seo?: { metaTitle?: string; metaDescription?: string; keywords?: string[] };
  aiSummary?: string;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CommentNode {
  _id: string;
  body: string;
  status: string;
  createdAt: string;
  depth: number;
  likeCount: number;
  author: Pick<User, 'name' | 'avatarUrl' | 'role'> & { _id: string };
  replies: CommentNode[];
}

export interface Ad {
  _id: string;
  name: string;
  placement: AdPlacement;
  kind: 'image' | 'html';
  imageUrl?: string;
  targetUrl?: string;
  html?: string;
  weight: number;
  isActive: boolean;
  impressions: number;
  clicks: number;
  ctr?: number;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SiteStats {
  published: number;
  categories: number;
  tags: number;
  views: number;
}

export type RoleRequestStatus = 'pending' | 'approved' | 'denied';

export interface RoleRequest {
  _id: string;
  user: Pick<User, 'name' | 'email' | 'role' | 'avatarUrl'> & { _id: string };
  currentRoleAtRequest: UserRole;
  requestedRole: UserRole;
  message?: string;
  status: RoleRequestStatus;
  decidedBy?: Pick<User, 'name' | 'email'> & { _id: string };
  decisionNote?: string;
  decidedAt?: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------- analytics */

export interface TimeSeriesPoint {
  _id: string; // 'YYYY-MM-DD'
  count?: number;
  posts?: number;
  views?: number;
}

export interface StatusCount {
  _id: PostStatus;
  count: number;
}

export interface TopPost {
  _id: string;
  title: string;
  slug: string;
  views: number;
  commentCount: number;
  likeCount: number;
  authorName?: string;
  publishedAt?: string;
}

export interface CategoryBreakdown {
  name: string;
  colour: string;
  count: number;
  views: number;
}

export interface AuthorAnalytics {
  totals: { posts: number; published: number; views: number; likes: number; comments: number };
  byStatus: StatusCount[];
  topPosts: TopPost[];
  publishedOverTime: TimeSeriesPoint[];
  byCategory: CategoryBreakdown[];
}

export interface PipelineAuthorRow {
  _id: string;
  name: string;
  statuses: { status: PostStatus; count: number }[];
  total: number;
}

export interface SiteAnalytics {
  totals: { posts: number; published: number; pending: number; views: number; comments: number };
  byStatus: StatusCount[];
  pipelineByAuthor: PipelineAuthorRow[];
  topPosts: TopPost[];
  publishedOverTime: TimeSeriesPoint[];
  byCategory: CategoryBreakdown[];
  queues: { pendingComments: number; pendingRoleRequests: number };
}

export interface PlatformAnalytics {
  users: {
    byRole: { _id: UserRole; count: number }[];
    byStatus: { active: number; deactivated: number };
    signupsOverTime: TimeSeriesPoint[];
  };
  ads: {
    totals: { impressions: number; clicks: number };
    ctr: number;
    units: { name: string; placement: string; impressions: number; clicks: number; isActive: boolean }[];
  };
  newsletter: { total: number; overTime: TimeSeriesPoint[] };
}

export interface MyComment {
  _id: string;
  body: string;
  status: string;
  depth: number;
  createdAt: string;
  updatedAt?: string;
  author: Pick<User, 'name' | 'avatarUrl' | 'role'> & { _id: string };
  post: { _id: string; title: string; slug: string };
}
