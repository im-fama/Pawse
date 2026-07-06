import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import PawseWindow from "../components/PawseWindow";
import PetImage from "../components/PetImage";
import { getMoodById } from "../data/moods";
import { getSupportMessage } from "../data/supportMessages";
import { deleteMoodLogNote, fetchMoodLogById, updateMoodLogNote } from "../logic/moodLogs";
import "./MessageScreen.css";

export default function MessageScreen({ userId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { moodId } = useParams();
  const mood = getMoodById(moodId) || getMoodById("happy");
  const logId = location.state?.logId;

  const [message] = useState(() => getSupportMessage(mood.id));
  const [note, setNote] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [hasNote, setHasNote] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadExistingNote() {
      if (!logId || !userId) return;

      try {
        const existingLog = await fetchMoodLogById(logId, userId);
        if (!cancelled) {
          setSavedNote(existingLog?.note ?? "");
          setHasNote(Boolean(existingLog?.note));
          setNote("");
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setStatusMessage("Couldn't load your note right now.");
        }
      }
    }

    loadExistingNote();

    return () => {
      cancelled = true;
    };
  }, [logId, userId]);

  async function handleSaveNote() {
    if (saving) return;
    if (!logId) {
      setStatusMessage("Unable to save note: missing log reference.");
      return;
    }

    const trimmedNote = note.trim();
    if (!trimmedNote) {
      await handleDeleteNote();
      return;
    }

    setSaving(true);
    setStatusMessage("");

    try {
      await updateMoodLogNote(logId, trimmedNote, userId);
      setSavedNote(trimmedNote);
      setHasNote(true);
      setNote("");
      setStatusMessage("Note saved.");
    } catch (err) {
      console.error(err);
      setStatusMessage("Couldn't save note right now. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteNote() {
    if (saving) return;
    if (!logId) {
      setStatusMessage("Unable to delete note: missing log reference.");
      return;
    }

    setSaving(true);
    setStatusMessage("");

    try {
      await deleteMoodLogNote(logId, userId);
      setSavedNote("");
      setHasNote(false);
      setNote("");
      setStatusMessage("Note deleted.");
    } catch (err) {
      console.error(err);
      setStatusMessage("Couldn't delete note right now. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleEditNote() {
    setNote(savedNote);
    setHasNote(false);
    setStatusMessage("");
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
          {!hasNote ? (
            <>
              <label className="message-note-label" htmlFor="mood-note">
                dump your feelings here:
              </label>
              <textarea
                id="mood-note"
                className="message-note-input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What are you feeling or thinking?"
                rows={4}
              />
              <div className="message-note-actions">
                <button
                  type="button"
                  className="message-note-save-btn"
                  onClick={handleSaveNote}
                  disabled={saving}
                >
                  {saving ? "saving…" : "save note"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="message-note-saved-row" />
              <div className="message-note-actions">
                <button
                  type="button"
                  className="message-note-edit-btn"
                  onClick={handleEditNote}
                  disabled={saving}
                  aria-label="Edit note"
                >
                  edit
                </button>
                <button
                  type="button"
                  className="message-note-delete-btn"
                  onClick={handleDeleteNote}
                  disabled={saving}
                  aria-label="Delete note"
                >
                  delete
                </button>
              </div>
            </>
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
