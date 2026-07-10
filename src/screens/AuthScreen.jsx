import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PawseWindow from "../components/PawseWindow";
import { useAuth } from "../lib/useAuth";
import "./AuthScreen.css";

export default function AuthScreen() {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function switchMode(newMode) {
    setMode(newMode);
    setError("");
    setMessage("");
    setEmail("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setError("");
    setMessage("");

    if (mode === "signup") {
      if (!username.trim()) {
        setError("Username is required.");
        return;
      }
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
        const result = await signUp(email.trim(), password, username.trim());
        if (!result?.session) {
          setMessage("Account created! Check your email to confirm, then log in.");
          switchMode("login");
        } else {
          navigate("/home", { replace: true });
        }
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Try again?");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      await signInWithGoogle();
      // Supabase will redirect, so no navigate needed here
    } catch (err) {
      setError(err.message || "Google sign-in failed. Try again?");
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
              {mode === "signup" && (
                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-username">
                    username
                  </label>
                  <input
                    id="auth-username"
                    className="auth-input"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="kitty_friend"
                    required
                  />
                </div>
              )}

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
                <div className="auth-input-wrap">
                  <input
                    id="auth-password"
                    className="auth-input"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    placeholder={mode === "signup" ? "min. 6 characters" : "••••••"}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <img
                      src={showPassword ? "/icons/close_eye.png" : "/icons/open_eye.png"}
                      alt=""
                      className="auth-eye-icon"
                    />
                  </button>
                </div>
              </div>

              {mode === "signup" && (
                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-confirm-password">
                    confirm password
                  </label>
                  <div className="auth-input-wrap">
                    <input
                      id="auth-confirm-password"
                      className="auth-input"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder="••••••"
                      required
                    />
                    <button
                      type="button"
                      className="auth-eye-btn"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      <img
                        src={showConfirmPassword ? "/icons/close_eye.png" : "/icons/open_eye.png"}
                        alt=""
                        className="auth-eye-icon"
                      />
                    </button>
                  </div>
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

              <div className="auth-divider">
                <span className="auth-divider-line" />
                <span className="auth-divider-text">or</span>
                <span className="auth-divider-line" />
              </div>

              <button
                id="auth-google-btn"
                type="button"
                className="auth-google-btn"
                onClick={handleGoogleSignIn}
                disabled={submitting}
              >
                <svg className="auth-google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                sign in with google
              </button>
            </div>
          </form>
        </div>
      </div>
    </PawseWindow>
  );
}
