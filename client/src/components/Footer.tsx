import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import AdSlot from './AdSlot';

const SITE_SOCIAL = {
  twitter: 'https://twitter.com/gyandistro',
  linkedin: 'https://linkedin.com/company/gyandistro',
  github: 'https://github.com/gyandistro',
  youtube: 'https://youtube.com/@gyandistro',
  instagram: 'https://instagram.com/gyandistro'
};

export default function Footer() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const subscribe = async (event: FormEvent) => {
    event.preventDefault();
    setState('sending');
    try {
      await api.post('/newsletter', { email, source: 'footer' });
      setState('done');
      setMessage('You are on the list.');
      setEmail('');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'That did not go through.');
    }
  };

  return (
    <footer className="footer">
      <div className="shell">
        <AdSlot placement="footer" label="Advertisement" />

        <div className="footer-grid">
          <div>
            <div className="footer-title">GyanDistro</div>
            <p style={{ fontSize: 15, maxWidth: '38ch' }}>
              Plain, useful writing on data, engineering, careers and learning. New articles most
              weeks, no filler.
            </p>
            <form onSubmit={subscribe} className="newsletter-row">
              <input
                className="input"
                type="email"
                required
                value={email}
                placeholder="you@example.com"
                aria-label="Email address for the newsletter"
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="btn btn-accent btn-sm" disabled={state === 'sending'}>
                {state === 'sending' ? 'Sending' : 'Subscribe'}
              </button>
            </form>
            {message && (
              <p className="meta" style={{ marginTop: 10, color: state === 'error' ? '#e8709a' : '#8ad3c2' }}>
                {message}
              </p>
            )}
          </div>

          <div>
            <div className="footer-title">Read</div>
            <ul className="footer-list">
              <li><Link to="/">Latest articles</Link></li>
              <li><Link to="/?sort=popular">Most read</Link></li>
              <li><Link to="/?sort=discussed">Most discussed</Link></li>
              <li><Link to="/about">About us</Link></li>
            </ul>
          </div>

          <div>
            <div className="footer-title">Take part</div>
            <ul className="footer-list">
              <li><Link to="/register">Create an account</Link></li>
              <li><Link to="/login">Sign in</Link></li>
              <li><Link to="/dashboard">Your dashboard</Link></li>
              <li><a href="mailto:write@gyandistro.com">Pitch an article</a></li>
            </ul>
          </div>

          <div>
            <div className="footer-title">Business</div>
            <ul className="footer-list">
              <li><a href="mailto:ads@gyandistro.com">Advertise</a></li>
              <li><Link to="/about#advertising">Rates and formats</Link></li>
              <li><Link to="/about#disclosure">Affiliate disclosure</Link></li>
              <li><Link to="/about#privacy">Privacy</Link></li>
            </ul>
            <div className="social-row" style={{ marginTop: 16 }}>
              {Object.entries(SITE_SOCIAL).map(([key, url]) => (
                <a key={key} className="social-link" href={url} target="_blank" rel="noopener noreferrer">
                  {key === 'twitter' ? 'X' : key}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} GyanDistro</span>
          <span>Some links on this site earn a commission. Sponsored articles are labelled.</span>
        </div>
      </div>
    </footer>
  );
}
