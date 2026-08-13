import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { KpiCard, TrendChart, BarChart, StackedBarChart, DonutChart } from './charts';
import type {
  AuthorAnalytics,
  SiteAnalytics,
  PlatformAnalytics,
  PostStatus,
  TopPost
} from '../types';

const STATUS_COLOURS: Record<PostStatus, string> = {
  published: '#2F8F7F',
  pending: '#F0A92E',
  draft: '#5B6079',
  archived: '#C2225B'
};

const ROLE_COLOURS: Record<string, string> = {
  reader: '#5B6079',
  author: '#2F8F7F',
  editor: '#C2225B',
  admin: '#F0A92E'
};

/**
 * One dashboard, three depths. `tier` controls what's fetched and shown:
 *
 *   'author'   — a writer's own content only. Shown to authors.
 *   'site'     — the whole content pipeline, every author included.
 *                Shown to editors and admins, alongside their own author view.
 *   'platform' — users, ads, newsletter growth. Admin only.
 *
 * Every number here comes from a real MongoDB aggregation over what the
 * schema actually stores. There is no unique-visitor tracking or traffic
 * source data yet — `views` is a raw hit counter, not deduplicated by
 * visitor — so this shows real content and platform health, not the full
 * depth of something like Instagram Insights. That would need an event
 * tracking layer this app doesn't have yet.
 */
export default function Analytics({ tier }: { tier: 'author' | 'site' | 'platform' }) {
  const { can } = useAuth();

  return (
    <div className="stack" style={{ gap: 36 }}>
      {tier === 'author' && <AuthorView />}
      {tier === 'site' && (
        <>
          <SiteView />
          {can('author') && (
            <>
              <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '8px 0' }} />
              <p className="eyebrow" style={{ margin: 0 }}>Your own articles</p>
              <AuthorView />
            </>
          )}
        </>
      )}
      {tier === 'platform' && <PlatformView />}
    </div>
  );
}

/* ------------------------------------------------------------------ author */

function AuthorView() {
  const [data, setData] = useState<AuthorAnalytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<AuthorAnalytics>('/analytics/author')
      .then((r) => setData(r.data ?? null))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load analytics'));
  }, []);

  if (error) return <div className="notice notice-error">{error}</div>;
  if (!data) return <AnalyticsSkeleton />;

  const { totals } = data;

  return (
    <div>
      <div className="kpi-row">
        <KpiCard label="Total views" value={totals.views} />
        <KpiCard label="Total likes" value={totals.likes} />
        <KpiCard label="Comments" value={totals.comments} />
        <KpiCard label="Published" value={totals.published} hint={`of ${totals.posts} total`} />
      </div>

      <div className="analytics-grid">
        <div className="analytics-panel">
          <p className="analytics-panel-title">Views — published articles, last 90 days</p>
          <TrendChart
            data={data.publishedOverTime.map((p) => ({ label: p._id, value: p.views ?? 0 }))}
            color="#F0A92E"
          />
        </div>

        <div className="analytics-panel">
          <p className="analytics-panel-title">By status</p>
          <DonutChart
            data={data.byStatus.map((s) => ({
              label: s._id,
              value: s.count,
              color: STATUS_COLOURS[s._id] ?? '#5B6079'
            }))}
          />
        </div>

        {data.byCategory.length > 0 && (
          <div className="analytics-panel">
            <p className="analytics-panel-title">Views by section</p>
            <BarChart
              data={data.byCategory.map((c) => ({ label: c.name, value: c.views, color: c.colour }))}
            />
          </div>
        )}

        <div className="analytics-panel">
          <p className="analytics-panel-title">Your best performing articles</p>
          <TopPostsList posts={data.topPosts} />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- site */

function SiteView() {
  const [data, setData] = useState<SiteAnalytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<SiteAnalytics>('/analytics/site')
      .then((r) => setData(r.data ?? null))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load analytics'));
  }, []);

  if (error) return <div className="notice notice-error">{error}</div>;
  if (!data) return <AnalyticsSkeleton />;

  const { totals, queues } = data;

  return (
    <div>
      <p className="eyebrow" style={{ margin: '0 0 6px' }}>Whole site</p>
      <div className="kpi-row">
        <KpiCard label="Total views" value={totals.views} />
        <KpiCard label="Published" value={totals.published} accent="#2F8F7F" />
        <KpiCard
          label="Awaiting review"
          value={totals.pending}
          accent={totals.pending > 0 ? '#F0A92E' : undefined}
          hint={totals.pending > 0 ? 'in the review queue' : undefined}
        />
        <KpiCard label="Comments" value={totals.comments} />
      </div>

      {(queues.pendingComments > 0 || queues.pendingRoleRequests > 0) && (
        <div className="notice notice-warn" style={{ marginBottom: 24 }}>
          {queues.pendingComments > 0 && (
            <span>{queues.pendingComments} comment(s) awaiting moderation. </span>
          )}
          {queues.pendingRoleRequests > 0 && (
            <span>{queues.pendingRoleRequests} access request(s) waiting on a decision. </span>
          )}
          <Link to="/admin">Open the review queue →</Link>
        </div>
      )}

      <div className="analytics-grid">
        <div className="analytics-panel">
          <p className="analytics-panel-title">Articles published — last 30 days</p>
          <TrendChart
            data={data.publishedOverTime.map((p) => ({ label: p._id, value: p.posts ?? 0 }))}
            color="#2F8F7F"
          />
        </div>

        <div className="analytics-panel">
          <p className="analytics-panel-title">Content pipeline by author</p>
          <StackedBarChart
            data={data.pipelineByAuthor.map((row) => ({
              label: row.name,
              segments: row.statuses.map((s) => ({
                name: s.status,
                value: s.count,
                color: STATUS_COLOURS[s.status] ?? '#5B6079'
              }))
            }))}
          />
        </div>

        {data.byCategory.length > 0 && (
          <div className="analytics-panel">
            <p className="analytics-panel-title">Articles by section</p>
            <BarChart data={data.byCategory.map((c) => ({ label: c.name, value: c.count, color: c.colour }))} />
          </div>
        )}

        <div className="analytics-panel">
          <p className="analytics-panel-title">Top performing articles, site-wide</p>
          <TopPostsList posts={data.topPosts} showAuthor />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- platform */

function PlatformView() {
  const [data, setData] = useState<PlatformAnalytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<PlatformAnalytics>('/analytics/platform')
      .then((r) => setData(r.data ?? null))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load analytics'));
  }, []);

  if (error) return <div className="notice notice-error">{error}</div>;
  if (!data) return <AnalyticsSkeleton />;

  const totalUsers = data.users.byStatus.active + data.users.byStatus.deactivated;

  return (
    <div>
      <div className="kpi-row">
        <KpiCard label="Total users" value={totalUsers} hint={`${data.users.byStatus.deactivated} deactivated`} />
        <KpiCard label="Ad impressions" value={data.ads.totals.impressions} />
        <KpiCard label="Ad clicks" value={data.ads.totals.clicks} hint={`${data.ads.ctr}% CTR`} />
        <KpiCard label="Newsletter subscribers" value={data.newsletter.total} />
      </div>

      <div className="analytics-grid">
        <div className="analytics-panel">
          <p className="analytics-panel-title">New signups — last 90 days</p>
          <TrendChart
            data={data.users.signupsOverTime.map((p) => ({ label: p._id, value: p.count ?? 0 }))}
            color="#4A5AC8"
          />
        </div>

        <div className="analytics-panel">
          <p className="analytics-panel-title">Users by role</p>
          <DonutChart
            data={data.users.byRole.map((r) => ({
              label: r._id,
              value: r.count,
              color: ROLE_COLOURS[r._id] ?? '#5B6079'
            }))}
          />
        </div>

        <div className="analytics-panel">
          <p className="analytics-panel-title">Newsletter growth — last 90 days</p>
          <TrendChart
            data={data.newsletter.overTime.map((p) => ({ label: p._id, value: p.count ?? 0 }))}
            color="#C2225B"
          />
        </div>

        <div className="analytics-panel">
          <p className="analytics-panel-title">Ad units by impressions</p>
          {data.ads.units.length === 0 ? (
            <div className="chart-empty">No ad units yet.</div>
          ) : (
            <BarChart
              data={data.ads.units.slice(0, 6).map((u) => ({ label: u.name, value: u.impressions }))}
              defaultColor="#F0A92E"
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ shared */

function TopPostsList({ posts, showAuthor }: { posts: TopPost[]; showAuthor?: boolean }) {
  if (posts.length === 0) return <div className="chart-empty">Nothing published yet.</div>;

  return (
    <ul className="rank-list">
      {posts.map((p, i) => (
        <li key={p._id ?? p.slug}>
          <span className="rank-index">{String(i + 1).padStart(2, '0')}</span>
          <Link to={`/article/${p.slug}`} className="rank-title">
            {p.title}
          </Link>
          <span className="rank-meta">
            {showAuthor && p.authorName ? `${p.authorName} · ` : ''}
            {p.views.toLocaleString('en-IN')} views
          </span>
        </li>
      ))}
    </ul>
  );
}

function AnalyticsSkeleton() {
  return (
    <div>
      <div className="kpi-row">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 76 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 200, marginTop: 20 }} />
    </div>
  );
}
