import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="shell page rail">
      <p className="eyebrow rail-node">404</p>
      <h1>This page is not on the rail</h1>
      <p className="lede">
        The address does not match anything we publish. The home page is the fastest way back.
      </p>
      <Link className="btn" to="/">
        Go to the home page
      </Link>
    </div>
  );
}
