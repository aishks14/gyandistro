import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getConsent, setConsent } from '../lib/consent.ts';

/**
 * Shows once, on first visit, until a choice is made. Both buttons are
 * deliberately the same size and prominence — regulators (and the GDPR's own
 * guidance) specifically call out "Accept" as a big button next to "Reject"
 * as a faint link as a dark pattern. Neither choice should be easier than
 * the other to click.
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getConsent() === null);
  }, []);

  const choose = (choice: 'accepted' | 'rejected') => {
    setConsent(choice);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie preferences">
      <div className="shell cookie-banner-inner">
        <p className="cookie-banner-text">
          We use one essential cookie to keep you signed in — nothing else runs without your
          say-so. Read the{' '}
          <Link to="/privacy" className="cookie-banner-link">
            Privacy Policy
          </Link>{' '}
          for details.
        </p>
        <div className="cookie-banner-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => choose('rejected')}>
            Reject non-essential
          </button>
          <button className="btn btn-accent btn-sm" onClick={() => choose('accepted')}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}