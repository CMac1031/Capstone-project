/**
 * LoginButton.tsx
 *
 * Renders a clickable box that opens a login popup. The popup collects
 * a username + password, sends them to the login API, and on success hands
 * the returned permission + jwt off to the useAuth() context.
 *
 * On failed login, the password field is cleared but the username is kept,
 * so the user doesn't have to retype it.
 */

import { useRef, useState, type SubmitEvent, type KeyboardEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../hooks/useAuth";
import { type Permission } from "../types/AuthTypes";
import { newCorrelationId } from "../utils/correlation";
import "../styles/Login.css";

interface LoginApiResponse {
  permission: Permission;
  jwt: string;
}

export default function Login() {
  const { login } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const overlayRef = useRef<HTMLDivElement | null>(null);

  const openModal = () => {
    setError(null);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setError(null);
    setIsSubmitting(false);
    setPassword("");
    setUsername("");
  };

  // Clicking the dimmed backdrop (not the modal card itself) closes the popup.
  const handleOverlayMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) {
      closeModal();
    }
  };

  const handleBoxKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openModal();
    }
  };

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Correlation-Id": newCorrelationId(),
        },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        throw new Error("Invalid username or password.");
      }

      const data: LoginApiResponse = await res.json();
      login(username, data.permission, data.jwt);

      setPassword("");
      setIsOpen(false);
    } catch (err) {
      // Failed login: clear password, keep username.
      setPassword("");
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
      <>
        <div
            className="login-button-box"
            onClick={openModal}
            onKeyDown={handleBoxKeyDown}
            role="button"
            tabIndex={0}
            aria-haspopup="dialog"
        >
          <span className="login-button-label">Login</span>
        </div>

        {isOpen && typeof document !== "undefined"
            ? createPortal(
                <div
                    className="login-overlay"
                    ref={overlayRef}
                    onMouseDown={handleOverlayMouseDown}
                >
                  <div
                      className="login-modal"
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="login-modal-title"
                  >
                    <h2 id="login-modal-title" className="login-modal-title">
                      Log In
                    </h2>

                    <form className="login-form" onSubmit={handleSubmit}>
                      <label className="login-field">
                        <span className="login-field-label">Username</span>
                        <input
                            type="text"
                            className="login-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoFocus
                            required
                        />
                      </label>

                      <label className="login-field">
                        <span className="login-field-label">Password</span>
                        <input
                            type="password"
                            className="login-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                      </label>

                      {error && <p className="login-error">{error}</p>}

                      <button
                          type="submit"
                          className="login-submit-button"
                          disabled={isSubmitting}
                      >
                        {isSubmitting ? "Logging in..." : "Log In"}
                      </button>
                    </form>
                  </div>
                </div>,
                document.body
            )
            : null}
      </>
  );
}