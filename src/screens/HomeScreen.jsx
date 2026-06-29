import { useNavigate } from "react-router-dom";
import PawseWindow from "../components/PawseWindow";
import "./HomeScreen.css";

// The first screen a logged-in user sees. Greets them with the welcome message
// and the strawberry cat image, and a Start button to begin.
export default function HomeScreen() {
  const navigate = useNavigate();

  return (
    <PawseWindow title="Pawse" icon="🐾">
      <p className="home-greeting">kitty is happy to have you back!</p>
      <div className="home-pet-frame">
        <img
          src="/pet-moods/image.png"
          alt="Kitty welcomes you back"
          className="home-pet-image"
          draggable={false}
        />
      </div>
      <button className="home-start-btn" onClick={() => navigate("/carousel")}>
        Start
      </button>
    </PawseWindow>
  );
}

