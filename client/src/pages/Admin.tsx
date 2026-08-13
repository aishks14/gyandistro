import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, formatDate } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Analytics from '../components/Analytics';
import type { Ad, AdPlacement, Category, Post, RoleRequest, User, UserRole } from '../types';

const TABS = [
  ['analytics', 'Analytics'],
  ['review', 'Review queue'],
  ['access', 'Access requests'],
  ['users', 'Users'],
  ['sections', 'Sections'],
  ['ads', 'Advertising']
] as const;

type Tab = (typeof TABS)[number][0];

export default function Admin() {
  const [tab, setTab] = useState<Tab>('analytics');

  return (
    <div className="shell page rail">
      <p className="eyebrow rail-node">Administration</p>
      <h1 style={{ fontSize: '2.6rem' }}>Run the site</h1>

      <div className="tabs">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            className={`tab${tab === value ? ' is-active' : ''}`}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'analytics' && <Analytics tier="platform" />}
      {tab === 'review' && <ReviewQueue />}
      {tab === 'access' && <AccessQueue />}
      {tab === 'users' && <Users />}
      {tab === 'sections' && <Sections />}
      {tab === 'ads' && <Ads />}
    </div>
  );
}

/* ---------------------------------------------------------------- review */

function ReviewQueue() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [message, setMessage] = useState('');

  const load = () => {
    api.get<Post[]>('/posts?status=pending&limit=50').then((r) => setPosts(r.data ?? []));
    api.get<any[]>('/comments/pending').then((r) => setComments(r.data ?? []));
  };

  useEffect(load, []);

  const publish = async (post: Post) => {
    await api.put(`/posts/${post._id}`, { status: 'published' });
    setMessage(`Published "${post.title}".`);
    load();
  };

  const sendBack = async (post: Post) => {
    await api.put(`/posts/${post._id}`, { status: 'draft' });
    setMessage(`Sent "${post.title}" back to the author.`);
    load();
  };

  const decideComment = async (id: string, status: 'visible' | 'rejected') => {
    await api.patch(`/comments/${id}/status`, { status });
    load();
  };

  return (
    <section>
      {message && <div className="notice notice-ok">{message}</div>}

      <h2>Articles waiting for review</h2>
      {posts.length === 0 ? (
        <div className="empty">Nothing waiting. The queue is clear.</div>
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Submitted</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post._id}>
                  <td>
                    <Link to={`/article/${post.slug}`}>{post.title}</Link>
                  </td>
                  <td className="meta">{post.author?.name}</td>
                  <td className="meta">{formatDate(post.createdAt)}</td>
                  <td>
                    <div className="row">
                      <button className="btn btn-sm" onClick={() => publish(post)}>
                        Publish
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => sendBack(post)}>
                        Send back
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ marginTop: 44 }}>Comments held for moderation</h2>
      {comments.length === 0 ? (
        <div className="empty">Nothing held.</div>
      ) : (
        comments.map((c) => (
          <div key={c._id} className="panel" style={{ marginBottom: 14 }}>
            <p className="meta">
              {c.author?.name} on {c.post?.title} · flagged: {c.moderationNote ?? 'no reason given'}
            </p>
            <p>{c.body}</p>
            <div className="row">
              <button className="btn btn-sm" onClick={() => decideComment(c._id, 'visible')}>
                Approve
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => decideComment(c._id, 'rejected')}>
                Reject
              </button>
            </div>
          </div>
        ))
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ access */

function AccessQueue() {
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [message, setMessage] = useState('');
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [denyNote, setDenyNote] = useState('');

  const load = () => {
    api.get<RoleRequest[]>('/role-requests?status=pending').then((r) => setRequests(r.data ?? []));
  };

  useEffect(load, []);

  const decide = async (id: string, decision: 'approved' | 'denied', note?: string) => {
    const target = requests.find((r) => r._id === id);
    await api.patch(`/role-requests/${id}/decision`, { decision, note });
    setMessage(
      decision === 'approved'
        ? `Approved. ${target?.user.name} is now ${target?.requestedRole}.`
        : `Denied ${target?.user.name}'s request.`
    );
    setDenyingId(null);
    setDenyNote('');
    load();
  };

  return (
    <section>
      {message && <div className="notice notice-ok">{message}</div>}

      {requests.length === 0 ? (
        <div className="empty">No pending access requests.</div>
      ) : (
        requests.map((r) => (
          <div key={r._id} className="panel" style={{ marginBottom: 14 }}>
            <div className="spread">
              <div>
                <p className="meta" style={{ margin: 0 }}>
                  {r.user.name} · {r.user.email}
                </p>
                <h3 style={{ margin: '4px 0' }}>
                  {r.currentRoleAtRequest} → {r.requestedRole}
                </h3>
                <p className="meta">Requested {formatDate(r.createdAt)}</p>
              </div>
            </div>

            {r.message && <p style={{ marginTop: 8 }}>"{r.message}"</p>}

            {denyingId === r._id ? (
              <div style={{ marginTop: 12 }}>
                <label className="field">
                  <span className="field-label">Reason (optional, shown to the requester)</span>
                  <textarea
                    className="textarea"
                    style={{ minHeight: 70 }}
                    value={denyNote}
                    onChange={(e) => setDenyNote(e.target.value)}
                  />
                </label>
                <div className="row">
                  <button className="btn btn-danger btn-sm" onClick={() => decide(r._id, 'denied', denyNote || undefined)}>
                    Confirm deny
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setDenyingId(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn btn-sm" onClick={() => decide(r._id, 'approved')}>
                  Approve → {r.requestedRole}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setDenyingId(r._id)}>
                  Deny
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </section>
  );
}

/* ----------------------------------------------------------------- users */

function Users() {
  const { user } = useAuth();
  const [rows, setRows] = useState<User[]>([]);
  const [search, setSearch] = useState('');

  const load = () => {
    api
      .get<User[]>(`/users?limit=50${search ? `&search=${encodeURIComponent(search)}` : ''}`)
      .then((r) => setRows(r.data ?? []));
  };

  useEffect(load, []);

  const setRole = async (id: string, role: UserRole) => {
    await api.patch(`/users/${id}/role`, { role });
    load();
  };

  const setActive = async (id: string, isActive: boolean) => {
    await api.patch(`/users/${id}/active`, { isActive });
    load();
  };

  return (
    <section>
      <form
        className="row"
        style={{ marginBottom: 18 }}
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <input
          className="input"
          style={{ maxWidth: 300 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email"
        />
        <button className="btn btn-sm">Search</button>
      </form>

      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const id = row._id ?? row.id;
              const isSelf = id === user?.id;
              return (
                <tr key={id}>
                  <td>{row.name}</td>
                  <td className="meta">{row.email}</td>
                  <td>
                    <select
                      className="select"
                      value={row.role}
                      disabled={isSelf}
                      onChange={(e) => setRole(id!, e.target.value as UserRole)}
                    >
                      <option value="reader">reader</option>
                      <option value="author">author</option>
                      <option value="editor">editor</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="meta">{row.isActive === false ? 'deactivated' : 'active'}</td>
                  <td>
                    {!isSelf && (
                      <button
                        className={`btn btn-sm${row.isActive === false ? '' : ' btn-danger'}`}
                        onClick={() => setActive(id!, row.isActive === false)}
                      >
                        {row.isActive === false ? 'Reactivate' : 'Deactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- sections */

function Sections() {
  const [rows, setRows] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [colour, setColour] = useState('#F0A92E');
  const [error, setError] = useState('');

  const load = () => {
    void api.get<Category[]>('/categories').then((r) => setRows(r.data ?? []));
  };
  useEffect(load, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await api.post('/categories', { name, description, colour });
      setName('');
      setDescription('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the section');
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/categories/${id}`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the section');
    }
  };

  return (
    <section className="split">
      <div>
        {error && <div className="notice notice-error">{error}</div>}
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Section</th>
                <th>Articles</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id}>
                  <td>
                    <span className="chip">
                      <span className="chip-dot" style={{ background: row.colour }} />
                      {row.name}
                    </span>
                    {row.description && <div className="meta">{row.description}</div>}
                  </td>
                  <td className="meta">{row.postCount}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(row._id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <aside>
        <div className="sidebar-title">Add a section</div>
        <form onSubmit={create}>
          <label className="field">
            <span className="field-label">Name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="field">
            <span className="field-label">Description</span>
            <textarea
              className="textarea"
              style={{ minHeight: 80 }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">Dot colour</span>
            <input
              className="input"
              type="color"
              value={colour}
              onChange={(e) => setColour(e.target.value)}
            />
          </label>
          <button className="btn btn-sm">Create section</button>
        </form>
      </aside>
    </section>
  );
}

/* ------------------------------------------------------------------- ads */

const PLACEMENTS: AdPlacement[] = ['header', 'sidebar', 'in-article', 'below-post', 'footer'];

function Ads() {
  const [rows, setRows] = useState<Ad[]>([]);
  const [name, setName] = useState('');
  const [placement, setPlacement] = useState<AdPlacement>('sidebar');
  const [kind, setKind] = useState<'image' | 'html'>('image');
  const [imageUrl, setImageUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [html, setHtml] = useState('');
  const [weight, setWeight] = useState(1);
  const [error, setError] = useState('');

  const load = () => {
    void api.get<Ad[]>('/ads').then((r) => setRows(r.data ?? []));
  };
  useEffect(load, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await api.post('/ads', {
        name,
        placement,
        kind,
        weight,
        isActive: true,
        ...(kind === 'image' ? { imageUrl, targetUrl } : { html })
      });
      setName('');
      setImageUrl('');
      setTargetUrl('');
      setHtml('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the ad unit');
    }
  };

  const toggle = async (ad: Ad) => {
    await api.put(`/ads/${ad._id}`, { isActive: !ad.isActive });
    load();
  };

  const remove = async (id: string) => {
    await api.delete(`/ads/${id}`);
    load();
  };

  return (
    <section className="split">
      <div>
        {error && <div className="notice notice-error">{error}</div>}
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Slot</th>
                <th>Impr.</th>
                <th>Clicks</th>
                <th>CTR</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((ad) => (
                <tr key={ad._id}>
                  <td>
                    {ad.name}
                    <div className="meta">weight {ad.weight} · {ad.kind}</div>
                  </td>
                  <td className="meta">{ad.placement}</td>
                  <td className="meta">{ad.impressions}</td>
                  <td className="meta">{ad.clicks}</td>
                  <td className="meta">{ad.ctr ?? 0}%</td>
                  <td>
                    <div className="row">
                      <button className="btn btn-ghost btn-sm" onClick={() => toggle(ad)}>
                        {ad.isActive ? 'Pause' : 'Resume'}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(ad._id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <div className="empty">No ad units yet.</div>}
      </div>

      <aside>
        <div className="sidebar-title">Add an ad unit</div>
        <form onSubmit={create}>
          <label className="field">
            <span className="field-label">Internal name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>

          <label className="field">
            <span className="field-label">Slot</span>
            <select
              className="select"
              value={placement}
              onChange={(e) => setPlacement(e.target.value as AdPlacement)}
            >
              {PLACEMENTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Type</span>
            <select
              className="select"
              value={kind}
              onChange={(e) => setKind(e.target.value as 'image' | 'html')}
            >
              <option value="image">Image creative</option>
              <option value="html">Network code (AdSense, Ezoic...)</option>
            </select>
          </label>

          {kind === 'image' ? (
            <>
              <label className="field">
                <span className="field-label">Image URL</span>
                <input
                  className="input"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">Click-through URL</span>
                <input
                  className="input"
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                />
              </label>
            </>
          ) : (
            <label className="field">
              <span className="field-label">Ad code</span>
              <textarea
                className="textarea"
                style={{ minHeight: 130, fontFamily: 'var(--mono)', fontSize: 13 }}
                value={html}
                onChange={(e) => setHtml(e.target.value)}
              />
              <span className="field-hint">
                Only administrators can add code here, and it is rendered as-is.
              </span>
            </label>
          )}

          <label className="field">
            <span className="field-label">Rotation weight</span>
            <input
              className="input"
              type="number"
              min={1}
              max={100}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
            />
            <span className="field-hint">Weight 3 shows three times as often as weight 1.</span>
          </label>

          <button className="btn btn-sm">Create unit</button>
        </form>
      </aside>
    </section>
  );
}
