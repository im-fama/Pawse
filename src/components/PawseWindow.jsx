
import { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { onCloseMouseDown } from "../lib/windowControls";
import { AuthContext } from "../lib/AuthContextObject";
import "./PawseWindow.css";

export default function PawseWindow({
  children,
  footer,
  onBack,
  hideHomeBtn,
  hideSignOutBtn,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  // Read auth context directly (null-safe: defaults to null if outside AuthProvider)
  const auth = useContext(AuthContext);
  const user = auth?.user ?? null;

  function handleHome() {
    navigate("/home");
  }

  async function handleSignOut() {
    try {
      await auth?.signOut?.();
    } catch (e) {
      console.error("Sign out error:", e);
    }
  }

  return (
    <div className="pawse-window">
      <div className="pawse-titlebar">
        <div className="pawse-titlebar-left">
          {user ? (
            <>
              <button
                type="button"
                className={`pawse-titlebar-btn titlebar-nav-btn ${
                  location.pathname === "/mood-log" ? "active" : ""
                }`}
                onClick={() => navigate("/mood-log")}
              >
                mood log
              </button>
              <button
                type="button"
                className={`pawse-titlebar-btn titlebar-nav-btn ${
                  location.pathname === "/chat" ? "active" : ""
                }`}
                onClick={() => navigate("/chat")}
              >
                chat
              </button>
            </>
          ) : (
            <span className="pawse-titlebar-label">
              pawse
            </span>
          )}
        </div>

        <div className="pawse-titlebar-controls">
          {/* Home button — only shown when logged in */}
          {user && !hideHomeBtn && (
            <button
              type="button"
              className="pawse-titlebar-control-btn home-btn"
              aria-label="Go home"
              title="Home"
              onClick={handleHome}
            >
            <img src="/icons/home.png" alt="Home" className="pawse-titlebar-control-img" />
            </button>
          )}

          {/* Sign-out button — only shown when logged in */}
          {user && !hideSignOutBtn && (
            <button
              type="button"
              className="pawse-titlebar-control-btn signout-btn"
              aria-label="Sign out"
              title="Sign out"
              onClick={handleSignOut}
            >
            <img src="/icons/signout.png" alt="Sign out" className="pawse-titlebar-control-img" />
            </button>
          )}

          {/* Close — always visible */}
          <button
            type="button"
            className="pawse-titlebar-control-btn close-btn"
            aria-label="Close"
            onMouseDown={onCloseMouseDown}
          >
            &times;
          </button>
        </div>
      </div>

      {onBack && (
        <button type="button" className="pawse-back-btn" onClick={onBack} aria-label="Go back">
          &larr;
        </button>
      )}

      <div className="pawse-content">{children}</div>
      {footer && <div className="pawse-footer">{footer}</div>}
    </div>
  );
}
