import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, formatDate } from '../lib/api';
import Avatar from '../components/Avatar';
import SocialLinks from '../components/SocialLinks';
import AdSlot from '../components/AdSlot';
import type { Post, User } from '../types';

export default function Author() {
  const { id = '' } = useParams();
  const [author, setAuthor] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<{ author: User; posts: Post[] }>(`/users/${id}`)
      .then((res) => {
        setAuthor(res.data!.author);
        setPosts(res.data!.posts);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load that author'));
  }, [id]);

  if (error) {
    return (
      <div className="shell page rail">
        <p className="eyebrow rail-node">Author</p>
        <h1>No such author</h1>
        <p className="lede">{error}</p>
      </div>
    );
  }

  if (!author) {
    return (
      <div className="shell page">
        <div className="skeleton" style={{ width: '35%' }} />
        <div className="skeleton" style={{ width: '60%' }} />
      </div>
    );
  }

  return (
    <div className="shell page">
      <div className="split">
        <main id="main" className="rail">
          <p className="eyebrow rail-node">Author</p>
          <div className="row" style={{ alignItems: 'flex-start', marginBottom: 18 }}>
            <Avatar name={author.name} url={author.avatarUrl} />
            <div>
              <h1 style={{ fontSize: '2.4rem', marginBottom: 4 }}>{author.name}</h1>
              <p className="meta">{author.role} · joined {formatDate(author.createdAt)}</p>
            </div>
          </div>

          {author.bio && <p className="lede">{author.bio}</p>}
          <SocialLinks links={author.social} className="chip-row" />

          <h2 style={{ marginTop: 40 }}>Articles</h2>
          {posts.length === 0 ? (
            <div className="empty">Nothing published yet.</div>
          ) : (
            <div className="feed">
              {posts.map((post, i) => (
                <Link key={post._id} className="card" to={`/article/${post.slug}`}>
                  <div className="card-index">{String(i + 1).padStart(2, '0')}</div>
                  <div>
                    <h3 className="card-title">{post.title}</h3>
                    <p className="card-excerpt">{post.excerpt}</p>
                    <div className="card-footer meta">
                      <span>{formatDate(post.publishedAt)}</span>
                      <span>{post.readingMinutes} min read</span>
                      <span>{post.views} views</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>

        <aside>
          <AdSlot placement="sidebar" />
        </aside>
      </div>
    </div>
  );
}
