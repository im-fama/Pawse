import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import PawseWindow from "../components/PawseWindow";
import PetImage from "../components/PetImage";
import { getMoodById } from "../data/moods";
import { getSupportMessage } from "../data/supportMessages";
import { updateMoodLogNote } from "../logic/moodLogs";
import "./MessageScreen.css";

export default function MessageScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { moodId } = useParams();
  const mood = getMoodById(moodId) || getMoodById("happy");
  const logId = location.state?.logId;

  const [message] = useState(() => getSupportMessage(mood.id));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);

  async function handleSaveNote() {
    if (saving) return;
    if (!logId) {
      setStatusMessage("Unable to save note: missing log reference.");
      return;
    }

    setSaving(true);
    setStatusMessage("");

    try {
      await updateMoodLogNote(logId, note);
      setNote("");
      setNoteSaved(true);
      setStatusMessage("Note saved.");
    } catch (err) {
      console.error(err);
      setStatusMessage("Couldn't save note right now. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PawseWindow
      title="mood log"
      onTitleClick={() => navigate("/mood-log")}
      onBack={() => navigate("/carousel")}
    >
      <div className="pawse-inner-card message-inner-card">
        <div className="message-bubble-custom">
          <p className="message-text-custom">{message}</p>
        </div>

        <div className="message-note-section">
          {!noteSaved ? (
            <> 
              <label className="message-note-label" htmlFor="mood-note">
                dumb your feelings here:
              </label>
              <textarea
                id="mood-note"
                className="message-note-input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What are you feeling or thinking?"
                rows={4}
              />
              <button
                className="message-note-save-btn"
                onClick={handleSaveNote}
                disabled={saving}
              >
                {saving ? "saving…" : "save note"}
              </button>
            </>
          ) : (
            <p className="message-note-saved">Note saved.</p>
          )}
          {statusMessage && (
            <p className="message-note-status">{statusMessage}</p>
          )}
        </div>

        <div
          className="message-pet-frame-custom"
          onClick={() => navigate("/home")}
        >
          <PetImage
            mood={mood}
            alt={`${mood.label} kitty`}
            className="message-pet-image-custom"
          />
        </div>

        <p className="message-hint-click">tap kitty to go home</p>
      </div>
    </PawseWindow>
  );
}
