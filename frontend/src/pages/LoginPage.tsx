import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiClientError } from "../api/client";

export function LoginPage() {
  const { user, login, sessionExpiredMessage } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // If already logged in, redirect to catalog (SDS 11.1)
  if (user) {
    return <Navigate to="/items" replace />;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    // Client-side quick checks (SDS 11.4: required fields only)
    const localErrors: Record<string, string[]> = {};
    if (!username.trim()) {
      localErrors.username = ["Username is required."];
    }
    if (!password) {
      localErrors.password = ["Password is required."];
    }
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate("/items");
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.status === 401) {
          // FR-01 generic rejection
          setGeneralError(err.message || "Invalid username or password");
        } else if (err.status === 422 && err.details) {
          setFieldErrors(err.details);
        } else {
          setGeneralError(err.message || "Something went wrong, please try again.");
        }
      } else {
        setGeneralError("Something went wrong, please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-page-container">
      <div className="login-card" role="region" aria-label="Sign In">
        <h1 className="login-title">Sign in to your account</h1>
        <p className="login-subtitle">
          Equipment Inventory &amp; Borrowing System
        </p>

        {sessionExpiredMessage && (
          <div
            role="alert"
            className="alert-banner alert-warning"
            data-testid="session-expired-alert"
          >
            {sessionExpiredMessage}
          </div>
        )}

        {generalError && (
          <div
            role="alert"
            className="alert-banner alert-error"
            data-testid="login-error-alert"
          >
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="login-form">
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
              className={`form-input ${fieldErrors.username ? "input-error" : ""}`}
              aria-invalid={!!fieldErrors.username}
              aria-describedby={fieldErrors.username ? "username-error" : undefined}
            />
            {fieldErrors.username && (
              <span id="username-error" className="field-error-text" role="alert">
                {fieldErrors.username.join(", ")}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              className={`form-input ${fieldErrors.password ? "input-error" : ""}`}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? "password-error" : undefined}
            />
            {fieldErrors.password && (
              <span id="password-error" className="field-error-text" role="alert">
                {fieldErrors.password.join(", ")}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary btn-block"
            data-testid="login-submit-button"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
