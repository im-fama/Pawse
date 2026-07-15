import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PawseWindow from "../components/PawseWindow";
import PetImage from "../components/PetImage";
import { MOODS } from "../data/moods";
import { logMood } from "../logic/moodLogs";
import "../styles/MoodCarouselScreen.css";
import {
  getCustomMoods,
  saveCustomMood,
  deleteCustomMood,
  updateCustomMood,
  resizeImageFile,
  CUSTOM_MOOD_NAME_LIMIT,
  CUSTOM_MOOD_DESCRIPTION_LIMIT,
} from "../lib/customMoods";

export default function MoodCarouselScreen({ daysApart, userId, onMoodLogged }) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [customMoods, setCustomMoods] = useState([]);

  // Create / Edit mood popup state
  const [showCreateMood, setShowCreateMood] = useState(false);
  const [editingMoodId, setEditingMoodId] = useState(null); // null = creating new
  const [newMoodName, setNewMoodName] = useState("");
  const [newMoodDescription, setNewMoodDescription] = useState("");
  const [newMoodImage, setNewMoodImage] = useState(null);
  const [creatingMood, setCreatingMood] = useState(false);
  const [createMoodError, setCreateMoodError] = useState("");

  // Delete confirm state
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    setCustomMoods(getCustomMoods(userId));
  }, [userId]);

  const allMoods = useMemo(() => [...MOODS, ...customMoods], [customMoods]);

  const filteredMoods = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allMoods;
    return allMoods.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q)
    );
  }, [allMoods, searchQuery]);

  const mood = filteredMoods.length > 0 ? filteredMoods[index % filteredMoods.length] : null;
  const isCurrentMoodCustom = mood?.isCustom === true;

  function goPrev() {
    if (filteredMoods.length === 0) return;
    setIndex((i) => (i - 1 + filteredMoods.length) % filteredMoods.length);
    setConfirmDeleteId(null);
  }

  function goNext() {
    if (filteredMoods.length === 0) return;
    setIndex((i) => (i + 1) % filteredMoods.length);
    setConfirmDeleteId(null);
  }

  // Left/right arrow keys page the carousel, unless you're typing
  // somewhere (search box, create-mood form) or the popup is open.
  useEffect(() => {
    function handleKeyDown(e) {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (showCreateMood) return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredMoods.length, showCreateMood]);

  async function handleSelect() {
    if (submitting || !mood) return;
    setSubmitting(true);
    setError("");
    try {
      const data = await logMood(userId, mood.id);
      if (onMoodLogged) onMoodLogged(mood.id);
      navigate(`/message/${mood.id}`, { state: { logId: data?.id } });
    } catch (err) {
      setError("Couldn't save that, try again?");
      setSubmitting(false);
    }
  }

  function handleSearchKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!mood) return;
      const target = mood;
      setSearchQuery("");
      const fullIdx = allMoods.findIndex((m) => m.id === target.id);
      setIndex(fullIdx === -1 ? 0 : fullIdx);
    }
  }

  // ── Create mood popup ──────────────────────────────────────
  function openCreateMood() {
    setEditingMoodId(null);
    setNewMoodName("");
    setNewMoodDescription("");
    setNewMoodImage(null);
    setCreateMoodError("");
    setShowCreateMood(true);
  }

  // ── Edit mood popup ────────────────────────────────────────
  function openEditMood(moodObj) {
    setEditingMoodId(moodObj.id);
    setNewMoodName(moodObj.label);
    setNewMoodDescription(moodObj.message);
    setNewMoodImage(moodObj.image || null);
    setCreateMoodError("");
    setShowCreateMood(true);
  }

  function handleCancelCreateMood() {
    setShowCreateMood(false);
    setEditingMoodId(null);
    setCreateMoodError("");
  }

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageFile(file);
      setNewMoodImage(dataUrl);
    } catch (err) {
      setCreateMoodError(err.message || "Couldn't use that image.");
    }
  }

  async function handleCreateOrEditMood(e) {
    e.preventDefault();
    const name = newMoodName.trim();
    const description = newMoodDescription.trim();
    if (!name) {
      setCreateMoodError("Give your mood a name.");
      return;
    }
    if (!description) {
      setCreateMoodError("Add a short description.");
      return;
    }
    setCreatingMood(true);
    setCreateMoodError("");
    try {
      if (editingMoodId) {
        // Edit existing custom mood
        const patch = {
          label: name.slice(0, CUSTOM_MOOD_NAME_LIMIT),
          message: description.slice(0, CUSTOM_MOOD_DESCRIPTION_LIMIT),
          image: newMoodImage || null,
        };
        const updated = updateCustomMood(userId, editingMoodId, patch);
        setCustomMoods(updated);
        setShowCreateMood(false);
        setEditingMoodId(null);
      } else {
        // Create new custom mood
        const newMood = {
          id: `custom-${Date.now()}`,
          label: name.slice(0, CUSTOM_MOOD_NAME_LIMIT),
          message: description.slice(0, CUSTOM_MOOD_DESCRIPTION_LIMIT),
          image: newMoodImage || null,
          isCustom: true,
        };
        const updated = saveCustomMood(userId, newMood);
        setCustomMoods(updated);
        setShowCreateMood(false);
        setSearchQuery("");
        const newAllMoods = [...MOODS, ...updated];
        const newIdx = newAllMoods.findIndex((m) => m.id === newMood.id);
        setIndex(newIdx === -1 ? 0 : newIdx);
      }
    } catch (err) {
      setCreateMoodError(err.message || "Couldn't save that mood.");
    } finally {
      setCreatingMood(false);
    }
  }

  // ── Delete mood ────────────────────────────────────────────
  function handleDeleteMood(moodId) {
    const updated = deleteCustomMood(userId, moodId);
    setCustomMoods(updated);
    setConfirmDeleteId(null);
    setIndex(0);
  }

  return (
    <PawseWindow
      title="mood log"
      onTitleClick={() => navigate("/mood-log")}
    >
      <div className="pawse-inner-card">
        <p className="carousel-question">how are you feeling?</p>

        {/* SEARCH INPUT + CREATE-MOOD BUTTON */}
        <div className="carousel-search-row">
          <div className="carousel-search-wrap">
            <input
              type="text"
              className="carousel-search-input"
              placeholder="Search moods..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              autoComplete="off"
              aria-label="Search moods"
            />
            {searchQuery && (
              <button
                type="button"
                className="carousel-search-clear"
                onClick={() => {
                  setSearchQuery("");
                  setIndex(0);
                }}
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>

          <button
            type="button"
            className="carousel-create-mood-btn"
            onClick={openCreateMood}
            aria-label="Create your own mood"
          >
            <span className="carousel-create-mood-plus">+</span>
            <span className="carousel-create-mood-tooltip">create your own mood</span>
          </button>
        </div>

        {searchQuery && filteredMoods.length > 0 && (
          <div className="carousel-search-results">
            {filteredMoods.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`carousel-search-badge ${m.id === mood?.id ? "active" : ""}`}
                onClick={() => {
                  const actualIdx = filteredMoods.findIndex((fm) => fm.id === m.id);
                  if (actualIdx !== -1) setIndex(actualIdx);
                }}
              >
                {m.label.toLowerCase()}
              </button>
            ))}
          </div>
        )}

        {filteredMoods.length === 0 ? (
          <div className="carousel-empty-search">
            no moods found matching &ldquo;{searchQuery}&rdquo;
          </div>
        ) : (
          <>
            <div className="carousel-row">
              <button
                className="carousel-arrow"
                onClick={goPrev}
                aria-label="Previous mood"
              >
                &lt;
              </button>

              <div className="carousel-pet-container">
                {mood && <PetImage mood={mood} className="carousel-pet-image" />}
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
              disabled={submitting || !mood}
              aria-label={`Select ${mood?.label}`}
            >
              {mood?.label.toLowerCase()}
            </button>

            <div className="carousel-mood-description-box" style={{ position: "relative" }}>
              <p className="carousel-mood-description-text">{mood?.message}</p>
              
              {/* Edit / Delete overlay — inside box so layout matches built-in moods */}
              {isCurrentMoodCustom && (
                <div className="carousel-custom-actions-overlay">
                  {confirmDeleteId === mood.id ? (
                    <div className="carousel-delete-confirm-overlay">
                      <button
                        type="button"
                        className="carousel-delete-confirm-btn yes"
                        onClick={() => handleDeleteMood(mood.id)}
                        title="Confirm Delete"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        className="carousel-delete-confirm-btn cancel"
                        onClick={() => setConfirmDeleteId(null)}
                        title="Cancel Delete"
                      >
                        ✗
                      </button>
                    </div>
                  ) : (
                    <div className="carousel-custom-actions-buttons">
                      <button
                        type="button"
                        className="carousel-custom-action-icon edit"
                        onClick={() => openEditMood(mood)}
                        title="Edit Mood"
                        aria-label="Edit Mood"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="carousel-custom-action-icon delete"
                        onClick={() => setConfirmDeleteId(mood.id)}
                        title="Delete Mood"
                        aria-label="Delete Mood"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {error && <p className="carousel-error">{error}</p>}

      {/* ── CREATE / EDIT MOOD POPUP ── */}
      {showCreateMood && (
        <div className="create-mood-overlay" onClick={handleCancelCreateMood}>
          <div className="create-mood-popup" onClick={(e) => e.stopPropagation()}>
            <button
              className="create-mood-close-btn"
              onClick={handleCancelCreateMood}
              aria-label="Close"
            >
              &times;
            </button>

            <h3 className="create-mood-heading">
              {editingMoodId ? "edit mood" : "create your own mood"}
            </h3>

            <form className="create-mood-form" onSubmit={handleCreateOrEditMood}>
              <div className="create-mood-field">
                <label className="create-mood-label" htmlFor="new-mood-name">
                  mood name
                </label>
                <input
                  id="new-mood-name"
                  className="create-mood-input"
                  type="text"
                  value={newMoodName}
                  onChange={(e) => setNewMoodName(e.target.value)}
                  maxLength={CUSTOM_MOOD_NAME_LIMIT}
                  placeholder="e.g. Wobbly"
                  required
                />
              </div>

              <div className="create-mood-field">
                <label className="create-mood-label" htmlFor="new-mood-description">
                  description
                </label>
                <textarea
                  id="new-mood-description"
                  className="create-mood-textarea"
                  value={newMoodDescription}
                  onChange={(e) => setNewMoodDescription(e.target.value)}
                  maxLength={CUSTOM_MOOD_DESCRIPTION_LIMIT}
                  placeholder="how does this mood feel?"
                  rows={3}
                  required
                />
                <span className="create-mood-counter">
                  {newMoodDescription.length}/{CUSTOM_MOOD_DESCRIPTION_LIMIT}
                </span>
              </div>

              <div className="create-mood-field">
                <label className="create-mood-label" htmlFor="new-mood-image">
                  image (optional)
                </label>
                <div className="create-mood-image-row">
                  {newMoodImage && (
                    <img src={newMoodImage} alt="" className="create-mood-image-preview" />
                  )}
                  <input
                    id="new-mood-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="create-mood-file-input"
                  />
                </div>
              </div>

              {createMoodError && (
                <p className="create-mood-warning">{createMoodError}</p>
              )}

              <div className="create-mood-actions">
                <button
                  type="button"
                  className="create-mood-cancel-btn"
                  onClick={handleCancelCreateMood}
                  disabled={creatingMood}
                >
                  cancel
                </button>
                <button
                  type="submit"
                  className="create-mood-save-btn"
                  disabled={creatingMood}
                >
                  {creatingMood ? "..." : editingMoodId ? "save changes" : "save mood"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PawseWindow>
  );
}