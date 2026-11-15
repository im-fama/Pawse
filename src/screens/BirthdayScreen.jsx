import { useState } from "react";
import { BIRTHDAY } from "../data/birthday";
import { markBirthdaySeen } from "../lib/birthday";
import "../styles/BirthdayScreen.css";

const CONFETTI_COLORS = ["#F0DECA", "#E4C6AC", "#A9836C", "#F2B6B6", "#F6D98B", "#ffffff"];

// Generated once when the module loads, so renders stay pure.
const CONFETTI = Array.from({ length: 46 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  delay: Math.random() * 0.6,
  duration: 2.4 + Math.random() * 2.2,
  drift: (Math.random() - 0.5) * 120,
  spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540),
  size: 5 + Math.round(Math.random() * 5),
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  paw: i % 9 === 0,
}));

function Confetti() {
  return (
    <div className="bday-confetti" aria-hidden="true">
      {CONFETTI.map((p) => (
        <span
          key={p.id}
          className={`bday-confetti-piece ${p.paw ? "paw" : ""}`}
          style={{
            left: `${p.left}%`,
            width: p.paw ? 14 : p.size,
            height: p.paw ? 14 : p.size * 1.6,
            background: p.paw ? undefined : p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            "--drift": `${p.drift}px`,
            "--spin": `${p.spin}deg`,
          }}
        />
      ))}
    </div>
  );
}

export default function BirthdayScreen({ onDone }) {
  const [opened, setOpened] = useState(false);
  const title = BIRTHDAY.name ? `happy birthday, ${BIRTHDAY.name}!` : "happy birthday!";
  const paragraphs = (BIRTHDAY.message || "").split(/\n\s*\n/).filter(Boolean);

  function finish() {
    markBirthdaySeen();
    onDone?.();
  }

  return (
    <div className="pawse-window bday-window">
      <div className="pawse-titlebar">
        <div className="pawse-titlebar-left">
          <span className="pawse-titlebar-label">pawse</span>
        </div>
      </div>

      <div className="pawse-content">
        <div className="pawse-inner-card bday-card">
          {!opened ? (
            <button
              type="button"
              className="bday-gift-stage"
              onClick={() => setOpened(true)}
              aria-label="Open your gift"
            >
              <p className="bday-teaser">a little something for you...</p>
              <div className="bday-gift" aria-hidden="true">
                <div className="bday-gift-lid">
                  <span className="bday-gift-bow left" />
                  <span className="bday-gift-bow right" />
                </div>
                <div className="bday-gift-box" />
              </div>
              <span className="bday-tap-hint">tap to open</span>
            </button>
          ) : (
            <div className="bday-reveal">
              <Confetti />
              <div className="bday-gift-burst" aria-hidden="true">
                <div className="bday-gift-lid flying">
                  <span className="bday-gift-bow left" />
                  <span className="bday-gift-bow right" />
                </div>
              </div>

              <h1 className="bday-title" aria-label={title}>
                {[...title].map((ch, i) => (
                  <span
                    key={i}
                    className="bday-title-letter"
                    style={{ animationDelay: `${0.25 + i * 0.045}s` }}
                    aria-hidden="true"
                  >
                    {ch === " " ? " " : ch}
                  </span>
                ))}
              </h1>

              <div className="bday-cats" aria-hidden="true">
                <img src="/pet-moods/excited.png" alt="" className="bday-cat side left" />
                <img src="/pet-moods/overjoyed.png" alt="" className="bday-cat hero" />
                <img src="/pet-moods/in_love.png" alt="" className="bday-cat side right" />
              </div>

              <div className="bday-note">
                {paragraphs.map((text, i) => (
                  <p key={i}>{text}</p>
                ))}
                {BIRTHDAY.from && <p className="bday-from">{BIRTHDAY.from}</p>}
              </div>

              <button type="button" className="bday-continue-btn" onClick={finish}>
                open pawse
                <img src="/icons/paw.png" alt="" className="bday-continue-paw" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
