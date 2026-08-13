import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, formatDate } from '../lib/api';
import PostCard from '../components/PostCard';
import Pagination from '../components/Pagination';
import AdSlot from '../components/AdSlot';
import type { Category, PageMeta, Post, SiteStats, Tag } from '../types';

const SORTS = [
  ['newest', 'Newest'],
  ['popular', 'Most read'],
  ['discussed', 'Most discussed']
] as const;

export default function Home() {
  const [params, setParams] = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [featured, setFeatured] = useState<Post | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get('search') ?? '');

  const page = Number(params.get('page') ?? 1);
  const category = params.get('category') ?? '';
  const tag = params.get('tag') ?? '';
  const sort = params.get('sort') ?? 'newest';

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') next.delete('page');
      setParams(next);
    },
    [params, setParams]
  );

  useEffect(() => {
    api.get<Category[]>('/categories').then((r) => setCategories(r.data ?? []));
    api.get<Tag[]>('/tags').then((r) => setTags((r.data ?? []).slice(0, 18)));
    api.get<SiteStats>('/posts/stats').then((r) => setStats(r.data ?? null));
    api
      .get<Post[]>('/posts?featured=true&limit=1')
      .then((r) => setFeatured(r.data?.[0] ?? null))
      .catch(() => setFeatured(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const query = new URLSearchParams({ page: String(page), limit: '8', sort });
    if (category) query.set('category', category);
    if (tag) query.set('tag', tag);
    const term = params.get('search');
    if (term) query.set('search', term);

    api
      .get<Post[]>(`/posts?${query.toString()}`)
      .then((res) => {
        if (cancelled) return;
        setPosts(res.data ?? []);
        setMeta((res.meta as PageMeta) ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, category, tag, sort, params]);

  const isFiltered = Boolean(category || tag || params.get('search'));

  return (
    <>
      <section className="hero shell">
        <div className="rail">
          <p className="eyebrow rail-node">Issue {new Date().getFullYear()} · Open archive</p>
          <h1 className="hero-title">Knowledge, distributed.</h1>
          <p className="lede">
            Plain writing on data, engineering, careers and learning — by people who had to work it
            out themselves. Read free, comment, and argue with us.
          </p>

          {stats && (
            <div className="hero-stats">
              <div>
                <div className="stat-value">{stats.published}</div>
                <div className="stat-label">Articles live</div>
              </div>
              <div>
                <div className="stat-value">{stats.categories}</div>
                <div className="stat-label">Sections</div>
              </div>
              <div>
                <div className="stat-value">{stats.tags}</div>
                <div className="stat-label">Topics</div>
              </div>
              <div>
                <div className="stat-value">{stats.views.toLocaleString('en-IN')}</div>
                <div className="stat-label">Reads to date</div>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="shell page">
        <div className="split">
          <main id="main">
            {featured && !isFiltered && (
              <article className="rail" style={{ marginBottom: 40 }}>
                <p className="eyebrow rail-node">Editor's pick</p>
                <h2 style={{ maxWidth: '20ch' }}>
                  <Link to={`/article/${featured.slug}`} style={{ textDecoration: 'none' }}>
                    {featured.title}
                  </Link>
                </h2>
                <p className="lede">{featured.excerpt}</p>
                <div className="card-footer meta">
                  <span>{featured.author?.name}</span>
                  <span>{formatDate(featured.publishedAt)}</span>
                  <span>{featured.readingMinutes} min read</span>
                </div>
              </article>
            )}

            <div className="rail">
              <div className="spread rail-node" style={{ marginBottom: 6 }}>
                <p className="eyebrow" style={{ margin: 0 }}>
                  {isFiltered ? 'Filtered' : 'Latest'}
                </p>
                <div className="chip-row">
                  {SORTS.map(([value, label]) => (
                    <button
                      key={value}
                      className={`chip${sort === value ? ' chip-active' : ''}`}
                      onClick={() => setParam('sort', value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {isFiltered && (
                <div className="row" style={{ marginBottom: 14 }}>
                  <span className="meta">
                    Showing{category && ` category "${category}"`}
                    {tag && ` tag "${tag}"`}
                    {params.get('search') && ` results for "${params.get('search')}"`}
                  </span>
                  <button
                    className="link-btn"
                    onClick={() => {
                      setSearch('');
                      setParams(new URLSearchParams());
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}

              {loading ? (
                <div style={{ paddingTop: 20 }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ marginBottom: 26 }}>
                      <div className="skeleton" style={{ width: '30%' }} />
                      <div className="skeleton" style={{ width: '80%', height: 22 }} />
                      <div className="skeleton" style={{ width: '95%' }} />
                    </div>
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <div className="empty">
                  Nothing matches that yet. Try clearing the filters, or search for something else.
                </div>
              ) : (
                <div className="feed">
                  {posts.map((post, i) => (
                    <PostCard key={post._id} post={post} index={(page - 1) * 8 + i + 1} />
                  ))}
                </div>
              )}

              {meta && <Pagination meta={meta} onChange={(p) => setParam('page', String(p))} />}
            </div>
          </main>

          <aside>
            <div className="sidebar-block">
              <div className="sidebar-title">Search</div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setParam('search', search.trim());
                }}
              >
                <input
                  className="input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find an article"
                  aria-label="Search articles"
                />
                <button className="btn btn-sm" style={{ marginTop: 10, width: '100%' }}>
                  Search
                </button>
              </form>
            </div>

            <div className="sidebar-block">
              <div className="sidebar-title">Sections</div>
              <div className="chip-row">
                {categories.map((c) => (
                  <button
                    key={c._id}
                    className={`chip${category === c.slug ? ' chip-active' : ''}`}
                    onClick={() => setParam('category', category === c.slug ? '' : c.slug)}
                  >
                    <span className="chip-dot" style={{ background: c.colour }} />
                    {c.name} · {c.postCount}
                  </button>
                ))}
              </div>
            </div>

            <AdSlot placement="sidebar" />

            <div className="sidebar-block">
              <div className="sidebar-title">Topics</div>
              <div className="chip-row">
                {tags.map((t) => (
                  <button
                    key={t._id}
                    className={`chip${tag === t.slug ? ' chip-active' : ''}`}
                    onClick={() => setParam('tag', tag === t.slug ? '' : t.slug)}
                  >
                    #{t.name}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
