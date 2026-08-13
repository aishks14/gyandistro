import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Post } from '../models/Post';
import { Comment } from '../models/Comment';
import { User } from '../models/User';
import { Ad } from '../models/Ad';
import { NewsletterSubscriber } from '../models/Newsletter';
import { RoleRequest } from '../models/RoleRequest';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Every number here is computed from what the database actually tracks.
 *
 * Worth being explicit about the ceiling: `Post.views` increments on every
 * page load, with no per-visitor deduplication — it is a hit counter, not a
 * unique-visitor count. There is currently no session or event-tracking
 * layer, so anything resembling "reach", "unique readers" or "traffic
 * source" genuinely isn't derivable from this schema yet. Everything below
 * is real; it just isn't everything a full analytics platform would show.
 */

const DAYS_30_MS = 30 * 24 * 60 * 60 * 1000;
const DAYS_90_MS = 90 * 24 * 60 * 60 * 1000;

function dateBucket(field: string) {
  return { $dateToString: { format: '%Y-%m-%d', date: `$${field}` } };
}

/** A post's own author, or anyone editor+, may see that author's numbers. */
export const authorAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const targetId = (req.query.userId as string) || req.user!.id;
  const isSelf = targetId === req.user!.id;
  const isPrivileged = req.user!.role === 'editor' || req.user!.role === 'admin';
  if (!isSelf && !isPrivileged) {
    return res.status(403).json({ success: false, message: 'You can only view your own analytics' });
  }

  const authorId = new Types.ObjectId(targetId);
  const since90 = new Date(Date.now() - DAYS_90_MS);

  const [facets] = await Post.aggregate([
    { $match: { author: authorId } },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              posts: { $sum: 1 },
              published: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
              views: { $sum: '$views' },
              likes: { $sum: { $size: '$likes' } },
              comments: { $sum: '$commentCount' }
            }
          }
        ],
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        topPosts: [
          { $match: { status: 'published' } },
          { $sort: { views: -1 } },
          { $limit: 6 },
          {
            $project: {
              title: 1,
              slug: 1,
              views: 1,
              commentCount: 1,
              publishedAt: 1,
              likeCount: { $size: '$likes' }
            }
          }
        ],
        publishedOverTime: [
          { $match: { status: 'published', publishedAt: { $gte: since90 } } },
          {
            $group: {
              _id: dateBucket('publishedAt'),
              posts: { $sum: 1 },
              views: { $sum: '$views' }
            }
          },
          { $sort: { _id: 1 } }
        ],
        byCategory: [
          { $match: { status: 'published' } },
          { $group: { _id: '$category', count: { $sum: 1 }, views: { $sum: '$views' } } },
          {
            $lookup: {
              from: 'categories',
              localField: '_id',
              foreignField: '_id',
              as: 'category'
            }
          },
          { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              name: { $ifNull: ['$category.name', 'Uncategorised'] },
              colour: { $ifNull: ['$category.colour', '#5B6079'] },
              count: 1,
              views: 1
            }
          },
          { $sort: { views: -1 } }
        ]
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      totals: facets.totals[0] ?? { posts: 0, published: 0, views: 0, likes: 0, comments: 0 },
      byStatus: facets.byStatus,
      topPosts: facets.topPosts,
      publishedOverTime: facets.publishedOverTime,
      byCategory: facets.byCategory
    }
  });
});

/** Editor+ only — the whole content pipeline, every author included. */
export const siteAnalytics = asyncHandler(async (_req: Request, res: Response) => {
  const since30 = new Date(Date.now() - DAYS_30_MS);

  const [facets] = await Post.aggregate([
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              posts: { $sum: 1 },
              published: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
              pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
              views: { $sum: '$views' },
              comments: { $sum: '$commentCount' }
            }
          }
        ],
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        // One stacked bar per author: how many posts they have in each status.
        pipelineByAuthor: [
          {
            $group: {
              _id: { author: '$author', status: '$status' },
              count: { $sum: 1 }
            }
          },
          {
            $group: {
              _id: '$_id.author',
              statuses: { $push: { status: '$_id.status', count: '$count' } },
              total: { $sum: '$count' }
            }
          },
          { $sort: { total: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'author'
            }
          },
          { $unwind: '$author' },
          { $project: { name: '$author.name', statuses: 1, total: 1 } }
        ],
        topPosts: [
          { $match: { status: 'published' } },
          { $sort: { views: -1 } },
          { $limit: 8 },
          {
            $lookup: { from: 'users', localField: 'author', foreignField: '_id', as: 'author' }
          },
          { $unwind: '$author' },
          {
            $project: {
              title: 1,
              slug: 1,
              views: 1,
              commentCount: 1,
              authorName: '$author.name',
              likeCount: { $size: '$likes' }
            }
          }
        ],
        publishedOverTime: [
          { $match: { status: 'published', publishedAt: { $gte: since30 } } },
          { $group: { _id: dateBucket('publishedAt'), posts: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ],
        byCategory: [
          {
            $group: { _id: '$category', count: { $sum: 1 }, views: { $sum: '$views' } }
          },
          {
            $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' }
          },
          { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              name: { $ifNull: ['$category.name', 'Uncategorised'] },
              colour: { $ifNull: ['$category.colour', '#5B6079'] },
              count: 1,
              views: 1
            }
          },
          { $sort: { count: -1 } }
        ]
      }
    }
  ]);

  const [pendingComments, pendingRoleRequests] = await Promise.all([
    Comment.countDocuments({ status: 'pending' }),
    RoleRequest.countDocuments({ status: 'pending' })
  ]);

  res.json({
    success: true,
    data: {
      totals: facets.totals[0] ?? { posts: 0, published: 0, pending: 0, views: 0, comments: 0 },
      byStatus: facets.byStatus,
      pipelineByAuthor: facets.pipelineByAuthor,
      topPosts: facets.topPosts,
      publishedOverTime: facets.publishedOverTime,
      byCategory: facets.byCategory,
      queues: { pendingComments, pendingRoleRequests }
    }
  });
});

/** Admin only — the business-operations layer above content: people, ads, list growth. */
export const platformAnalytics = asyncHandler(async (_req: Request, res: Response) => {
  const since90 = new Date(Date.now() - DAYS_90_MS);

  const [userFacets] = await User.aggregate([
    {
      $facet: {
        byRole: [{ $group: { _id: '$role', count: { $sum: 1 } } }],
        byStatus: [
          {
            $group: {
              _id: null,
              active: { $sum: { $cond: ['$isActive', 1, 0] } },
              deactivated: { $sum: { $cond: ['$isActive', 0, 1] } }
            }
          }
        ],
        signupsOverTime: [
          { $match: { createdAt: { $gte: since90 } } },
          { $group: { _id: dateBucket('createdAt'), count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ]
      }
    }
  ]);

  const ads = await Ad.find()
    .select('name placement impressions clicks isActive')
    .sort({ impressions: -1 })
    .lean();

  const adTotals = ads.reduce(
    (acc, ad) => {
      acc.impressions += ad.impressions;
      acc.clicks += ad.clicks;
      return acc;
    },
    { impressions: 0, clicks: 0 }
  );

  const [newsletterTotal, newsletterOverTime] = await Promise.all([
    NewsletterSubscriber.countDocuments(),
    NewsletterSubscriber.aggregate([
      { $match: { createdAt: { $gte: since90 } } },
      { $group: { _id: dateBucket('createdAt'), count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])
  ]);

  res.json({
    success: true,
    data: {
      users: {
        byRole: userFacets.byRole,
        byStatus: userFacets.byStatus[0] ?? { active: 0, deactivated: 0 },
        signupsOverTime: userFacets.signupsOverTime
      },
      ads: {
        totals: adTotals,
        ctr: adTotals.impressions
          ? Number(((adTotals.clicks / adTotals.impressions) * 100).toFixed(2))
          : 0,
        units: ads.map((ad) => ({
          name: ad.name,
          placement: ad.placement,
          impressions: ad.impressions,
          clicks: ad.clicks,
          isActive: ad.isActive
        }))
      },
      newsletter: {
        total: newsletterTotal,
        overTime: newsletterOverTime
      }
    }
  });
});
