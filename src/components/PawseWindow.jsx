import { useNavigate } from "react-router-dom";
import "./PawseWindow.css";

// Shared window chrome used by every Pawse screen: the espresso outer
// frame, the titlebar with a label + minimize/close dots, and a cream
// content area for the screen's actual content.
//
// `title` text sits left-aligned in the titlebar. Can be styled as a clickable
// button (e.g. "mood log") if `onTitleClick` is provided, matching the Figma screen.
export default function PawseWindow({ title, icon, children, footer, onTitleClick }) {
  const navigate = useNavigate();

  return (
    <div className="pawse-window">
      <div className="pawse-titlebar">
        {onTitleClick ? (
          <button className="pawse-titlebar-btn" onClick={onTitleClick}>
            {icon && <span className="pawse-titlebar-icon">{icon}</span>}
            {title}
          </button>
        ) : (
          <span className="pawse-titlebar-label">
            {icon && <span className="pawse-titlebar-icon">{icon}</span>}
            {title}
          </span>
        )}
        <span className="pawse-titlebar-controls">
          <button
            className="pawse-titlebar-control-btn"
            aria-label="Minimize"
            onClick={() => navigate("/home")}
          >
            &minus;
          </button>
          <button
            className="pawse-titlebar-control-btn close-btn"
            aria-label="Close"
            onClick={() => navigate("/home")}
          >
            &times;
          </button>
        </span>
      </div>
      <div className="pawse-content">{children}</div>
      {footer && <div className="pawse-footer">{footer}</div>}
    </div>
  );
}

