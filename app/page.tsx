import Link from "next/link";

export default function Home() {
  return (
    <div className="auth-page">
      <main className="auth-card">
        <p className="logo-eyebrow">Sport Gym Equipment</p>
        <h1>Borrowing System</h1>
        <p className="muted auth-subtitle">
          A cleaner way to manage equipment requests, approvals, and returns without the usual
          friction.
        </p>

        <div className="auth-highlights">
          <span>Live inventory</span>
          <span>Role-based access</span>
          <span>Return tracking</span>
        </div>

        <ul className="home-feature-list">
          <li>
            <div>
              <strong>One workflow</strong>
              <span>Borrowers and admins stay in the same system from request to return.</span>
            </div>
          </li>
          <li>
            <div>
              <strong>Clear visibility</strong>
              <span>Track what is available, what is borrowed, and what needs attention.</span>
            </div>
          </li>
        </ul>

        <div className="button-row">
          <Link href="/login" className="btn primary">
            Go to Login
          </Link>
          <Link href="/register" className="btn ghost">
            Create Account
          </Link>
        </div>
      </main>
    </div>
  );
}
