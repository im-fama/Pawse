import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PawseWindow from "../components/PawseWindow";
import { useAuth } from "../lib/useAuth";
import { setUsername as setUsernameOnAccount } from "../lib/profiles";
import { getSavedAccounts, removeSavedAccount } from "../lib/savedAccounts";
import "../styles/AuthScreen.css";

function suggestUsernameFromEmail(email) {
  const local = email.split("@")[0] || "";
  return local.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
}

export default function AuthScreen() {
  const navigate = useNavigate();
  const { user, hasProfile, signIn, signInWithUsername, signUp, refreshProfile } = useAuth();

  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [loginMethod, setLoginMethod] = useState("email"); // "email" | "username"

  const [email, setEmail] = useState("");
  const [usernameLogin, setUsernameLogin] = useState(""); // username for login
  const [username, setUsername] = useState(""); // username for signup
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [savedAccounts, setSavedAccounts] = useState(() => getSavedAccounts());
  const [selectedAccount, setSelectedAccount] = useState(null);

  function selectAccount(account) {
    setSelectedAccount(account);
    setError("");
    setMessage("");
    setPassword("");
    setShowPassword(false);
  }

  function useAnotherAccount() {
    setSelectedAccount(null);
    setError("");
    setPassword("");
  }

  function handleRemoveSavedAccount(event, email) {
    event.stopPropagation();
    removeSavedAccount(email);
    setSavedAccounts(getSavedAccounts());
    if (selectedAccount?.email === email) {
      setSelectedAccount(null);
    }
  }

  async function handleSavedAccountSubmit(event) {
    event.preventDefault();
    if (submitting || !selectedAccount) return;

    setError("");
    setSubmitting(true);
    try {
      await signIn(selectedAccount.email, password);
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err.message || "Something went wrong. Try again?");
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(newMode) {
    setMode(newMode);
    setError("");
    setMessage("");
    setEmail("");
    setUsernameLogin("");
    setUsername("");
    setUsernameTouched(false);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setSelectedAccount(null);
  }

  function switchLoginMethod(method) {
    setLoginMethod(method);
    setError("");
    setEmail("");
    setUsernameLogin("");
    setPassword("");
    setShowPassword(false);
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
        if (loginMethod === "username") {
          await signInWithUsername(usernameLogin.trim(), password);
        } else {
          await signIn(email.trim(), password);
        }
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

  // Logged in (e.g. via Google) but no username yet.
  async function handleUsernameSetup(event) {
    event.preventDefault();
    if (submitting) return;
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError("Username is required.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await setUsernameOnAccount(user.id, cleanUsername);
      await refreshProfile();
    } catch (err) {
      setError(
        err.message?.includes("unique") || err.message?.includes("duplicate")
          ? "Username is already taken. Try another?"
          : err.message || "Failed to set username. Try again?"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (user && !hasProfile) {
    return (
      <PawseWindow hideHomeBtn hideSignOutBtn>
        <div className="auth-layout">
          <p className="auth-greeting">almost there!</p>

          <div className="pawse-inner-card auth-card">
            <h2 className="auth-mode-title">choose a username</h2>

            <form className="auth-form" onSubmit={handleUsernameSetup} noValidate>
              <div className="auth-fields">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="setup-username">
                    username
                  </label>
                  <input
                    id="setup-username"
                    className="auth-input"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="choose a name"
                    maxLength={20}
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="auth-feedback auth-error">
                  <span className="auth-feedback-icon">!</span>
                  {error}
                </div>
              )}

              <div className="auth-actions">
                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={submitting || !username.trim()}
                >
                  {submitting ? "..." : "let's go!"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </PawseWindow>
    );
  }

  if (mode === "login" && selectedAccount) {
    return (
      <PawseWindow title="Pawse" icon="🐾">
        <div className="auth-layout">
          <p className="auth-greeting">welcome back!</p>

          <div className="pawse-inner-card auth-card">
            <h2 className="auth-mode-title">log in</h2>

            <div className="saved-account-active">
              <div className="saved-account-avatar">
                {selectedAccount.username?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="saved-account-active-info">
                <span className="saved-account-active-name">
                  {selectedAccount.username || selectedAccount.email}
                </span>
                <button
                  type="button"
                  className="saved-account-switch-btn"
                  onClick={useAnotherAccount}
                >
                  not you? use another account
                </button>
              </div>
            </div>

            <form className="auth-form" onSubmit={handleSavedAccountSubmit} noValidate>
              <div className="auth-fields">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="saved-account-password">
                    password
                  </label>
                  <div className="auth-input-wrap">
                    <input
                      id="saved-account-password"
                      className="auth-input"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      placeholder="••••••"
                      autoFocus
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
              </div>

              {error && (
                <div className="auth-feedback auth-error">
                  <span className="auth-feedback-icon">!</span>
                  {error}
                </div>
              )}

              <div className="auth-actions">
                <button type="submit" className="auth-submit-btn" disabled={submitting}>
                  {submitting ? "..." : "log in"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </PawseWindow>
    );
  }

  return (
    <PawseWindow title="Pawse" icon="🐾">
      <div className="auth-layout">
        <p className="auth-greeting">welcome to pawse!</p>

        <div className="pawse-inner-card auth-card">
          <h2 className="auth-mode-title">
            {mode === "login" ? "log in" : "sign up"}
          </h2>

          {/* Saved accounts — pick one to skip straight to the password field */}
          {mode === "login" && savedAccounts.length > 0 && (
            <div className="saved-accounts-list">
              {savedAccounts.map((account) => (
                <button
                  type="button"
                  key={account.email}
                  className="saved-account-row"
                  onClick={() => selectAccount(account)}
                >
                  <span className="saved-account-avatar">
                    {account.username?.[0]?.toUpperCase() || "?"}
                  </span>
                  <span className="saved-account-name">
                    {account.username || account.email}
                  </span>
                  <span
                    className="saved-account-remove-btn"
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${account.username || account.email}`}
                    onClick={(e) => handleRemoveSavedAccount(e, account.email)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleRemoveSavedAccount(e, account.email);
                      }
                    }}
                  >
                    ×
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Login method toggle — only shown on login screen */}
          {mode === "login" && (
            <div className="auth-method-toggle">
              <button
                type="button"
                className={`auth-method-btn ${loginMethod === "email" ? "active" : ""}`}
                onClick={() => switchLoginMethod("email")}
              >
                email
              </button>
              <button
                type="button"
                className={`auth-method-btn ${loginMethod === "username" ? "active" : ""}`}
                onClick={() => switchLoginMethod("username")}
              >
                username
              </button>
            </div>
          )}

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
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setUsernameTouched(e.target.value.trim().length > 0);
                    }}
                    placeholder="kitty_friend"
                    required
                  />
                </div>
              )}

              {/* Email OR username login field */}
              {mode === "login" && loginMethod === "username" ? (
                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-username-login">
                    username
                  </label>
                  <input
                    id="auth-username-login"
                    className="auth-input"
                    type="text"
                    value={usernameLogin}
                    onChange={(e) => setUsernameLogin(e.target.value)}
                    autoComplete="username"
                    placeholder="kitty_friend"
                    required
                  />
                </div>
              ) : (
                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-email">
                    email
                  </label>
                  <input
                    id="auth-email"
                    className="auth-input"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEmail(value);
                      if (mode === "signup" && !usernameTouched) {
                        setUsername(suggestUsernameFromEmail(value));
                      }
                    }}
                    autoComplete="email"
                    placeholder="kitty@pawse.app"
                    required
                  />
                </div>
              )}

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
            </div>
          </form>
        </div>
      </div>
    </PawseWindow>
  );
}