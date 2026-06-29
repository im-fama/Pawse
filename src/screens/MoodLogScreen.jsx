import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PetImage from "../components/PetImage";
import PawseWindow from "../components/PawseWindow";
import { getMoodById } from "../data/moods";
import { fetchMoodHistory } from "../logic/petState";
import "./MoodLogScreen.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function MoodLogScreen() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("weekly"); // "weekly" | "monthly"
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMoodHistory(null)
      .then((history) => {
        if (!cancelled) {
          setEntries(history);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Generates the last 7 calendar days (including today)
  const getWeeklyDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(d);
    }
    return days;
  };

  // Generates cells for a 7-column monthly grid
  const getMonthlyDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const totalDays = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = firstDay.getDay();

    const cells = [];
    // Pad previous month days
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push(null);
    }
    // Add current month days
    for (let i = 1; i <= totalDays; i++) {
      cells.push(new Date(year, month, i));
    }
    return cells;
  };

  const getMoodForDay = (date) => {
    if (!date) return null;
    const targetString = date.toDateString();
    // Entries are sorted newest first, so the first match is the most recent check-in
    const matching = entries.find(
      (e) => new Date(e.created_at).toDateString() === targetString
    );
    if (matching) {
      return getMoodById(matching.mood);
    }
    return null;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  return (
    <PawseWindow
      title="Pawse"
      icon="🐾"
      footer={
        <button className="moodlog-back-btn" onClick={() => navigate("/home")}>
          back to home
        </button>
      }
    >
      <div className="moodlog-header-row">
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

      {loading ? (
        <div className="moodlog-loading">loading history...</div>
      ) : (
        <div className="moodlog-view-container">
          {view === "weekly" && (
            <div className="moodlog-weekly-list">
              {getWeeklyDays().map((day, idx) => {
                const mood = getMoodForDay(day);
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <div
                    className={`moodlog-weekly-row ${isToday ? "today" : ""}`}
                    key={idx}
                  >
                    <div className="moodlog-weekly-date">
                      <span className="weekday">{WEEKDAYS[day.getDay()]}</span>
                      <span className="date-num">
                        {day.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
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
                        <span className="moodlog-weekly-empty">no logs</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {view === "monthly" && (
            <div className="moodlog-monthly-calendar">
              <div className="calendar-nav-row">
                <button className="calendar-nav-arrow" onClick={handlePrevMonth}>
                  &lt;
                </button>
                <span className="calendar-month-title">
                  {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
                </span>
                <button className="calendar-nav-arrow" onClick={handleNextMonth}>
                  &gt;
                </button>
              </div>

              <div className="calendar-grid-header">
                {WEEKDAYS.map((w) => (
                  <span className="grid-header-cell" key={w}>
                    {w[0]}
                  </span>
                ))}
              </div>

              <div className="calendar-grid-body">
                {getMonthlyDays().map((day, idx) => {
                  if (!day) return <div className="calendar-cell empty" key={`empty-${idx}`} />;

                  const mood = getMoodForDay(day);
                  const isToday = day.toDateString() === new Date().toDateString();

                  return (
                    <div
                      className={`calendar-cell ${isToday ? "today" : ""} ${
                        mood ? "logged" : ""
                      }`}
                      key={day.toISOString()}
                      title={
                        mood
                          ? `${day.toLocaleDateString()}: ${mood.label}`
                          : day.toLocaleDateString()
                      }
                    >
                      <span className="cell-num">{day.getDate()}</span>
                      {mood && (
                        <div className="cell-mood-avatar">
                          <PetImage mood={mood} className="cell-mood-icon" />
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
    </PawseWindow>
  );
}

