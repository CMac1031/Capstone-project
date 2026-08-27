/**
 * Login.tsx
 *
 * Full-page screen shown whenever nobody is logged in. App.tsx renders
 * this alone (no Navbar) until isAuthenticated becomes true.
 *
 * Two modes, switched by the tabs at the top of the card:
 *  - "login" posts to /api/auth/login and hands the result to useAuth().
 *  - "signup" posts to /api/auth/signup, which only ever queues a PENDING
 *    request -- it never logs anyone in directly. An admin has to approve
 *    it first before the account can actually log in.
 */

import { useState, type FormEvent } from "react";
import { useAuth } from "../hooks/useAuth";
import { type Permission } from "../types/AuthTypes";
import "../styles/Login.css";

interface LoginApiResponse {
  permission: Permission;
  jwt: string;
}

type Mode = "login" | "signup";

// Set at build time (e.g. VITE_BUILD_SHA=$(git rev-parse --short HEAD) npm run build).
// Falls back to something honest rather than a hardcoded commit that goes stale.
const BUILD_LABEL = import.meta.env.VITE_BUILD_SHA ?? "local build";

export default function Login() {
  const { login } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [signupMessage, setSignupMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setSignupMessage(null);
    setPassword("");
  };

  async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") return body.detail;
    } catch {
      // response wasn't JSON -- fall through to the generic message
    }
    return fallback;
  }

  const handleLoginSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        throw new Error("Invalid username or password.");
      }

      const data: LoginApiResponse = await res.json();
      login(username, data.permission, data.jwt);
      setPassword("");
    } catch (err) {
      setPassword("");
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSignupMessage(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const message = await extractErrorMessage(res, "Couldn't submit the request. Try again.");
        throw new Error(message);
      }

      setSignupMessage("Request submitted. An admin will review it before you can log in.");
      setUsername("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit the request. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = mode === "login" ? handleLoginSubmit : handleSignupSubmit;

  return (
      <div className="login-screen">
        <div className="login-screen-brand">
          <div>
            <div className="login-screen-logo">
              <span className="login-screen-logo-brace">{"{"}</span>
              <span>PNC</span>
              <span className="login-screen-logo-brace">{"}"}</span>
            </div>
            <p className="login-screen-title">Pretty Nice Code CRM</p>
            <p className="login-screen-tagline">
              One place for agents to search customers, review history, and log every interaction.
            </p>
          </div>
          <p className="login-screen-build">build {BUILD_LABEL} &middot; correlation tracing on</p>
        </div>

        <div className="login-screen-panel">
          <div className="login-screen-card">
            <div className="login-screen-tabs">
              <button
                  type="button"
                  className={`login-screen-tab ${mode === "login" ? "login-screen-tab--active" : ""}`}
                  onClick={() => switchMode("login")}
              >
                Log in
              </button>
              <button
                  type="button"
                  className={`login-screen-tab ${mode === "signup" ? "login-screen-tab--active" : ""}`}
                  onClick={() => switchMode("signup")}
              >
                Create account
              </button>
            </div>

            <p className="login-screen-title-sm">{mode === "login" ? "Log in" : "Create account"}</p>
            <p className="login-screen-subtitle">
              {mode === "login"
                  ? "Use your agent or admin credentials."
                  : "An admin reviews new requests before access is granted."}
            </p>

            {signupMessage ? (
                <div className="login-screen-success">
                  <p>{signupMessage}</p>
                  <button type="button" className="login-screen-submit" onClick={() => switchMode("login")}>
                    Back to log in
                  </button>
                </div>
            ) : (
                <form className="login-screen-form" onSubmit={handleSubmit}>
                  <label className="login-screen-field">
                    <span>Username</span>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoFocus
                        required
                    />
                  </label>

                  <label className="login-screen-field">
                    <span>Password</span>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                  </label>

                  {error && <p className="login-screen-error">{error}</p>}

                  <button type="submit" className="login-screen-submit" disabled={isSubmitting}>
                    {isSubmitting
                        ? mode === "login"
                            ? "Logging in..."
                            : "Submitting..."
                        : mode === "login"
                            ? "Log in"
                            : "Request account"}
                  </button>

                  {mode === "login" && (
                      <p className="login-screen-footnote">Session is JWT-based &middot; no cookies stored</p>
                  )}
                </form>
            )}
          </div>
        </div>
      </div>
  );
}