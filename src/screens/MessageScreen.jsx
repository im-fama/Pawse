import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import PawseWindow from "../components/PawseWindow";
import PetImage from "../components/PetImage";
import { getMoodById } from "../data/moods";
import { FALLBACK_SUPPORT_MESSAGE } from "../data/supportMessages";
import { generateSupportMessage } from "../logic/groq";
import { deleteMoodLogNote, fetchMoodLogById, updateMoodLogNote } from "../logic/moodLogs";
import "../styles/MessageScreen.css";

export default function MessageScreen({ userId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { moodId } = useParams();
  const mood = getMoodById(moodId, userId) || getMoodById("happy"); const logId = location.state?.logId;

  const [message, setMessage] = useState("");
  const [loadingMessage, setLoadingMessage] = useState(true);
  const [note, setNote] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [hasNote, setHasNote] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadSupportMessage() {
      try {
        setLoadingMessage(true);
        const aiMessage = await generateSupportMessage(mood.label.toLowerCase());
        if (!cancelled) {
          setMessage(aiMessage);
          setLoadingMessage(false);
        }
      } catch (err) {
        console.warn("AI support message generation failed, falling back:", err);
        if (!cancelled) {
        setMessage(FALLBACK_SUPPORT_MESSAGE);
          setLoadingMessage(false);
        }
      }
    }
    loadSupportMessage();
    return () => {
      cancelled = true;
    };
  }, [mood]);

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
    >
      <div className="pawse-inner-card message-inner-card">
        <div className="message-bubble-custom">
          <p className="message-text-custom">
            {loadingMessage ? "generating comforting message..." : message}
          </p>
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
      </div>
    </PawseWindow>
  );
}
