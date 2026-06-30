import { useNavigate } from "react-router-dom";
import PawseWindow from "../components/PawseWindow";
import "./HomeScreen.css";

export default function HomeScreen({ daysApart = 0 }) {
  const navigate = useNavigate();

  // Determine pet image state and greeting based on how many days the user was away
  let petImage = "/pet-moods/state1.png";
  let greeting = "kitty is happy to have you back!";

  if (daysApart >= 10) {
    petImage = "/pet-moods/state4.png";
    greeting = "kitty was so lonely... please don't leave again!";
  } else if (daysApart >= 5) {
    petImage = "/pet-moods/state3.png";
    greeting = "kitty missed you a lot and is sad.";
  } else if (daysApart >= 2) {
    petImage = "/pet-moods/state2.png";
    greeting = "kitty has been waiting for you...";
  }

  return (
    <PawseWindow title="Pawse" icon="🐾">
      <div className="home-layout">
        <p className="home-greeting">{greeting}</p>
        <div className="pawse-inner-card home-inner-card">
          <img
            src={petImage}
            alt="Kitty welcomes you back"
            className="home-pet-image"
            draggable={false}
          />
          <button className="home-start-btn" onClick={() => navigate("/carousel")}>
            Start
          </button>
        </div>
      </div>
    </PawseWindow>
  );
}
