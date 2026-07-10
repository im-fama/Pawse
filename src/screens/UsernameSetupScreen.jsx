import { useState } from "react";
import PawseWindow from "../components/PawseWindow";
import { useAuth } from "../lib/useAuth";
import { createProfile } from "../lib/profiles";
import "./UsernameSetupScreen.css";

export default function UsernameSetupScreen() {
  const { user, refreshProfile } = useAuth();
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername) return;

    setError("");
    setSubmitting(true);
    try {
      await createProfile(user.id, cleanUsername);
      await refreshProfile();
    } catch (err) {
      console.error(err);
      setError(
        err.message?.includes("unique") || err.message?.includes("duplicate")
          ? "Username is already taken. Try another?"
          : err.message || "Failed to set username. Try again?"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PawseWindow hideHomeBtn hideSignOutBtn>
      <div className="username-setup-layout">
        <p className="username-setup-greeting">almost there!</p>
        <div className="pawse-inner-card username-setup-card">
          <h2 className="username-setup-title">choose a username</h2>
          <form className="username-setup-form" onSubmit={handleSubmit} noValidate>
            <div className="username-setup-field">
              <label className="username-setup-label" htmlFor="setup-username">
                username
              </label>
              <input
                id="setup-username"
                className="username-setup-input"
                type="text"
                placeholder="choose a name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
                required
              />
            </div>
            {error && (
              <div className="username-setup-feedback username-setup-error">
                <span className="username-setup-feedback-icon">!</span>
                {error}
              </div>
            )}
            <button
              type="submit"
              className="username-setup-submit-btn"
              disabled={submitting || !username.trim()}
            >
              {submitting ? "..." : "let's go!"}
            </button>
          </form>
        </div>
      </div>
    </PawseWindow>
  );
}
