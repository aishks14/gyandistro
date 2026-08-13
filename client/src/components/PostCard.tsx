import { Link } from 'react-router-dom';
import { formatDate } from '../lib/api';
import type { Post } from '../types';

export default function PostCard({ post, index }: { post: Post; index: number }) {
  return (
    <Link to={`/article/${post.slug}`} className="card">
      <div className="card-index">{String(index).padStart(2, '0')}</div>
      <div>
        {post.coverImageUrl && (
          <img className="card-cover" src={post.coverImageUrl} alt="" loading="lazy" />
        )}
        <div className="chip-row">
          {post.category && (
            <span className="chip">
              <span className="chip-dot" style={{ background: post.category.colour }} />
              {post.category.name}
            </span>
          )}
          {post.isSponsored && <span className="chip chip-flag">Sponsored</span>}
          {post.status !== 'published' && <span className="chip chip-flag">{post.status}</span>}
        </div>

        <h3 className="card-title">{post.title}</h3>
        <p className="card-excerpt">{post.excerpt}</p>

        <div className="card-footer meta">
          <span>{post.author?.name ?? 'Staff'}</span>
          <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
          <span>{post.readingMinutes} min read</span>
          <span>{post.views} views</span>
          {post.commentCount > 0 && <span>{post.commentCount} comments</span>}
        </div>
      </div>
    </Link>
  );
}
