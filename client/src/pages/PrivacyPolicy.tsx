export default function PrivacyPolicy() {
  return (
    <div className="shell page rail">
      <p className="eyebrow rail-node">Legal</p>
      <h1 style={{ fontSize: '2.6rem' }}>Privacy Policy</h1>
      <p className="lede">
        Last updated: [DATE]. This describes what GyanDistro collects, why, and what control you
        have over it.
      </p>

      <section style={{ marginTop: 40 }}>
        <h2>What we collect</h2>
        <p>
          If you create an account: your name, email address, and a password (stored as a
          bcrypt hash — we never see or store your actual password). Optionally, a bio, an
          avatar image, and social media links you choose to add.
        </p>
        <p>
          If you write for GyanDistro: the articles, drafts, and images you create or upload.
        </p>
        <p>If you comment: the text of your comments, tied to your account.</p>
        <p>
          If you subscribe to the newsletter: your email address, stored separately from your
          account if you don't have one.
        </p>
        <p>
          Standard technical data every website collects: IP address, browser type, and pages
          visited, via ordinary server logs.
        </p>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>Cookies</h2>
        <p>
          We set one cookie: a login session token, used only to keep you signed in between
          visits. It is <code>httpOnly</code> (invisible to page scripts) and cannot be read by
          any third party. This cookie is strictly necessary for the site to function and
          doesn't require consent under GDPR — but you're entitled to know it's there, so here
          it is.
        </p>
        <p>
          We do not currently use analytics or advertising cookies. If that changes — for
          instance, if we add a display-advertising network — we'll ask for your consent first,
          via the banner shown on your first visit, before any such cookie is set.
        </p>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>How we use your data</h2>
        <ul>
          <li>To create and manage your account, and to keep you signed in</li>
          <li>To display your articles, comments, and public author profile</li>
          <li>To send the newsletter, if you've subscribed to it</li>
          <li>To moderate content and enforce our Terms of Service</li>
          <li>To improve the site — understanding what's read, not tracking who reads it</li>
        </ul>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>AI features</h2>
        <p>
          GyanDistro's editor includes optional AI-assisted writing tools — suggesting
          headlines, tags, or tightening a draft. When these are turned on, the article text you
          submit to them is sent to the configured AI provider (currently [OpenAI / Anthropic /
          a self-hosted model — delete as applicable]) to generate a suggestion. Nothing is
          saved or published without your review. If AI features are switched off, none of this
          applies.
        </p>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>Who we share data with</h2>
        <p>
          Our database is hosted by MongoDB Atlas, and our servers by [YOUR HOST]. Both process
          data on our behalf under their own security and privacy commitments — we don't sell or
          rent your data to anyone, for any reason.
        </p>
        <p>
          If we ever run sponsored content or affiliate links, that's disclosed directly on the
          article itself — see our <a href="/about#disclosure">disclosure policy</a>.
        </p>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>Your rights</h2>
        <p>You can:</p>
        <ul>
          <li>Access or correct your account details any time, from your Dashboard</li>
          <li>Request a copy of the data we hold about you</li>
          <li>Request that your account and associated data be deleted</li>
          <li>Unsubscribe from the newsletter at any time, via the link in every email</li>
        </ul>
        <p>
          For anything not self-service in your Dashboard — including deletion requests — email{' '}
          <a href="mailto:privacy@gyandistro.com">privacy@gyandistro.com</a>.
        </p>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>Children's privacy</h2>
        <p>
          GyanDistro is not directed at children, and we don't knowingly collect data from
          anyone under 16. If you believe a child has created an account, contact us and we'll
          remove it.
        </p>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>Security</h2>
        <p>
          Passwords are hashed, never stored in plain text. Sessions use short-lived access
          tokens with rotating refresh tokens. All traffic is encrypted over HTTPS. No system is
          perfectly secure, but we take reasonable, industry-standard steps to protect your
          data.
        </p>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>Changes to this policy</h2>
        <p>
          If this policy changes materially, we'll update the date at the top and, for
          significant changes, note it on the homepage.
        </p>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>Contact</h2>
        <p>
          Questions about this policy: <a href="mailto:privacy@gyandistro.com">privacy@gyandistro.com</a>
        </p>
      </section>
    </div>
  );
}