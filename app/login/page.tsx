"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { HiOutlineArrowRightEndOnRectangle, HiOutlineEye, HiOutlineEyeSlash } from "react-icons/hi2";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Validate email format
  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      setEmailError("");
      return false;
    }
    if (!emailRegex.test(value)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    validateEmail(value);
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    
    // Validate before submit
    if (!validateEmail(email) || !password) {
      setError("Please fill in all fields correctly");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const user = await login(email, password);
      
      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("rememberedEmail");
      }

      router.replace(user.role === "admin" ? "/admin/dashboard" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to login. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <div className="auth-logo" aria-label="Fitness Sport logo">
          <svg viewBox="0 0 220 220" role="img" aria-hidden="true">
            <g transform="translate(110 74)">
              <circle cx="-44" cy="0" r="28" fill="#000" />
              <circle cx="-44" cy="0" r="21" fill="#fff" />
              <rect x="-26" y="-9" width="28" height="18" rx="5" fill="#000" />
              <rect x="4" y="-14" width="15" height="28" rx="4" fill="#000" />
              <circle cx="42" cy="0" r="38" fill="#000" />
              <circle cx="42" cy="0" r="28" fill="#fff" />
              <circle cx="42" cy="0" r="17" fill="#000" />
              <circle cx="42" cy="0" r="9" fill="#fff" />
            </g>
            <rect x="46" y="118" width="128" height="4" fill="#000" />
            <text x="110" y="156" text-anchor="middle" fill="#000" font-size="34" font-weight="800" letter-spacing="4" font-family="Arial, Helvetica, sans-serif">FITNESS</text>
            <text x="110" y="186" text-anchor="middle" fill="#000" font-size="20" font-weight="700" letter-spacing="6" font-family="Arial, Helvetica, sans-serif">SPORT</text>
          </svg>
        </div>

        <h1>Welcome Back</h1>
        <p className="muted auth-subtitle">Sign in to access the gym equipment system</p>

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-field">
            <label htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="your@email.com"
              aria-describedby={emailError ? "email-error" : undefined}
              className={emailError ? "input-error" : ""}
              required
              autoComplete="email"
              disabled={loading}
            />
            {emailError && (
              <p id="email-error" className="field-error">
                {emailError}
              </p>
            )}
          </div>

          <div className="form-field">
            <div className="password-label-row">
              <label htmlFor="password">Password</label>
              <Link href="/login" className="forgot-link">
                Forgot?
              </Link>
            </div>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={loading}
                tabIndex={-1}
              >
                {showPassword ? (
                  <HiOutlineEyeSlash />
                ) : (
                  <HiOutlineEye />
                )}
              </button>
            </div>
          </div>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={loading}
            />
            <span>Keep me signed in</span>
          </label>

          {error && (
            <div className="alert error" role="alert">
              <p>{error}</p>
            </div>
          )}

          <button 
            type="submit" 
            className="btn primary" 
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Signing in...
              </>
            ) : (
              <>
                <HiOutlineArrowRightEndOnRectangle />
                Sign In
              </>
            )}
          </button>
        </form>

        <p className="auth-switch">
          Don&apos;t have an account? <Link href="/register">Register here</Link>
        </p>
      </section>
    </div>
  );
}
