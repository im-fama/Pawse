import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PawseWindow from "../components/PawseWindow";
import "./HomeScreen.css";

export default function HomeScreen({ daysApart = 0 }) {
  const navigate = useNavigate();
  const [reaction, setReaction] = useState("idle");
  const [reactionMessage, setReactionMessage] = useState("");

  useEffect(() => {
    if (!reactionMessage) return;

    const timer = window.setTimeout(() => {
      setReactionMessage("");
      setReaction("idle");
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [reactionMessage]);

  let petImage = "/pet-moods/state1.png";
  let subMessage = "ready to check in today?";
  let stateLabel = "calm";

  if (daysApart >= 6) {
    petImage = "/pet-moods/state3.png";
    subMessage = "kitty feels so heartbroken and alone right now..."
    stateLabel = "very sad";
  } else if (daysApart >= 3) {
    petImage = "/pet-moods/state2.png";
    subMessage = "kitty is upset with you for leaving it alone so long.";
    stateLabel = "upset";
  } else if (daysApart >= 0) {
    petImage = "/pet-moods/state1.png";
    subMessage = "kitty has been waiting for you...";
    stateLabel = "gentle";
  }

  function handlePetTap() {
    const nextReaction = reaction === "curious" ? "happy" : "curious";
    const messages = {
      curious: stateLabel === "upset"
        ? "you really left me waiting..."
        : stateLabel === "very sad"
        ? "please don't leave me like this"
        : "hmm? you touched me!",
      happy: stateLabel === "upset"
        ? "i still want your love"
        : stateLabel === "very sad"
        ? "i need you close" 
        : "you make me feel so loved!",
    };

    setReaction(nextReaction);
    setReactionMessage(messages[nextReaction]);
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
              className={`home-pet-image ${reaction !== "idle" ? "home-pet-image-reacting" : ""}`}
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