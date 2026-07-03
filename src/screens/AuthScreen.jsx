import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PawseWindow from "../components/PawseWindow";
import { useAuth } from "../lib/useAuth";
import "./AuthScreen.css";

export default function AuthScreen() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function switchMode(newMode) {
    setMode(newMode);
    setError("");
    setMessage("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setError("");
    setMessage("");

    if (mode === "signup") {
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords don't match. Try again?");
        return;
      }
    }

    setSubmitting(true);

    try {
      if (mode === "login") {
        await signIn(email.trim(), password);
        navigate("/home", { replace: true });
      } else {
        const result = await signUp(email.trim(), password);
        if (!result?.session) {
          setMessage("Account created! Check your email to confirm, then log in.");
          switchMode("login");
        }
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Try again?");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PawseWindow title="Pawse" icon="🐾">
      <div className="auth-layout">
        <p className="auth-greeting">welcome to pawse!</p>

        <div className="pawse-inner-card auth-card">
          <h2 className="auth-mode-title">
            {mode === "login" ? "log in" : "sign up"}
          </h2>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-fields">
              <div className="auth-field">
                <label className="auth-label" htmlFor="auth-email">
                  email
                </label>
                <input
                  id="auth-email"
                  className="auth-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="kitty@pawse.app"
                  required
                />
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="auth-password">
                  password
                </label>
                <input
                  id="auth-password"
                  className="auth-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder={mode === "signup" ? "min. 6 characters" : "••••••"}
                  minLength={6}
                  required
                />
              </div>

              {mode === "signup" && (
                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-confirm-password">
                    confirm password
                  </label>
                  <input
                    id="auth-confirm-password"
                    className="auth-input"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="••••••"
                    required
                  />
                </div>
              )}
            </div>

            {error && (
              <div className="auth-feedback auth-error">
                <span className="auth-feedback-icon">!</span>
                {error}
              </div>
            )}
            {message && (
              <div className="auth-feedback auth-message">
                <span className="auth-feedback-icon">✓</span>
                {message}
              </div>
            )}

            <div className="auth-actions">
              <button
                type="submit"
                className="auth-submit-btn"
                disabled={submitting}
              >
                {submitting
                  ? "..."
                  : mode === "login"
                  ? "log in"
                  : "create account"}
              </button>

              {mode === "login" ? (
                <button
                  type="button"
                  className="auth-secondary-btn"
                  onClick={() => switchMode("signup")}
                  disabled={submitting}
                >
                  sign up
                </button>
              ) : (
                <button
                  type="button"
                  className="auth-secondary-btn"
                  onClick={() => switchMode("login")}
                  disabled={submitting}
                >
                  log in
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </PawseWindow>
  );
}
