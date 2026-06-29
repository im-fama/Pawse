import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PawseWindow from "../components/PawseWindow";
import PetImage from "../components/PetImage";
import { getMoodById } from "../data/moods";
import { getSupportMessage } from "../data/supportMessages";
import "./MessageScreen.css";

export default function MessageScreen() {
  const navigate = useNavigate();
  const { moodId } = useParams();
  const mood = getMoodById(moodId) || getMoodById("happy");

  // Pick one random supportive message when the screen first mounts.
  // useState with an initializer ensures it stays stable on re-renders.
  const [message] = useState(() => getSupportMessage(mood.id));

  return (
    <PawseWindow
      title="mood log"
      onTitleClick={() => navigate("/mood-log")}
    >
      <div className="message-bubble-custom">
        <p className="message-text-custom">{message}</p>
      </div>

      <div className="message-pet-frame-custom" onClick={() => navigate("/home")}>
        <PetImage
          mood={mood}
          alt={`${mood.label} kitty`}
          className="message-pet-image-custom"
        />
      </div>

      <p className="message-hint-click">tap kitty to go home</p>
    </PawseWindow>
  );
}
