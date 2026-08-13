import { Link } from 'react-router-dom';
import AdSlot from '../components/AdSlot';

export default function About() {
  return (
    <div className="shell page">
      <div className="split">
        <main id="main" className="rail">
          <p className="eyebrow rail-node">About</p>
          <h1 style={{ maxWidth: '14ch' }}>What GyanDistro is for</h1>
          <p className="lede">
            Most technical writing online is either a sales page or a wall of jargon. GyanDistro
            publishes the middle thing: short, specific pieces that explain how something actually
            works, written by people who had to figure it out under deadline.
          </p>

          <section style={{ marginTop: 44 }}>
            <p className="eyebrow rail-node">How we work</p>
            <h2>Four roles, one workflow</h2>
            <p>
              Readers comment and follow. Authors write and submit drafts. Editors review, publish
              and moderate. Administrators manage accounts, sections and advertising. Every article
              passes through a person before it goes live.
            </p>
            <p>
              We use AI as a desk assistant, not a writer: summaries, headline options, tag
              suggestions and a first pass at comment moderation. Every published word has a named
              human author behind it.
            </p>
          </section>

          <section id="advertising" style={{ marginTop: 44 }}>
            <p className="eyebrow rail-node">Advertising</p>
            <h2>How the site pays for itself</h2>
            <p>
              GyanDistro is free to read and always will be. Three things keep it running, and all
              three are labelled where you meet them.
            </p>
            <ul>
              <li>
                <strong>Display advertising.</strong> Fixed slots in the sidebar, inside articles
                and below them. Sold by the month, priced on the audience, never auto-playing and
                never following you around.
              </li>
              <li>
                <strong>Sponsored articles.</strong> Written to our editorial standard, marked
                "Sponsored" in the article header and in every listing. A sponsor gets a topic, not
                a veto.
              </li>
              <li>
                <strong>Affiliate links.</strong> Occasionally we link to a book or a tool and earn
                a commission. Those articles carry a disclosure box, and the recommendation is the
                same one we would make unpaid.
              </li>
            </ul>
            <p>
              Rates, traffic figures and available slots: <a href="mailto:ads@gyandistro.com">ads@gyandistro.com</a>.
            </p>
          </section>

          <section id="disclosure" style={{ marginTop: 44 }}>
            <p className="eyebrow rail-node">Disclosure</p>
            <h2>What you can expect from us</h2>
            <p>
              We label every paid placement. We do not sell links inside editorial articles. We
              correct errors in place with a note rather than quietly editing. If a sponsor asks us
              to remove a critical line, we say no and return the money.
            </p>
          </section>

          <section id="privacy" style={{ marginTop: 44 }}>
            <p className="eyebrow rail-node">Privacy</p>
            <h2>What we store</h2>
            <p>
              An account holds your name, email address, a hashed password and anything you choose
              to put in your profile. Comments are public. Ad units count impressions and clicks in
              aggregate — no personal profiles, no third-party trackers by default. Write to{' '}
              <a href="mailto:privacy@gyandistro.com">privacy@gyandistro.com</a> to have your
              account and comments deleted.
            </p>
          </section>

          <section style={{ marginTop: 44 }}>
            <p className="eyebrow rail-node">Write for us</p>
            <h2>Pitch an article</h2>
            <p>
              Send a paragraph on what you want to explain and why you are the person to explain
              it. We reply to everything. Published contributors get author access and a byline
              that links to their own site.
            </p>
            <div className="row">
              <a className="btn" href="mailto:write@gyandistro.com">
                Send a pitch
              </a>
              <Link className="btn btn-ghost" to="/register">
                Create an account
              </Link>
            </div>
          </section>
        </main>

        <aside>
          <div className="sidebar-block">
            <div className="sidebar-title">Contact</div>
            <ul className="footer-list" style={{ color: 'var(--ink)' }}>
              <li><a href="mailto:hello@gyandistro.com">hello@gyandistro.com</a></li>
              <li><a href="mailto:ads@gyandistro.com">ads@gyandistro.com</a></li>
              <li><a href="mailto:write@gyandistro.com">write@gyandistro.com</a></li>
            </ul>
          </div>
          <AdSlot placement="sidebar" />
        </aside>
      </div>
    </div>
  );
}
