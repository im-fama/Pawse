import { useNavigate } from "react-router-dom";
import PawseWindow from "../components/PawseWindow";
import "./HomeScreen.css";

export default function HomeScreen({ daysApart = 0 }) {
  const navigate = useNavigate();

  let petImage = "/pet-moods/state1.png";
  let subMessage = "ready to check in today?";

  if (daysApart >= 6) {
    petImage = "/pet-moods/state3.png";
    subMessage = "kitty was so lonely... please don't leave again!";
  } else if (daysApart >= 3) {
    petImage = "/pet-moods/state2.png";
    subMessage = "kitty missed you a lot and is sad.";
  } else if (daysApart >= 0) {
    petImage = "/pet-moods/state1.png";
    subMessage = "kitty has been waiting for you...";
 }

  return (
    <PawseWindow title="Pawse" icon="🐾">
      <div className="home-layout">
        <p className="home-greeting">kitty is happy to have you back!</p>
        <div className="pawse-inner-card home-inner-card">
          <img
            src={petImage}
            alt="Kitty welcomes you back"
            className="home-pet-image"
            draggable={false}
          />
          <p className="home-sub-message">{subMessage}</p>
          <button className="home-start-btn" onClick={() => navigate("/carousel")}>
            Start
          </button>
        </div>
      </div>
    </PawseWindow>
  );
}