import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PawseWindow from "../components/PawseWindow";
import PetImage from "../components/PetImage";
import { MOODS } from "../data/moods";
import { logMood } from "../logic/petState";
import "./MoodCarouselScreen.css";

export default function MoodCarouselScreen({ daysApart, onMoodLogged }) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const mood = MOODS[index];

  function goPrev() {
    setIndex((i) => (i - 1 + MOODS.length) % MOODS.length);
  }

  function goNext() {
    setIndex((i) => (i + 1) % MOODS.length);
  }

  async function handleSelect() {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      // Log the selected mood in local storage / db
      await logMood(null, mood.id);
      if (onMoodLogged) onMoodLogged(mood.id);
      navigate(`/message/${mood.id}`);
    } catch (err) {
      setError("Couldn't save that, try again?");
      setSubmitting(false);
    }
  }

  return (
    <PawseWindow
      title="mood log"
      onTitleClick={() => navigate("/mood-log")}
    >
      <div className="carousel-inner-panel">
        <p className="carousel-question">how are you feeling?</p>

        <div className="carousel-row">
          <button
            className="carousel-arrow"
            onClick={goPrev}
            aria-label="Previous mood"
          >
            &lt;
          </button>

          <div className="carousel-pet-container">
            <PetImage mood={mood} className="carousel-pet-image" />
          </div>

          <button
            className="carousel-arrow"
            onClick={goNext}
            aria-label="Next mood"
          >
            &gt;
          </button>
        </div>

        <button
          className="carousel-select-btn"
          onClick={handleSelect}
          disabled={submitting}
          aria-label={`Select ${mood.label}`}
        >
          {mood.label.toLowerCase()}
        </button>

        <div className="carousel-mood-description-box">
          <p className="carousel-mood-description-text">{mood.message}</p>
        </div>
      </div>

      {error && <p className="carousel-error">{error}</p>}
    </PawseWindow>
  );
}

