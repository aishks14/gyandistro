import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="shell page">
      <div className="center-narrow rail">
        <p className="eyebrow rail-node">Account</p>
        <h1 style={{ fontSize: '2.4rem' }}>Sign in</h1>
        <p className="muted" style={{ marginBottom: 26 }}>
          Comment on articles, save your drafts, and pick up where you left off.
        </p>

        {error && <div className="notice notice-error">{error}</div>}

        <form onSubmit={submit}>
          <label className="field">
            <span className="field-label">Email</span>
            <input
              className="input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="field-hint">
              Five wrong attempts locks the account for fifteen minutes.
            </span>
          </label>

          <button className="btn" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Signing in' : 'Sign in'}
          </button>
        </form>

        <p className="meta" style={{ marginTop: 22 }}>
          No account yet? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}
