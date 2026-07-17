import { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import PetImage from "../components/PetImage";
import PawseWindow from "../components/PawseWindow";
import { getMoodById } from "../data/moods";
import { fetchMoodHistory } from "../logic/moodLogs";
import "../styles/MoodLogScreen.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Formats a Date as e.g. "Monday, June 23"
function formatPopupDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - daysSinceMonday);
  return d;
}

function scrollToElement(container, element) {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  container.scrollTop += elementRect.top - containerRect.top;
}

function formatWeekLabel(weekStart, weekEnd) {
  const startMonth = weekStart.toLocaleDateString(undefined, { month: "short" });
  const endMonth = weekEnd.toLocaleDateString(undefined, { month: "short" });
  if (startMonth === endMonth) {
    return `${startMonth} ${weekStart.getDate()} – ${weekEnd.getDate()}`;
  }
  return `${startMonth} ${weekStart.getDate()} – ${endMonth} ${weekEnd.getDate()}`;
}

function getWeeklyWeeks(entries) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentWeekStart = startOfWeek(today);

  let earliest = new Date(currentWeekStart);
  earliest.setDate(earliest.getDate() - 7 * 11);

  if (entries.length > 0) {
    const oldestEntry = entries.reduce((min, entry) => {
      const entryDate = new Date(entry.created_at);
      return entryDate < min ? entryDate : min;
    }, new Date(entries[0].created_at));
    const oldestWeekStart = startOfWeek(oldestEntry);
    if (oldestWeekStart < earliest) earliest = oldestWeekStart;
  }

  let latest = new Date(currentWeekStart);
  latest.setDate(latest.getDate() + 7 * 4);

  const weeks = [];
  let weekStart = new Date(earliest);

  while (weekStart <= latest) {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }

    const weekEnd = days[6];
    weeks.push({
      key: weekStart.toISOString(),
      label: formatWeekLabel(weekStart, weekEnd),
      days,
      isCurrentWeek: weekStart.getTime() === currentWeekStart.getTime(),
    });

    weekStart = new Date(weekStart);
    weekStart.setDate(weekStart.getDate() + 7);
  }

  return weeks;
}

export default function MoodLogScreen({ userId }) {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("weekly"); // "weekly" | "monthly"
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState("all"); // "all" | "mood" | "note" | "date"
  // { date: Date, entry: moodEntry } | null
  const [popup, setPopup] = useState(null);
  const [notePopup, setNotePopup] = useState(null);
  const scrollContainerRef = useRef(null);
  const currentWeekRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMoodHistory(userId)
      .then((history) => {
        if (!cancelled) {
          setEntries(history);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId]);

  // Close popup on Escape
  useEffect(() => {
    if (!popup && !notePopup) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setPopup(null);
        setNotePopup(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popup, notePopup]);

  useLayoutEffect(() => {
    if (view !== "weekly" || loading || searchQuery) return;

    const container = scrollContainerRef.current;
    const currentWeek = currentWeekRef.current;
    if (!container || !currentWeek) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToElement(container, currentWeek);
      });
    });
  }, [view, loading, entries, searchQuery]);

  const getMonthlyDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const totalDays = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = firstDay.getDay();

    const cells = [];
    for (let i = 0; i < startDayOfWeek; i++) cells.push(null);
    for (let i = 1; i <= totalDays; i++) cells.push(new Date(year, month, i));
    return cells;
  };

  const getEntryForDay = (date) => {
    if (!date) return null;
    const targetString = date.toDateString();
    return entries.find(
      (e) => new Date(e.created_at).toDateString() === targetString
    );
  };



  const handlePrevMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const handleNextMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const openPopup = useCallback((date, entry) => {
    if (entry) {
      setPopup({ date, entry });
    }
  }, []);

  const weeklyWeeks = useMemo(() => getWeeklyWeeks(entries), [entries]);
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Filtered entries for search
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const searchPlaceholder = useMemo(() => {
    switch (searchFilter) {
      case "mood":
        return "search by mood (e.g. happy, sad)...";
      case "note":
        return "search by note content...";
      case "date":
        return "search by date (e.g. monday, june)...";
      default:
        return "search moods, notes, dates...";
    }
  }, [searchFilter]);

  const searchResults = useMemo(() => {
    if (!trimmedQuery) return [];
    return entries.filter((entry) => {
      const mood = getMoodById(entry.mood, userId);
      const moodLabel = mood?.label?.toLowerCase() || "";
      const note = (entry.note || "").toLowerCase();
      const dateStr = new Date(entry.created_at).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).toLowerCase();

      if (searchFilter === "mood") {
        return moodLabel.includes(trimmedQuery);
      } else if (searchFilter === "note") {
        return note.includes(trimmedQuery);
      } else if (searchFilter === "date") {
        return dateStr.includes(trimmedQuery);
      } else {
        return (
          moodLabel.includes(trimmedQuery) ||
          note.includes(trimmedQuery) ||
          dateStr.includes(trimmedQuery)
        );
      }
    });
  }, [entries, trimmedQuery, searchFilter]);

  return (
    <PawseWindow title="Pawse" icon="🐾">
      <div className="pawse-inner-card moodlog-inner-card">
        <div className="moodlog-header-row">
          <div className="moodlog-header-top">
            <span className="moodlog-title-text">mood history</span>
            <div className="moodlog-toggle-container">
              <button
                className={`moodlog-toggle-btn ${view === "weekly" ? "active" : ""}`}
                onClick={() => setView("weekly")}
              >
                Weekly
              </button>
              <button
                className={`moodlog-toggle-btn ${view === "monthly" ? "active" : ""}`}
                onClick={() => setView("monthly")}
              >
                Monthly
              </button>
            </div>
          </div>
          <div className="moodlog-search-bar-container">
            <div className="moodlog-search-wrap">
              <input
                id="moodlog-search"
                type="text"
                className="moodlog-search-input"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
                aria-label="Search mood history"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="moodlog-search-clear"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
            <select
              className="moodlog-filter-select"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              aria-label="Search filter type"
            >
              <option value="all">all</option>
              <option value="mood">mood</option>
              <option value="note">note</option>
              <option value="date">date</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="moodlog-loading">loading history...</div>
        ) : trimmedQuery ? (
          /* ── SEARCH RESULTS ── */
          <div className="moodlog-view-container">
            {searchResults.length === 0 ? (
              <div className="moodlog-search-empty">
                no moods found for &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              <div className="moodlog-search-results">
                {searchResults.map((entry) => {
                  const mood = getMoodById(entry.mood, userId);
                  const entryDate = new Date(entry.created_at);
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      className="moodlog-search-result-item"
                      onClick={() => openPopup(entryDate, entry)}
                    >
                      <div className="moodlog-search-result-avatar">
                        {mood && <PetImage mood={mood} className="moodlog-search-result-icon" />}
                      </div>
                      <div className="moodlog-search-result-text">
                        <span className="moodlog-search-result-label">
                          {mood?.label?.toLowerCase() || entry.mood}
                        </span>
                        <span className="moodlog-search-result-date">
                          {formatPopupDate(entryDate)}
                        </span>
                        {entry.note && (
                          <span className="moodlog-search-result-note">
                            {entry.note.slice(0, 60)}{entry.note.length > 60 ? "…" : ""}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="moodlog-view-container" ref={scrollContainerRef}>
            {/* ── WEEKLY VIEW ── */}
            {view === "weekly" && (
              <div className="moodlog-weekly-list">
                {weeklyWeeks.map((week) => (
                  <section
                    key={week.key}
                    className={`moodlog-week-section ${week.isCurrentWeek ? "current-week" : ""}`}
                    ref={week.isCurrentWeek ? currentWeekRef : null}
                  >
                    <h3 className="moodlog-week-label">
                      {week.label}
                      {week.isCurrentWeek && <span className="moodlog-week-current-tag">this week</span>}
                    </h3>
                    <div className="moodlog-week-days">
                      {week.days.map((day) => {
                        const entry = getEntryForDay(day);
                        const mood = entry ? getMoodById(entry.mood, userId) : null;
                        const isToday = day.toDateString() === new Date().toDateString();
                        const isFuture = day.getTime() > todayStart.getTime();

                        return (
                          <div
                            className={`moodlog-weekly-row ${isToday ? "today" : ""} ${mood ? "clickable" : ""} ${isFuture ? "future" : ""}`}
                            key={day.toISOString()}
                            onClick={() => !isFuture && openPopup(day, entry)}
                          >
                            <div className="moodlog-weekly-date">
                              <span className="weekday">{WEEKDAYS[day.getDay()]}</span>
                              <span className="date-num">
                                {day.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                              </span>
                            </div>

                            <div className="moodlog-weekly-status">
                              {mood ? (
                                <div className="moodlog-weekly-logged">
                                  <PetImage mood={mood} className="moodlog-weekly-icon" />
                                  <span className="moodlog-weekly-label">
                                    {mood.label.toLowerCase()}
                                  </span>
                                </div>
                              ) : (
                                <span className="moodlog-weekly-empty">
                                  {isFuture ? "—" : "no logs"}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {/* ── MONTHLY VIEW ── */}
            {view === "monthly" && (
              <div className="moodlog-monthly-calendar">
                <div className="calendar-nav-row">
                  <button className="calendar-nav-arrow" onClick={handlePrevMonth}>&lt;</button>
                  <span className="calendar-month-title">
                    {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </span>
                  <button className="calendar-nav-arrow" onClick={handleNextMonth}>&gt;</button>
                </div>

                <div className="calendar-grid-header">
                  {WEEKDAYS.map((w) => (
                    <span className="grid-header-cell" key={w}>{w[0]}</span>
                  ))}
                </div>

                <div className="calendar-grid-body">
                  {getMonthlyDays().map((day, idx) => {
                    if (!day) return <div className="calendar-cell empty" key={`empty-${idx}`} />;

                    const entry = getEntryForDay(day);
                    const mood = entry ? getMoodById(entry.mood, userId) : null;
                    const isToday = day.toDateString() === new Date().toDateString();
                    const cellKey = day.toISOString();
                    const isHovered = hoveredDay === cellKey;

                        // Cells in grid rows 1 & 2 (indices 0–13) would clip above,
                        // so flip the tooltip to open downward instead.
                        const tooltipBelow = idx < 14;
                        // Cells in the first/last column would clip sideways,
                        // so anchor the tooltip to that edge instead of centering it.
                        const col = idx % 7;
                        const tooltipAlign =
                          col === 0 ? "align-start" : col === 6 ? "align-end" : "";

                    return (
                      <div
                        className={`calendar-cell ${isToday ? "today" : ""} ${mood ? "logged" : ""}`}
                        key={cellKey}
                        onMouseEnter={() => mood && setHoveredDay(cellKey)}
                        onMouseLeave={() => setHoveredDay(null)}
                        onClick={() => openPopup(day, entry)}
                        title={mood ? "" : day.toLocaleDateString()}
                      >
                        <span className="cell-num">{day.getDate()}</span>

                        {mood && (
                          <div className="cell-mood-avatar">
                            <PetImage mood={mood} className="cell-mood-icon" />
                          </div>
                        )}

                          {mood && isHovered && (
                          <div
                            className={`cell-mood-tooltip ${tooltipBelow ? "tooltip-below" : ""} ${tooltipAlign}`.trim()}
                          >
                            <div className="cell-mood-tooltip-card">
                              <PetImage mood={mood} className="cell-mood-tooltip-icon" />
                            </div>
                            <span className="cell-mood-tooltip-label">{mood.label}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MOOD POPUP ── */}
      {popup && (
        <div className="mood-popup-overlay" onClick={() => setPopup(null)}>
          <div className="mood-popup" onClick={(e) => e.stopPropagation()}>
            <button
              className="mood-popup-close"
              onClick={() => setPopup(null)}
              aria-label="Close"
            >
              &times;
            </button>
            <span className="mood-popup-date">{formatPopupDate(popup.date)}</span>
            <PetImage mood={getMoodById(popup.entry.mood, userId)} className="mood-popup-img" />
            <span className="mood-popup-label">
              {getMoodById(popup.entry.mood, userId)?.label.toLowerCase()}
            </span>
            {popup.entry.note ? (
              <button
                className="mood-popup-note-btn"
                onClick={() => setNotePopup(popup.entry.note)}
              >
                view note
              </button>
            ) : (
              <p className="mood-popup-no-note">no note for this log</p>
            )}
            <button
              className="mood-popup-chat-btn"
              onClick={() => {
                // Format date as YYYY-MM-DD local time
                const d = popup.date;
                const dateStr = [
                  d.getFullYear(),
                  String(d.getMonth() + 1).padStart(2, "0"),
                  String(d.getDate()).padStart(2, "0"),
                ].join("-");
                setPopup(null);
                navigate("/chat", { state: { date: dateStr } });
              }}
            >
              view chat
            </button>
          </div>
        </div>
      )}

      {notePopup && (
        <div className="mood-popup-overlay" onClick={() => setNotePopup(null)}>
          <div className="mood-note-popup" onClick={(e) => e.stopPropagation()}>
            <button
              className="mood-popup-close"
              onClick={() => setNotePopup(null)}
              aria-label="Close note"
            >
              &times;
            </button>
            <div className="mood-note-popup-content">
              <p className="mood-note-popup-text">{notePopup}</p>
            </div>
          </div>
        </div>
      )}
    </PawseWindow>
  );
}