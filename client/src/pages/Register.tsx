import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RULES = [
  { test: (v: string) => v.length >= 8, label: 'At least 8 characters' },
  { test: (v: string) => /[a-z]/.test(v), label: 'One lowercase letter' },
  { test: (v: string) => /[A-Z]/.test(v), label: 'One uppercase letter' },
  { test: (v: string) => /[0-9]/.test(v), label: 'One number' }
];

export default function Register() {
  const { signUp, user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const allPassed = RULES.every((rule) => rule.test(password));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signUp(name, email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the account');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="shell page">
      <div className="center-narrow rail">
        <p className="eyebrow rail-node">Account</p>
        <h1 style={{ fontSize: '2.4rem' }}>Create an account</h1>
        <p className="muted" style={{ marginBottom: 26 }}>
          Free, and it takes a moment. New accounts start as readers; ask an admin for author
          access when you want to publish.
        </p>

        {error && <div className="notice notice-error">{error}</div>}

        <form onSubmit={submit}>
          <label className="field">
            <span className="field-label">Name</span>
            <input
              className="input"
              required
              minLength={2}
              value={name}
              autoComplete="name"
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Email</span>
            <input
              className="input"
              type="email"
              required
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <input
              className="input"
              type="password"
              required
              value={password}
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px' }}>
            {RULES.map((rule) => {
              const passed = rule.test(password);
              return (
                <li
                  key={rule.label}
                  className="meta"
                  style={{ color: passed ? 'var(--teal)' : 'var(--slate)', marginBottom: 4 }}
                >
                  {passed ? '✓' : '·'} {rule.label}
                </li>
              );
            })}
          </ul>

          <button className="btn" style={{ width: '100%' }} disabled={busy || !allPassed}>
            {busy ? 'Creating' : 'Create account'}
          </button>
        </form>

        <p className="meta" style={{ marginTop: 22 }}>
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
