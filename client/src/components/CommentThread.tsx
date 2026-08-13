import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, formatDate, roleRank } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import type { CommentNode } from '../types';

interface Props {
  slug: string;
  comments: CommentNode[];
  allowComments: boolean;
  onReload: () => void;
}

const MAX_DEPTH = 3;

export default function CommentThread({ slug, comments, allowComments, onReload }: Props) {
  const { user } = useAuth();
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const total = countAll(comments);

  const submit = async (event: FormEvent, parent?: string) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await api.post<unknown>(`/posts/${slug}/comments`, {
        body: draft.trim(),
        parent
      });
      setDraft('');
      setReplyTo(null);
      if ((res as { message?: string }).message) setNotice((res as { message?: string }).message!);
      onReload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your comment did not post.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Remove this comment?')) return;
    await api.delete(`/comments/${id}`);
    onReload();
  };

  const renderNode = (node: CommentNode) => {
    const canRemove =
      user && (user.id === node.author?._id || roleRank(user.role) >= roleRank('editor'));

    return (
      <div key={node._id} className="comment">
        <div className="comment-head">
          <Avatar name={node.author?.name ?? '?'} url={node.author?.avatarUrl} small />
          <span className="comment-name">{node.author?.name ?? 'Deleted account'}</span>
          {node.author?.role && node.author.role !== 'reader' && (
            <span className="chip">{node.author.role}</span>
          )}
          <span className="meta">{formatDate(node.createdAt)}</span>
        </div>

        <p className="comment-body">{node.body}</p>

        <div className="comment-actions">
          {user && node.depth < MAX_DEPTH && node.status === 'visible' && (
            <button
              className="link-btn"
              onClick={() => {
                setReplyTo(replyTo === node._id ? null : node._id);
                setDraft('');
              }}
            >
              {replyTo === node._id ? 'Cancel' : 'Reply'}
            </button>
          )}
          {canRemove && node.status !== 'deleted' && (
            <button className="link-btn" onClick={() => remove(node._id)}>
              Remove
            </button>
          )}
        </div>

        {replyTo === node._id && (
          <form onSubmit={(e) => submit(e, node._id)} style={{ marginTop: 12 }}>
            <textarea
              className="textarea"
              style={{ minHeight: 90 }}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Reply to ${node.author?.name ?? 'this comment'}`}
              required
            />
            <button className="btn btn-sm" style={{ marginTop: 8 }} disabled={busy}>
              {busy ? 'Posting' : 'Post reply'}
            </button>
          </form>
        )}

        {node.replies.length > 0 && (
          <div className="comment-children">{node.replies.map(renderNode)}</div>
        )}
      </div>
    );
  };

  return (
    <section id="comments" style={{ marginTop: 52 }}>
      <p className="eyebrow rail-node">Discussion</p>
      <h2>
        {total} {total === 1 ? 'comment' : 'comments'}
      </h2>

      {!allowComments && <div className="notice notice-warn">Comments are closed on this article.</div>}
      {error && <div className="notice notice-error">{error}</div>}
      {notice && <div className="notice notice-ok">{notice}</div>}

      {allowComments &&
        (user ? (
          replyTo === null && (
            <form onSubmit={(e) => submit(e)} style={{ marginBottom: 10 }}>
              <label className="field">
                <span className="field-label">Add to the discussion</span>
                <textarea
                  className="textarea"
                  style={{ minHeight: 110 }}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Keep it useful. Disagreement is fine; abuse is not."
                  required
                />
              </label>
              <button className="btn" disabled={busy}>
                {busy ? 'Posting' : 'Post comment'}
              </button>
            </form>
          )
        ) : (
          <div className="notice">
            <Link to="/login">Sign in</Link> to join the discussion.
          </div>
        ))}

      {comments.length === 0 ? (
        <div className="empty">No comments yet. Start the thread.</div>
      ) : (
        comments.map(renderNode)
      )}
    </section>
  );
}

function countAll(nodes: CommentNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countAll(node.replies), 0);
}
