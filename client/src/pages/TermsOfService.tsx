export default function TermsOfService() {
  return (
    <div className="shell page rail">
      <p className="eyebrow rail-node">Legal</p>
      <h1 style={{ fontSize: '2.6rem' }}>Terms of Service</h1>
      <p className="lede">
        Last updated: [DATE]. By using GyanDistro, you agree to these terms.
      </p>

      <section style={{ marginTop: 40 }}>
        <h2>What GyanDistro is</h2>
        <p>
          GyanDistro is a blog publishing knowledge, distributed — practical writing on data,
          engineering, careers, and learning. Reading is free and requires no account. An
          account is needed to comment, and a writer role to publish.
        </p>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>Accounts and roles</h2>
        <p>
          Every account starts as a reader. Author, editor, and admin roles are granted by an
          existing admin, either directly or through an access request you submit from your
          Dashboard. You're responsible for keeping your login credentials secure and for
          activity on your account. Tell us immediately at{' '}
          <a href="mailto:hello@gyandistro.com">hello@gyandistro.com</a> if you believe your
          account has been compromised.
        </p>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>Content you create</h2>
        <p>
          <strong>You own what you write.</strong> By publishing an article or comment on
          GyanDistro, you grant us a license to display, distribute, and archive it on the site
          — we don't take ownership of it, and you're free to republish it elsewhere.
        </p>
        <p>You agree not to publish content that:</p>
        <ul>
          <li>Infringes someone else's copyright or other rights</li>
          <li>Is defamatory, harassing, or knowingly false in a way that could cause harm</li>
          <li>Is spam, or exists mainly to manipulate search rankings</li>
        </ul>
        <p>
          Editors and admins may edit, unpublish, or remove content that violates these terms,
          and may moderate or remove comments — including via the AI-assisted moderation
          described in our{' '}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>Sponsored content and affiliate links</h2>
        <p>
          Some articles are sponsored, or contain affiliate links that earn us a commission.
          Both are always labelled directly on the article — see our full{' '}
          <a href="/about#disclosure">disclosure policy</a>. A sponsor gets a topic, never a
          veto over what we write about it.
        </p>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Scrape or systematically copy the site's content for republication elsewhere</li>
          <li>Attempt to gain unauthorized access to any account or system</li>
          <li>Use automated tools to create accounts, post comments, or abuse rate limits</li>
          <li>Interfere with the site's normal operation</li>
        </ul>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>Termination</h2>
        <p>
          We may suspend or deactivate an account that violates these terms. You can stop using
          the service and request account deletion at any time — see our{' '}
          <a href="/privacy">Privacy Policy</a> for how.
        </p>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>No warranty</h2>
        <p>
          GyanDistro is provided "as is." Articles reflect the views and research of their
          authors at the time of writing, and shouldn't be taken as professional advice —
          especially anything financial or legal, where we always recommend speaking to a
          qualified professional for your specific situation. We don't guarantee the site will
          be available, uninterrupted, or error-free at all times.
        </p>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>Limitation of liability</h2>
        <p>
          To the extent permitted by law, GyanDistro isn't liable for indirect, incidental, or
          consequential damages arising from your use of the site.
        </p>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>Governing law</h2>
        <p>These terms are governed by the laws of [YOUR JURISDICTION].</p>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>Changes to these terms</h2>
        <p>
          We may update these terms from time to time. Continued use of the site after a change
          means you accept the updated terms.
        </p>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>Contact</h2>
        <p>
          Questions about these terms: <a href="mailto:hello@gyandistro.com">hello@gyandistro.com</a>
        </p>
      </section>
    </div>
  );
}