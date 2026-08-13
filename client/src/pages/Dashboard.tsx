import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, formatDate } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import SocialLinks from '../components/SocialLinks';
import Analytics from '../components/Analytics';
import Avatar from '../components/Avatar';
import type { MyComment, Post, RoleRequest, SocialLinks as Links, UserRole } from '../types';

const STATUSES = ['published', 'draft', 'pending', 'archived'] as const;

export default function Dashboard() {
  const { user, can, refreshUser } = useAuth();
  const [tab, setTab] = useState<'posts' | 'analytics' | 'comments' | 'profile' | 'security' | 'access'>(
    can('author') ? 'posts' : 'profile'
  );

  return (
    <div className="shell page rail">
      <p className="eyebrow rail-node">Dashboard</p>
      <h1 style={{ fontSize: '2.6rem' }}>Hello, {user?.name.split(' ')[0]}</h1>
      <p className="muted" style={{ marginBottom: 30 }}>
        Signed in as {user?.email} · role: {user?.role}
      </p>

      <div className="tabs">
        {can('author') && (
          <button className={`tab${tab === 'posts' ? ' is-active' : ''}`} onClick={() => setTab('posts')}>
            My articles
          </button>
        )}
        {can('author') && (
          <button className={`tab${tab === 'analytics' ? ' is-active' : ''}`} onClick={() => setTab('analytics')}>
            Analytics
          </button>
        )}
        {can('author') && (
          <button className={`tab${tab === 'comments' ? ' is-active' : ''}`} onClick={() => setTab('comments')}>
            Comments
          </button>
        )}
        <button className={`tab${tab === 'profile' ? ' is-active' : ''}`} onClick={() => setTab('profile')}>
          Profile
        </button>
        <button className={`tab${tab === 'security' ? ' is-active' : ''}`} onClick={() => setTab('security')}>
          Security
        </button>
        <button className={`tab${tab === 'access' ? ' is-active' : ''}`} onClick={() => setTab('access')}>
          Access
        </button>
      </div>

      {tab === 'posts' && can('author') && <MyPosts />}
      {tab === 'analytics' && can('author') && <Analytics tier={can('editor') ? 'site' : 'author'} />}
      {tab === 'comments' && can('author') && <MyComments />}
      {tab === 'profile' && <ProfileForm onSaved={refreshUser} />}
      {tab === 'security' && <SecurityForm />}
      {tab === 'access' && <AccessRequests />}
    </div>
  );
}

function MyPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('published');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get<Post[]>(`/posts?status=${status}&author=${user?.id}&limit=50`)
      .then((r) => setPosts(r.data ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status, user?.id]);

  const remove = async (id: string) => {
    if (!window.confirm('Delete this article permanently?')) return;
    await api.delete(`/posts/${id}`);
    load();
  };

  return (
    <section>
      <div className="spread" style={{ marginBottom: 18 }}>
        <div className="chip-row">
          {STATUSES.map((s) => (
            <button
              key={s}
              className={`chip${status === s ? ' chip-active' : ''}`}
              onClick={() => setStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <Link className="btn btn-accent btn-sm" to="/write">
          New article
        </Link>
      </div>

      {loading ? (
        <div className="skeleton" style={{ width: '60%' }} />
      ) : posts.length === 0 ? (
        <div className="empty">
          Nothing here yet. <Link to="/write">Start an article</Link>.
        </div>
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Updated</th>
                <th>Views</th>
                <th>Comments</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post._id}>
                  <td>
                    <Link to={`/article/${post.slug}`}>{post.title}</Link>
                  </td>
                  <td className="meta">{formatDate(post.publishedAt ?? post.createdAt)}</td>
                  <td className="meta">{post.views}</td>
                  <td className="meta">{post.commentCount}</td>
                  <td>
                    <div className="row">
                      <Link className="btn btn-ghost btn-sm" to={`/write/${post._id}`}>
                        Edit
                      </Link>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(post._id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ProfileForm({ onSaved }: { onSaved: () => Promise<void> }) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [social, setSocial] = useState<Links>(user?.social ?? {});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api.put('/users/me', { name, bio, avatarUrl, social });
      await onSaved();
      setMessage('Profile saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the profile');
    } finally {
      setBusy(false);
    }
  };

  const fields: Array<[keyof Links, string]> = [
    ['website', 'Website'],
    ['twitter', 'X / Twitter'],
    ['linkedin', 'LinkedIn'],
    ['github', 'GitHub'],
    ['instagram', 'Instagram'],
    ['youtube', 'YouTube']
  ];

  return (
    <form onSubmit={submit} style={{ maxWidth: 620 }}>
      {message && <div className="notice notice-ok">{message}</div>}
      {error && <div className="notice notice-error">{error}</div>}

      <label className="field">
        <span className="field-label">Display name</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>

      <label className="field">
        <span className="field-label">Short bio</span>
        <textarea
          className="textarea"
          style={{ minHeight: 100 }}
          maxLength={500}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="One or two sentences that appear under your articles."
        />
      </label>

      <label className="field">
        <span className="field-label">Avatar image URL</span>
        <input
          className="input"
          type="url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://..."
        />
      </label>

      <div className="sidebar-title" style={{ marginTop: 26 }}>
        Social links
      </div>
      {fields.map(([key, label]) => (
        <label className="field" key={key}>
          <span className="field-label">{label}</span>
          <input
            className="input"
            type="url"
            value={social[key] ?? ''}
            onChange={(e) => setSocial({ ...social, [key]: e.target.value })}
            placeholder="https://..."
          />
        </label>
      ))}

      <SocialLinks links={social} className="chip-row" />

      <button className="btn" style={{ marginTop: 20 }} disabled={busy}>
        {busy ? 'Saving' : 'Save profile'}
      </button>
    </form>
  );
}

function SecurityForm() {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNext] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await api.put<unknown>('/users/me/password', { currentPassword, newPassword });
      setMessage((res as { message?: string }).message ?? 'Password changed.');
      setCurrent('');
      setNext('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the password');
    } finally {
      setBusy(false);
    }
  };

  const signOutEverywhere = async () => {
    await api.post('/auth/logout-all');
    window.location.href = '/login';
  };

  return (
    <div style={{ maxWidth: 520 }}>
      <form onSubmit={submit}>
        {message && <div className="notice notice-ok">{message}</div>}
        {error && <div className="notice notice-error">{error}</div>}

        <label className="field">
          <span className="field-label">Current password</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">New password</span>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNext(e.target.value)}
            required
          />
          <span className="field-hint">
            Eight characters or more, with an uppercase letter, a lowercase letter and a number.
            Changing it signs you out everywhere else.
          </span>
        </label>

        <button className="btn" disabled={busy}>
          {busy ? 'Changing' : 'Change password'}
        </button>
      </form>

      <hr style={{ margin: '34px 0', border: 0, borderTop: '1px solid var(--line)' }} />

      <h3>Active sessions</h3>
      <p className="muted">
        Signed in on a shared machine? This ends every session, including this one.
      </p>
      <button className="btn btn-danger btn-sm" onClick={signOutEverywhere}>
        Sign out everywhere
      </button>
    </div>
  );
}

function MyComments() {
  const { user } = useAuth();
  const [comments, setComments] = useState<MyComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api
      .get<MyComment[]>('/comments/mine')
      .then((r) => setComments(r.data ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load comments'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const remove = async (id: string) => {
    if (!window.confirm('Remove this comment?')) return;
    await api.delete(`/comments/${id}`);
    load();
  };

  if (loading) return <div className="skeleton" style={{ width: '60%' }} />;
  if (error) return <div className="notice notice-error">{error}</div>;

  if (comments.length === 0) {
    return <div className="empty">No comments on your articles yet.</div>;
  }

  return (
    <div className="stack" style={{ gap: 0 }}>
      {comments.map((c) => (
        <div key={c._id} className="comment">
          <div className="comment-head">
            <Avatar name={c.author.name} url={c.author.avatarUrl} small />
            <span className="comment-name">{c.author.name}</span>
            {c.depth > 0 && <span className="meta">↳ reply</span>}
            {c.status !== 'visible' && <span className="chip chip-flag">{c.status}</span>}
            <span className="meta">{formatDate(c.createdAt)}</span>
          </div>
          <p className="comment-body">{c.body}</p>
          <div className="comment-actions">
            <Link className="link-btn" to={`/article/${c.post.slug}#comments`}>
              on "{c.post.title}"
            </Link>
            {c.status !== 'deleted' && (
              <button className="link-btn" onClick={() => remove(c._id)}>
                Remove
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- access */

const REQUESTABLE_ROLES: UserRole[] = ['author', 'editor', 'admin'];

function AccessRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestedRole, setRequestedRole] = useState<UserRole>('author');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get<RoleRequest[]>('/role-requests/me')
      .then((r) => setRequests(r.data ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const pending = requests.find((r) => r.status === 'pending');
  // A role you already hold, or one you're already waiting to hear back on,
  // is not worth offering in the picker.
  const options = REQUESTABLE_ROLES.filter((r) => r !== user?.role);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.post('/role-requests', { requestedRole, message: message || undefined });
      setMessage('');
      setNotice('Request sent. An admin will review it.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the request');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id: string) => {
    if (!window.confirm('Cancel this request?')) return;
    await api.delete(`/role-requests/${id}`);
    load();
  };

  if (loading) return <div className="skeleton" style={{ width: '50%' }} />;

  return (
    <div style={{ maxWidth: 560 }}>
      {error && <div className="notice notice-error">{error}</div>}
      {notice && <div className="notice notice-ok">{notice}</div>}

      {pending ? (
        <div className="panel">
          <p className="eyebrow" style={{ margin: 0 }}>
            Pending
          </p>
          <h3 style={{ margin: '6px 0' }}>
            Requested: {pending.requestedRole}
          </h3>
          {pending.message && <p className="muted">"{pending.message}"</p>}
          <p className="meta">Sent {formatDate(pending.createdAt)}</p>
          <button className="btn btn-danger btn-sm" onClick={() => cancel(pending._id)}>
            Cancel request
          </button>
        </div>
      ) : options.length === 0 ? (
        <div className="empty">You already hold the highest role.</div>
      ) : (
        <form onSubmit={submit}>
          <p className="muted" style={{ marginBottom: 18 }}>
            You're currently a <strong>{user?.role}</strong>. Ask an admin for a different role
            below — nothing changes until they approve it.
          </p>

          <label className="field">
            <span className="field-label">Requested role</span>
            <select
              className="select"
              value={requestedRole}
              onChange={(e) => setRequestedRole(e.target.value as UserRole)}
            >
              {options.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Why (optional)</span>
            <textarea
              className="textarea"
              style={{ minHeight: 90 }}
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="A line or two helps the admin decide faster."
            />
          </label>

          <button className="btn" disabled={busy}>
            {busy ? 'Sending' : 'Send request'}
          </button>
        </form>
      )}

      {requests.filter((r) => r.status !== 'pending').length > 0 && (
        <>
          <h3 style={{ marginTop: 34 }}>History</h3>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Requested</th>
                  <th>Status</th>
                  <th>Decided</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {requests
                  .filter((r) => r.status !== 'pending')
                  .map((r) => (
                    <tr key={r._id}>
                      <td>{r.requestedRole}</td>
                      <td>
                        <span className={`chip${r.status === 'approved' ? ' chip-live' : ' chip-flag'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="meta">{r.decidedAt ? formatDate(r.decidedAt) : '—'}</td>
                      <td className="meta">{r.decisionNote || '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
