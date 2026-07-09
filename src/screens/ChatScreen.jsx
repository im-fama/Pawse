import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PawseWindow from "../components/PawseWindow";
import PetImage from "../components/PetImage";
import { getMoodById } from "../data/moods";
import { fetchLatestMoodLog } from "../logic/moodLogs";
import { sendChatMessage } from "../logic/gemini";
import "./ChatScreen.css";

// Helper to get today's date in local YYYY-MM-DD format
function getTodayDateString() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Helper to format option dates as "Month Day, Year"
function formatOptionDate(dateStr) {
  const todayStr = getTodayDateString();
  if (dateStr === todayStr) return "Today";
  try {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function ChatScreen({ userId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);

  // Load API keys list (backwards-compatible with single key storage)
  const [apiKeys, setApiKeys] = useState(() => {
    const raw = localStorage.getItem("pawse_gemini_api_keys") || "";
    if (raw) {
      return raw.split(",").map((k) => k.trim()).filter(Boolean);
    }
    const single =
      import.meta.env.VITE_GEMINI_API_KEY ||
      localStorage.getItem("pawse_gemini_api_key") ||
      "";
    return single ? [single] : [];
  });

  const [tempKeys, setTempKeys] = useState(() => {
    const raw = localStorage.getItem("pawse_gemini_api_keys") || "";
    if (raw) {
      return raw.split(",").map((k) => k.trim()).filter(Boolean).join("\n");
    }
    return localStorage.getItem("pawse_gemini_api_key") || "";
  });

  const [showKeyManager, setShowKeyManager] = useState(false);

  // Dates state — pre-select a date if navigated from MoodLogScreen
  const [selectedDate, setSelectedDate] = useState(() => {
    return location.state?.date || getTodayDateString();
  });
  const [chattedDates, setChattedDates] = useState([]);

  // Chat states
  const [messages, setMessages] = useState([]);
  const [todayMood, setTodayMood] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState("");

  // Load the list of dates the user has chatted on
  useEffect(() => {
    if (userId) {
      const datesKey = `pawse_chat_dates_${userId}`;
      const dates = JSON.parse(localStorage.getItem(datesKey) || "[]");
      const todayStr = getTodayDateString();

      // Make sure today is in the selector list
      if (!dates.includes(todayStr)) {
        dates.unshift(todayStr);
      }

      dates.sort((a, b) => new Date(b) - new Date(a));
      setTimeout(() => {
        setChattedDates(dates);
      }, 0);
    }
  }, [userId]);

  // Load chat and mood for the selected date
  useEffect(() => {
    if (apiKeys.length === 0 || !userId) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    let cancelled = false;
    setTimeout(() => setLoading(true), 0);

    async function loadChatForDate() {
      try {
        const todayStr = getTodayDateString();
        const isViewingToday = selectedDate === todayStr;
        const chatKey = `pawse_chat_history_${userId}_${selectedDate}`;
        const savedHistory = localStorage.getItem(chatKey);

        // Fetch latest mood log to see if a mood was logged today
        let loggedMood = null;
        const latest = await fetchLatestMoodLog(userId);
        if (latest?.created_at) {
          const date = new Date(latest.created_at);
          const today = new Date();
          const isToday =
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
          if (isToday) {
            loggedMood = getMoodById(latest.mood);
          }
        }

        if (cancelled) return;
        setTodayMood(loggedMood);

        if (savedHistory) {
          setMessages(JSON.parse(savedHistory));
        } else {
          if (isViewingToday) {
            // Fresh greeting for today
            let startMsg =
              "Hey, I'm Kitty. I'm here to listen and help you work through whatever's on your mind. How are you feeling today?";
            if (loggedMood) {
              const label = loggedMood.label.toLowerCase();
              if (
                latest.mood === "happy" ||
                latest.mood === "overjoyed" ||
                latest.mood === "excited" ||
                latest.mood === "cutesy"
              ) {
                startMsg = `I can see you logged your mood as "${label}" today — that's good to hear. What's been going well for you?`;
              } else if (
                latest.mood === "sad" ||
                latest.mood === "lonely" ||
                latest.mood === "exhausted" ||
                latest.mood === "dead"
              ) {
                startMsg = `I noticed you logged your mood as "${label}" today. That sounds heavy. Do you want to talk about what's been going on?`;
              } else if (latest.mood === "anxious" || latest.mood === "scared") {
                startMsg = `You logged your mood as "${label}" today. Anxiety can feel overwhelming. What's been weighing on you?`;
              } else if (
                latest.mood === "angry" ||
                latest.mood === "furious" ||
                latest.mood === "frustrated"
              ) {
                startMsg = `I see you're feeling "${label}" today. That's completely valid. If you want to talk through what happened, I'm here.`;
              } else {
                startMsg = `You logged your mood as "${label}" today. How has the rest of your day been going?`;
              }
            }

            const initialMessages = [{ sender: "kitty", text: startMsg }];
            setMessages(initialMessages);

            // Save to localStorage immediately
            localStorage.setItem(chatKey, JSON.stringify(initialMessages));

            // Record date
            const datesKey = `pawse_chat_dates_${userId}`;
            const existingDates = JSON.parse(localStorage.getItem(datesKey) || "[]");
            if (!existingDates.includes(todayStr)) {
              existingDates.push(todayStr);
              existingDates.sort((a, b) => new Date(b) - new Date(a));
              localStorage.setItem(datesKey, JSON.stringify(existingDates));
              setChattedDates(existingDates);
            }
          } else {
            // For past dates with no saved history, show fallback empty message
            setMessages([
              { sender: "kitty", text: "No chat history recorded for this day." },
            ]);
          }
        }
      } catch (err) {
        console.error("Failed loading chat:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadChatForDate();
    return () => {
      cancelled = true;
    };
  }, [userId, apiKeys, selectedDate]);

  // Scroll to bottom when messages or typing status changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Handle saving multiple API keys
  function handleSaveKeys(e) {
    e.preventDefault();
    const parsedKeys = tempKeys
      .split(/[\n,]/)
      .map((k) => k.trim())
      .filter(Boolean);

    if (parsedKeys.length === 0) {
      localStorage.removeItem("pawse_gemini_api_keys");
      localStorage.removeItem("pawse_gemini_api_key");
      setApiKeys([]);
    } else {
      localStorage.setItem("pawse_gemini_api_keys", parsedKeys.join(","));
      // Clear old single key to avoid redundancy
      localStorage.removeItem("pawse_gemini_api_key");
      setApiKeys(parsedKeys);
    }
    setShowKeyManager(false);
    setError("");
  }

  // Handle sending a chat message with key rotation
  async function handleSendMessage(e) {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || isTyping || selectedDate !== getTodayDateString()) return;

    setError("");
    const newMsg = { sender: "user", text };
    const messagesWithUser = [...messages, newMsg];

    setMessages(messagesWithUser);
    setInputText("");
    setIsTyping(true);

    const todayStr = getTodayDateString();
    const chatKey = `pawse_chat_history_${userId}_${todayStr}`;
    localStorage.setItem(chatKey, JSON.stringify(messagesWithUser));

    let success = false;
    let responseText = "";
    let lastError = "";

    // Try keys sequentially
    const keysToTry = [...apiKeys];
    for (let i = 0; i < keysToTry.length; i++) {
      const key = keysToTry[i];
      try {
        responseText = await sendChatMessage(
          messagesWithUser,
          text,
          todayMood ? todayMood.label.toLowerCase() : null,
          key
        );
        success = true;

        // Move successful key to the front
        if (i > 0) {
          const reordered = [key, ...apiKeys.filter((k) => k !== key)];
          setApiKeys(reordered);
          localStorage.setItem("pawse_gemini_api_keys", reordered.join(","));
        }
        break;
      } catch (err) {
        console.warn(`API key index ${i} failed:`, err);
        lastError = err.message;
      }
    }

    if (success) {
      const messagesWithKitty = [
        ...messagesWithUser,
        { sender: "kitty", text: responseText },
      ];
      setMessages(messagesWithKitty);
      localStorage.setItem(chatKey, JSON.stringify(messagesWithKitty));
    } else {
      setError(
        lastError || "All configured API keys failed. Try waiting or adding another key."
      );
    }
    setIsTyping(false);
  }

  const isToday = selectedDate === getTodayDateString();

  // If no API Key is configured OR key manager is open, show keys config panel
  if (apiKeys.length === 0 || showKeyManager) {
    return (
      <PawseWindow
        title="mood log"
        onBack={showKeyManager ? () => setShowKeyManager(false) : () => navigate("/home")}
      >
        <div className="pawse-inner-card chat-setup-card">
          <h2 className="chat-setup-title">
            {showKeyManager ? "manage api keys" : "ai chat setup"}
          </h2>
          <p className="chat-setup-desc">
            Paste one or more Google Gemini API Keys below (one per line, or
            comma-separated) to support chat rotation. Get free keys at{" "}
            <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer">
              Google AI Studio
            </a>
            .
          </p>

          <form onSubmit={handleSaveKeys} className="chat-setup-form">
            <div className="chat-setup-field">
              <label htmlFor="api-keys-input" className="chat-setup-label">
                gemini api keys:
              </label>
              <textarea
                id="api-keys-input"
                className="chat-setup-textarea"
                placeholder={"AIzaSy...\nAIzaSy..."}
                value={tempKeys}
                onChange={(e) => setTempKeys(e.target.value)}
                required
              />
            </div>
            <div style={{ display: "flex", gap: "8px", width: "100%" }}>
              {showKeyManager && (
                <button
                  type="button"
                  className="chat-setup-btn"
                  style={{ background: "transparent", color: "#33241C" }}
                  onClick={() => setShowKeyManager(false)}
                >
                  cancel
                </button>
              )}
              <button type="submit" className="chat-setup-btn">
                save keys
              </button>
            </div>
          </form>

          {!showKeyManager && (
            <p className="chat-setup-env-tip">
              Or use <code className="chat-code">VITE_GEMINI_API_KEY</code> in your{" "}
              <code className="chat-code">.env</code> file.
            </p>
          )}
        </div>
      </PawseWindow>
    );
  }

  const activeMood = todayMood || { id: "calm", label: "Calm", image: "calm.png" };

  return (
    <PawseWindow title="mood log" onBack={() => navigate("/home")}>
      <div className="pawse-inner-card chat-inner-card">
        {loading ? (
          <div className="chat-loading">loading...</div>
        ) : (
          <>
            {/* Header info bar with History drop-down */}
            <div className="chat-header-info">
              <div className="chat-header-left-pane">
                <div className="chat-avatar-wrap">
                  <PetImage mood={activeMood} className="chat-header-pet" />
                </div>
                <div className="chat-header-text">
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="chat-pet-name">kitty chatbot</span>
                    <button
                      type="button"
                      className="chat-header-manage-keys-btn"
                      onClick={() => setShowKeyManager(true)}
                      title="Manage API Keys"
                    >
                      keys ({apiKeys.length})
                    </button>
                  </div>
                  {todayMood && isToday && (
                    <span className="chat-mood-badge">
                      feeling {todayMood.label.toLowerCase()} today
                    </span>
                  )}
                </div>
              </div>

              {/* History Dropdown */}
              <div className="chat-history-dropdown-wrap">
                <select
                  aria-label="Chat history date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setError("");
                  }}
                  className="chat-history-select"
                >
                  {chattedDates.map((date) => (
                    <option key={date} value={date}>
                      {formatOptionDate(date)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scrollable messages container */}
            <div className="chat-messages-container">
              {messages.map((msg, index) => (
                <div key={index} className={`chat-message-row ${msg.sender}`}>
                  {msg.sender === "kitty" && (
                    <div className="chat-msg-avatar-container">
                      <PetImage mood={activeMood} className="chat-msg-avatar" />
                    </div>
                  )}
                  <div className={`chat-bubble ${msg.sender}`}>
                    <p className="chat-msg-text">{msg.text}</p>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="chat-message-row kitty">
                  <div className="chat-msg-avatar-container">
                    <PetImage mood={activeMood} className="chat-msg-avatar" />
                  </div>
                  <div className="chat-bubble kitty typing">
                    <span className="chat-typing-dots">Kitty is typing...</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="chat-feedback chat-error">
                  <span className="chat-feedback-icon">!</span>
                  {error}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Read-only reminder for history logs */}
            {!isToday && (
              <div className="chat-history-banner">
                <span>Viewing history log.</span>
                <button
                  type="button"
                  className="chat-history-return-btn"
                  onClick={() => setSelectedDate(getTodayDateString())}
                >
                  Return to Today
                </button>
              </div>
            )}

            {/* Input area */}
            <form className="chat-input-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                className="chat-input-field"
                placeholder={isToday ? "Talk to kitty..." : "Chatting disabled in history"}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                maxLength={400}
                disabled={isTyping || !isToday}
                required
              />
              <button
                type="submit"
                className="chat-send-btn"
                disabled={isTyping || !inputText.trim() || !isToday}
              >
                send
              </button>
            </form>
          </>
        )}
      </div>
    </PawseWindow>
  );
}