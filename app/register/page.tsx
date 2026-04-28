"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { HiOutlineArrowRightEndOnRectangle } from "react-icons/hi2";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = await register({ name, email, password });
      router.replace(user.role === "admin" ? "/admin/dashboard" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <div className="auth-brand-badge">
          <span>🏋️</span>
        </div>

        <h1>Create Account</h1>
        <p className="muted auth-subtitle">Join the gym equipment borrowing system</p>

        <div className="auth-highlights">
          <span>Borrow history</span>
          <span>Notifications</span>
          <span>Mobile friendly</span>
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            Full Name
            <input
              placeholder="Enter your full name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              minLength={6}
              placeholder="Enter your password (min 6 characters)"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error && <p className="alert error">{error}</p>}

          <button type="submit" className="btn primary" disabled={loading}>
            <HiOutlineArrowRightEndOnRectangle />
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link href="/login">Sign in here</Link>
        </p>
      </section>
    </div>
  );
}
