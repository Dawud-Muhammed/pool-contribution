import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="shell page-space narrow-page">
      <div className="error-panel">
        <span className="eyebrow">Access denied</span>
        <h1>Admin privileges required.</h1>
        <p>
          Your account does not have administrator access. This area is
          restricted to authorized administrators only.
        </p>
        <div className="home-actions">
          <Link className="button primary" href="/pools">
            Explore pools
          </Link>
          <Link className="quiet-link" href="/">
            Back to home →
          </Link>
        </div>
      </div>
    </main>
  );
}
