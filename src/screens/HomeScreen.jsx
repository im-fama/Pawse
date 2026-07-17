import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PawseWindow from "../components/PawseWindow";
import "../styles/HomeScreen.css";

// Per-state message pools. Each tap picks a random one that wasn't shown last.
const TAP_MESSAGES = {
  gentle: [
    "oh! you found me 🐾",
    "i was just thinking about you...",
    "hmm? you touched me!",
    "you make me feel so loved!",
    "stay a little longer, okay?",
    "i've been saving this purr for you",
    "you smell like warmth and home",
    "please do that again",
    "i see you. hi. hi. hi.",
    "paw bumps accepted 🐱",
  ],
  upset: [
    "you really left me waiting...",
    "i still want your love",
    "do you know how long i sat here?",
    "i'm not mad. i'm just... a little sad.",
    "okay fine, i missed you a tiny bit",
    "please don't do that again",
    "i thought you forgot about me",
    "you could have texted",
  ],
  "very sad": [
    "please don't leave me like this",
    "i need you close",
    "i can't do this alone",
    "come back. please.",
    "i've been crying into the couch",
    "why did you go so long without me",
    "you're here now. that's what matters.",
    "just hold me for a second",
  ],
};

export default function HomeScreen({ daysApart = 0 }) {
  const navigate = useNavigate();
  const [reactionMessage, setReactionMessage] = useState("");
  const lastMessageRef = useRef("");

  useEffect(() => {
    if (!reactionMessage) return;
    const timer = window.setTimeout(() => setReactionMessage(""), 2000);
    return () => window.clearTimeout(timer);
  }, [reactionMessage]);

  let petImage = "/pet-moods/state1.png";
  let subMessage = "ready to check in today?";
  let stateLabel = "gentle";

  if (daysApart >= 6) {
    petImage = "/pet-moods/state3.png";
    subMessage = "kitty feels so heartbroken and alone right now...";
    stateLabel = "very sad";
  } else if (daysApart >= 3) {
    petImage = "/pet-moods/state2.png";
    subMessage = "kitty is upset with you for leaving it alone so long.";
    stateLabel = "upset";
  }

  function handlePetTap() {
    const pool = TAP_MESSAGES[stateLabel];
    // Pick a random message that is different from the last one shown
    const options = pool.filter((m) => m !== lastMessageRef.current);
    const picked = options[Math.floor(Math.random() * options.length)];
    lastMessageRef.current = picked;
    setReactionMessage(picked);
  }

  return (
    <PawseWindow
      title="mood log"
      onTitleClick={() => navigate("/mood-log")}
      icon="🐾"
    >
      <div className="home-layout">
        <p className="home-greeting">kitty is happy to have you back!</p>
        <div className="pawse-inner-card home-inner-card">
          <div className="home-pet-stack">
            {reactionMessage && (
              <div className="home-reaction-bubble">{reactionMessage}</div>
            )}
            <img
              src={petImage}
              alt="Kitty welcomes you back"
              className={`home-pet-image ${reactionMessage ? "home-pet-image-reacting" : ""}`}
              draggable={false}
              onClick={handlePetTap}
            />
          </div>
          <p className="home-sub-message">{subMessage}</p>
          <button className="home-start-btn" onClick={() => navigate("/carousel")}>
            Start
          </button>
        </div>
      </div>
    </PawseWindow>
  );
}