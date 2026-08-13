import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, formatDate, roleRank } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import CommentThread from '../components/CommentThread';
import AdSlot from '../components/AdSlot';
import Avatar from '../components/Avatar';
import SocialLinks from '../components/SocialLinks';
import type { CommentNode, Post } from '../types';

export default function Article() {
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const loadComments = useCallback(() => {
    api
      .get<CommentNode[]>(`/posts/${slug}/comments`)
      .then((res) => setComments(res.data ?? []))
      .catch(() => setComments([]));
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    api
      .get<Post>(`/posts/${slug}`)
      .then((res) => {
        if (cancelled || !res.data) return;
        setPost(res.data);
        setLikeCount(res.data.likes?.length ?? 0);
        setLiked(Boolean(user && res.data.likes?.includes(user.id)));
        document.title = `${res.data.title} — GyanDistro`;
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the article');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    loadComments();
    return () => {
      cancelled = true;
    };
  }, [slug, user, loadComments]);

  const toggleLike = async () => {
    if (!user) return navigate('/login');
    const res = await api.post<{ liked: boolean; likeCount: number }>(`/posts/${post!._id}/like`);
    setLiked(res.data!.liked);
    setLikeCount(res.data!.likeCount);
  };

  const removePost = async () => {
    if (!window.confirm('Delete this article permanently?')) return;
    await api.delete(`/posts/${post!._id}`);
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="shell page">
        <div className="skeleton" style={{ width: '30%' }} />
        <div className="skeleton" style={{ width: '75%', height: 40 }} />
        <div className="skeleton" style={{ width: '90%' }} />
        <div className="skeleton" style={{ width: '85%' }} />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="shell page rail">
        <p className="eyebrow rail-node">Not found</p>
        <h1>That article is not here</h1>
        <p className="lede">{error || 'It may have been moved or unpublished.'}</p>
        <Link className="btn" to="/">
          Back to the home page
        </Link>
      </div>
    );
  }

  const canEdit =
    user && (user.id === (post.author as { _id?: string })?._id || roleRank(user.role) >= roleRank('editor'));

  // Split the body so an in-article unit lands after the second block.
  const blocks = (post.content ?? '').split('</p>');
  const breakAt = Math.min(3, blocks.length - 1);
  const firstHalf = blocks.slice(0, breakAt).join('</p>') + (breakAt > 0 ? '</p>' : '');
  const secondHalf = blocks.slice(breakAt).join('</p>');

  return (
    <div className="shell page">
      <div className="split">
        <main id="main">
          <article className="article rail">
            <header className="article-head">
              <div className="chip-row rail-node" style={{ marginBottom: 14 }}>
                {post.category && (
                  <Link className="chip" to={`/?category=${post.category.slug}`}>
                    <span className="chip-dot" style={{ background: post.category.colour }} />
                    {post.category.name}
                  </Link>
                )}
                {post.isSponsored && (
                  <span className="chip chip-flag">
                    Sponsored{post.sponsorName ? ` by ${post.sponsorName}` : ''}
                  </span>
                )}
                {post.status !== 'published' && <span className="chip chip-flag">{post.status}</span>}
              </div>

              <h1>{post.title}</h1>
              <p className="lede">{post.excerpt}</p>

              <div className="byline">
                <Avatar name={post.author?.name ?? '?'} url={post.author?.avatarUrl} />
                <div>
                  <Link
                    to={`/author/${(post.author as { _id?: string })?._id}`}
                    style={{ fontFamily: 'var(--display)', fontWeight: 600 }}
                  >
                    {post.author?.name}
                  </Link>
                  <div className="meta">
                    {formatDate(post.publishedAt ?? post.createdAt)} · {post.readingMinutes} min read ·{' '}
                    {post.views} views
                  </div>
                </div>
              </div>

              {canEdit && (
                <div className="row" style={{ marginTop: 18 }}>
                  <Link className="btn btn-ghost btn-sm" to={`/write/${post._id}`}>
                    Edit article
                  </Link>
                  <button className="btn btn-danger btn-sm" onClick={removePost}>
                    Delete
                  </button>
                </div>
              )}
            </header>

            {post.aiSummary && (
              <div className="notice notice-ok">
                <strong>In short:</strong> {post.aiSummary}
              </div>
            )}

            <div className="prose" dangerouslySetInnerHTML={{ __html: firstHalf }} />
            <AdSlot placement="in-article" />
            <div className="prose" dangerouslySetInnerHTML={{ __html: secondHalf }} />

            {post.hasAffiliateLinks && (
              <p className="disclosure">
                Some links in this article are affiliate links. If you buy through one, GyanDistro
                earns a commission at no extra cost to you. It does not change what we recommend.
              </p>
            )}

            <div className="row" style={{ marginTop: 28 }}>
              <button className={`btn btn-sm${liked ? '' : ' btn-ghost'}`} onClick={toggleLike}>
                {liked ? 'Liked' : 'Like'} · {likeCount}
              </button>
              {post.tags?.map((t) => (
                <Link key={t._id} className="chip" to={`/?tag=${t.slug}`}>
                  #{t.name}
                </Link>
              ))}
            </div>

            <AdSlot placement="below-post" />

            {post.author?.bio && (
              <section className="panel" style={{ marginTop: 34 }}>
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  <Avatar name={post.author.name} url={post.author.avatarUrl} />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <h3 style={{ marginBottom: 6 }}>{post.author.name}</h3>
                    <p style={{ marginBottom: 12 }}>{post.author.bio}</p>
                    <SocialLinks links={post.author.social} className="chip-row" />
                  </div>
                </div>
              </section>
            )}

            <CommentThread
              slug={post.slug}
              comments={comments}
              allowComments={post.allowComments}
              onReload={loadComments}
            />
          </article>
        </main>

        <aside>
          <div className="sidebar-block">
            <div className="sidebar-title">In this article</div>
            <p className="meta">
              {post.readingMinutes} minute read · published {formatDate(post.publishedAt)}
            </p>
          </div>
          <AdSlot placement="sidebar" />
        </aside>
      </div>
    </div>
  );
}