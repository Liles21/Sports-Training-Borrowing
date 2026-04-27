import Link from "next/link";

export default function Home() {
  return (
    <div className="auth-page">
      <main className="auth-card">
        <p className="logo-eyebrow">Sport Gym Equipment</p>
        <h1>Borrowing System</h1>
        <p className="muted">Use the login page to access your dashboard.</p>
        <Link href="/login" className="btn primary">
          Go to Login
        </Link>
      </main>
    </div>
  );
}
