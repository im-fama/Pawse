import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import PawseWindow from "../components/PawseWindow";
import PetImage from "../components/PetImage";
import { getMoodById } from "../data/moods";
import { sendChatMessage } from "../logic/groq";
import { fetchLatestMoodLog } from "../logic/moodLogs";
import "./ChatScreen.css";

const REALTIME_ROOM = "pawse-global";
const CHAT_SERVER_URL =
  import.meta.env.VITE_CHAT_SERVER_URL || "http://localhost:3001";

function getTodayDateString() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatOptionDate(dateStr) {
  const todayStr = getTodayDateString();
  if (dateStr === todayStr) return "Today";
  try {
    const date = new Date(`${dateStr}T00:00:00`);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function loadStoredGroqKeys() {
  const raw = localStorage.getItem("pawse_groq_api_keys") || "";
  if (raw) {
    return raw.split(",").map((k) => k.trim()).filter(Boolean);
  }

  const single =
    import.meta.env.VITE_GROQ_API_KEY ||
    localStorage.getItem("pawse_groq_api_key") ||
    "";
  return single ? [single] : [];
}

function getInitialName(userId) {
  const savedName = localStorage.getItem("pawse_chat_display_name");
  if (savedName) return savedName;
  return userId ? `friend-${String(userId).slice(0, 5)}` : "friend";
}

export default function ChatScreen({ userId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);
  const realtimeEndRef = useRef(null);
  const socketRef = useRef(null);

  const [chatMode, setChatMode] = useState(location.state?.mode || "ai");
  const [apiKeys, setApiKeys] = useState(loadStoredGroqKeys);
  const [tempKeys, setTempKeys] = useState(() => apiKeys.join("\n"));
  const [showKeyManager, setShowKeyManager] = useState(false);

  const [selectedDate, setSelectedDate] = useState(
    () => location.state?.date || getTodayDateString()
  );
  const [chattedDates, setChattedDates] = useState([]);
  const [messages, setMessages] = useState([]);
  const [todayMood, setTodayMood] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState("");

  const [displayName, setDisplayName] = useState(() => getInitialName(userId));
  const [draftDisplayName, setDraftDisplayName] = useState(displayName);
  const [realtimeMessages, setRealtimeMessages] = useState([]);
  const [realtimeInput, setRealtimeInput] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState("offline");
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const datesKey = `pawse_chat_dates_${userId}`;
    const dates = JSON.parse(localStorage.getItem(datesKey) || "[]");
    const todayStr = getTodayDateString();

    if (!dates.includes(todayStr)) {
      dates.unshift(todayStr);
    }

    dates.sort((a, b) => new Date(b) - new Date(a));
    setTimeout(() => setChattedDates(dates), 0);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
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
          return;
        }

        if (!isViewingToday) {
          setMessages([{ sender: "kitty", text: "No chat history recorded for this day." }]);
          return;
        }

        let startMsg =
          "Hey, I'm Kitty. I'm here to listen and help you work through whatever's on your mind. How are you feeling today?";

        if (loggedMood) {
          const label = loggedMood.label.toLowerCase();
          if (["happy", "overjoyed", "excited", "cutesy"].includes(latest.mood)) {
            startMsg = `I can see you logged your mood as "${label}" today. That's good to hear. What's been going well for you?`;
          } else if (["sad", "lonely", "exhausted", "dead"].includes(latest.mood)) {
            startMsg = `I noticed you logged your mood as "${label}" today. That sounds heavy. Do you want to talk about what's been going on?`;
          } else if (["anxious", "scared"].includes(latest.mood)) {
            startMsg = `You logged your mood as "${label}" today. Anxiety can feel overwhelming. What's been weighing on you?`;
          } else if (["angry", "furious", "frustrated"].includes(latest.mood)) {
            startMsg = `I see you're feeling "${label}" today. That's completely valid. If you want to talk through what happened, I'm here.`;
          } else {
            startMsg = `You logged your mood as "${label}" today. How has the rest of your day been going?`;
          }
        }

        const initialMessages = [{ sender: "kitty", text: startMsg }];
        setMessages(initialMessages);
        localStorage.setItem(chatKey, JSON.stringify(initialMessages));

        const datesKey = `pawse_chat_dates_${userId}`;
        const existingDates = JSON.parse(localStorage.getItem(datesKey) || "[]");
        if (!existingDates.includes(todayStr)) {
          existingDates.push(todayStr);
          existingDates.sort((a, b) => new Date(b) - new Date(a));
          localStorage.setItem(datesKey, JSON.stringify(existingDates));
          setChattedDates(existingDates);
        }
      } catch (err) {
        console.error("Failed loading chat:", err);
        setError("Could not load your AI chat history right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadChatForDate();
    return () => {
      cancelled = true;
    };
  }, [userId, selectedDate]);

  useEffect(() => {
    if (chatMode !== "realtime") return undefined;

    setTimeout(() => setRealtimeStatus("connecting"), 0);
    const socket = io(CHAT_SERVER_URL, {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setRealtimeStatus("online");
      socket.emit("room:join", { room: REALTIME_ROOM, name: displayName });
    });

    socket.on("connect_error", () => {
      setRealtimeStatus("offline");
    });

    socket.on("disconnect", () => {
      setRealtimeStatus("offline");
      setOnlineCount(0);
    });

    socket.on("room:history", (history) => {
      setRealtimeMessages(Array.isArray(history) ? history : []);
    });

    socket.on("room:user-count", (count) => {
      setOnlineCount(Number(count) || 0);
    });

    socket.on("chat:message", (message) => {
      setRealtimeMessages((current) => [...current, message]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [chatMode, displayName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    realtimeEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [realtimeMessages]);

  function handleSaveKeys(e) {
    e.preventDefault();
    const parsedKeys = tempKeys
      .split(/[\n,]/)
      .map((k) => k.trim())
      .filter(Boolean);

    localStorage.removeItem("pawse_gemini_api_keys");
    localStorage.removeItem("pawse_gemini_api_key");

    if (parsedKeys.length === 0) {
      localStorage.removeItem("pawse_groq_api_keys");
      localStorage.removeItem("pawse_groq_api_key");
      setApiKeys([]);
    } else {
      localStorage.setItem("pawse_groq_api_keys", parsedKeys.join(","));
      localStorage.removeItem("pawse_groq_api_key");
      setApiKeys(parsedKeys);
    }

    setShowKeyManager(false);
    setError("");
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    const text = inputText.trim();
    const todayStr = getTodayDateString();
    if (!text || isTyping || selectedDate !== todayStr || apiKeys.length === 0) return;

    setError("");
    const newMsg = { sender: "user", text };
    const messagesWithUser = [...messages, newMsg];

    setMessages(messagesWithUser);
    setInputText("");
    setIsTyping(true);

    const chatKey = `pawse_chat_history_${userId}_${todayStr}`;
    localStorage.setItem(chatKey, JSON.stringify(messagesWithUser));

    let responseText = "";
    let lastError = "";

    for (let i = 0; i < apiKeys.length; i += 1) {
      const key = apiKeys[i];
      try {
        responseText = await sendChatMessage(
          messages,
          text,
          todayMood ? todayMood.label.toLowerCase() : null,
          key
        );

        if (i > 0) {
          const reordered = [key, ...apiKeys.filter((k) => k !== key)];
          setApiKeys(reordered);
          localStorage.setItem("pawse_groq_api_keys", reordered.join(","));
        }
        break;
      } catch (err) {
        console.warn(`Groq API key index ${i} failed:`, err);
        lastError = err.message;
      }
    }

    if (responseText) {
      const messagesWithKitty = [
        ...messagesWithUser,
        { sender: "kitty", text: responseText },
      ];
      setMessages(messagesWithKitty);
      localStorage.setItem(chatKey, JSON.stringify(messagesWithKitty));
    } else {
      setError(lastError || "All configured Groq API keys failed. Try again later.");
    }

    setIsTyping(false);
  }

  function handleDisplayNameSave(e) {
    e.preventDefault();
    const nextName = draftDisplayName.trim().slice(0, 32) || "friend";
    localStorage.setItem("pawse_chat_display_name", nextName);
    setDisplayName(nextName);
  }

  function handleRealtimeSend(e) {
    e.preventDefault();
    const text = realtimeInput.trim();
    if (!text || realtimeStatus !== "online") return;

    socketRef.current?.emit("chat:message", {
      room: REALTIME_ROOM,
      name: displayName,
      text,
    });
    setRealtimeInput("");
  }

  const isToday = selectedDate === getTodayDateString();
  const activeMood = todayMood || { id: "calm", label: "Calm", image: "calm.png" };
  const aiChatDisabled = !isToday || isTyping || apiKeys.length === 0;

  return (
    <PawseWindow title="chat" onBack={() => navigate("/home")}>
      <div className="pawse-inner-card chat-inner-card">
        <div className="chat-mode-toggle" aria-label="Chat mode">
          <button
            type="button"
            className={chatMode === "ai" ? "active" : ""}
            onClick={() => setChatMode("ai")}
          >
            ai chat
          </button>
          <button
            type="button"
            className={chatMode === "realtime" ? "active" : ""}
            onClick={() => setChatMode("realtime")}
          >
            real time chat
          </button>
        </div>

        {chatMode === "ai" ? (
          <div className="chat-panel">
            {apiKeys.length === 0 || showKeyManager ? (
              <div className="chat-setup-card">
                <h2 className="chat-setup-title">
                  {showKeyManager ? "manage groq keys" : "ai chat setup"}
                </h2>
                <p className="chat-setup-desc">
                  Paste one or more Groq API keys below. Get a key from{" "}
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GroqCloud
                  </a>
                  .
                </p>

                <form onSubmit={handleSaveKeys} className="chat-setup-form">
                  <div className="chat-setup-field">
                    <label htmlFor="api-keys-input" className="chat-setup-label">
                      groq api keys:
                    </label>
                    <textarea
                      id="api-keys-input"
                      className="chat-setup-textarea"
                      placeholder={"gsk_...\ngsk_..."}
                      value={tempKeys}
                      onChange={(e) => setTempKeys(e.target.value)}
                      required
                    />
                  </div>
                  <div className="chat-setup-actions">
                    {showKeyManager && (
                      <button
                        type="button"
                        className="chat-setup-btn secondary"
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
                    Or use <code className="chat-code">VITE_GROQ_API_KEY</code> in{" "}
                    <code className="chat-code">.env</code>.
                  </p>
                )}
              </div>
            ) : loading ? (
              <div className="chat-loading">loading...</div>
            ) : (
              <>
                <div className="chat-header-info">
                  <div className="chat-header-left-pane">
                    <div className="chat-avatar-wrap">
                      <PetImage mood={activeMood} className="chat-header-pet" />
                    </div>
                    <div className="chat-header-text">
                      <div className="chat-header-title-row">
                        <span className="chat-pet-name">kitty ai</span>
                        <button
                          type="button"
                          className="chat-header-manage-keys-btn"
                          onClick={() => setShowKeyManager(true)}
                          title="Manage Groq API keys"
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

                <form className="chat-input-form" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    className="chat-input-field"
                    placeholder={
                      isToday ? "Talk to Kitty..." : "Chatting disabled in history"
                    }
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    maxLength={400}
                    disabled={aiChatDisabled}
                    required
                  />
                  <button
                    type="submit"
                    className="chat-send-btn"
                    disabled={aiChatDisabled || !inputText.trim()}
                  >
                    send
                  </button>
                </form>
              </>
            )}
          </div>
        ) : (
          <div className="chat-panel">
            <div className="chat-header-info">
              <div className="chat-header-left-pane">
                <div className={`chat-status-dot ${realtimeStatus}`} />
                <div className="chat-header-text">
                  <span className="chat-pet-name">real time room</span>
                  <span className="chat-mood-badge">
                    {realtimeStatus === "online"
                      ? `${onlineCount} online`
                      : realtimeStatus}
                  </span>
                </div>
              </div>

              <form className="chat-name-form" onSubmit={handleDisplayNameSave}>
                <input
                  className="chat-name-input"
                  value={draftDisplayName}
                  onChange={(e) => setDraftDisplayName(e.target.value)}
                  maxLength={32}
                  aria-label="Display name"
                />
                <button type="submit" className="chat-history-return-btn">
                  save
                </button>
              </form>
            </div>

            <div className="chat-messages-container">
              {realtimeMessages.length === 0 && (
                <div className="chat-realtime-empty">
                  No messages yet. Say hello when someone else is here.
                </div>
              )}

              {realtimeMessages.map((msg) => {
                const mine = msg.senderName === displayName;
                return (
                  <div
                    key={msg.id}
                    className={`chat-message-row ${mine ? "user" : "friend"}`}
                  >
                    <div className={`chat-bubble ${mine ? "user" : "friend"}`}>
                      <span className="chat-sender-name">{msg.senderName}</span>
                      <p className="chat-msg-text">{msg.text}</p>
                    </div>
                  </div>
                );
              })}

              <div ref={realtimeEndRef} />
            </div>

            {realtimeStatus !== "online" && (
              <div className="chat-history-banner">
                <span>Start the Socket.IO server to chat with other users.</span>
              </div>
            )}

            <form className="chat-input-form" onSubmit={handleRealtimeSend}>
              <input
                type="text"
                className="chat-input-field"
                placeholder={
                  realtimeStatus === "online"
                    ? "Message everyone..."
                    : "Waiting for chat server"
                }
                value={realtimeInput}
                onChange={(e) => setRealtimeInput(e.target.value)}
                maxLength={500}
                disabled={realtimeStatus !== "online"}
                required
              />
              <button
                type="submit"
                className="chat-send-btn"
                disabled={realtimeStatus !== "online" || !realtimeInput.trim()}
              >
                send
              </button>
            </form>
          </div>
        )}
      </div>
    </PawseWindow>
  );
}
