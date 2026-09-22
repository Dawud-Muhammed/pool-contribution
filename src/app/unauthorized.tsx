import Link from "next/link";

export default function Unauthorized() {
  return (
    <main className="shell page-space narrow-page">
      <div className="error-panel">
        <span className="eyebrow">Authentication required</span>
        <h1>Sign in to continue.</h1>
        <p>
          You need to be signed in to access this area. If you have an admin
          account, sign in below.
        </p>
        <div className="home-actions">
          <Link className="button primary" href="/admin/login">
            Go to sign in
          </Link>
          <Link className="quiet-link" href="/">
            Back to home →
          </Link>
        </div>
      </div>
    </main>
  );
}
