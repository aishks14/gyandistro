import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, signOut, can } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const close = () => setOpen(false);

  const handleSignOut = async () => {
    await signOut();
    close();
    navigate('/');
  };

  return (
    <header className="masthead">
      <div className="shell masthead-inner">
        <Link to="/" className="wordmark" onClick={close}>
          <img src="/gd-logo-3.png" alt="GyanDistro"  width={40} height={40} />
          <span className="wordmark-text">
            <span className="wordmark-name">GyanDistro</span>
            <span className="wordmark-tagline">Knowledge, distributed</span>
          </span>
        </Link>

        <button
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Close' : 'Menu'}
        </button>

        <nav id="primary-nav" className={`nav${open ? ' is-open' : ''}`}>
          <NavLink to="/" end className="nav-link" onClick={close}>
            Home
          </NavLink>
          <NavLink to="/about" className="nav-link" onClick={close}>
            About
          </NavLink>

          {user ? (
            <>
              {can('author') && (
                <NavLink to="/write" className="nav-link" onClick={close}>
                  Write
                </NavLink>
              )}
              <NavLink to="/dashboard" className="nav-link" onClick={close}>
                Dashboard
              </NavLink>
              {can('admin') && (
                <NavLink to="/admin" className="nav-link" onClick={close}>
                  Admin
                </NavLink>
              )}
              <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="nav-link" onClick={close}>
                Sign in
              </NavLink>
              <Link to="/register" className="btn btn-accent btn-sm" onClick={close}>
                Join
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
