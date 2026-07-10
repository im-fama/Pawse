import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PawseWindow from "../components/PawseWindow";
import PetImage from "../components/PetImage";
import { getMoodById } from "../data/moods";
import { sendChatMessage } from "../logic/groq";
import { fetchLatestMoodLog } from "../logic/moodLogs";
import { getAllUsers } from "../lib/profiles";
import {
  sendPrivateMessage,
  fetchPrivateMessages,
  subscribeToPrivateMessages,
} from "../logic/privateMessages";
import "./ChatScreen.css";

// Read the Groq API key directly from environment
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

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

export default function ChatScreen({ userId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);
  const realtimeEndRef = useRef(null);

  const [chatMode, setChatMode] = useState(location.state?.mode || "ai");

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

  // Friends & DM state
  const [friends, setFriends] = useState([]);
  const [activeFriend, setActiveFriend] = useState(null);
  const [realtimeMessages, setRealtimeMessages] = useState([]);
  const [realtimeInput, setRealtimeInput] = useState("");

  // Fetch all users/friends
  useEffect(() => {
    if (!userId) return;
    getAllUsers(userId).then((users) => {
      setFriends(users);
    });
  }, [userId]);

  // Load AI chat dates
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

  // Load AI Chat history for selected date
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

  // Handle DM subscription and history loading
  useEffect(() => {
    if (chatMode !== "realtime" || !activeFriend?.id || !userId) return;

    let mounted = true;
    setRealtimeMessages([]);

    fetchPrivateMessages(userId, activeFriend.id).then((history) => {
      if (mounted) {
        setRealtimeMessages(history);
      }
    });

    const subscription = subscribeToPrivateMessages(userId, activeFriend.id, (newMsg) => {
      if (mounted) {
        setRealtimeMessages((current) => {
          if (current.some((m) => m.id === newMsg.id)) return current;
          return [...current, newMsg];
        });
      }
    });

    return () => {
      mounted = false;
      if (subscription?.unsubscribe) subscription.unsubscribe();
    };
  }, [chatMode, activeFriend?.id, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    realtimeEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [realtimeMessages]);

  async function handleSendMessage(e) {
    e.preventDefault();
    const text = inputText.trim();
    const todayStr = getTodayDateString();
    if (!text || isTyping || selectedDate !== todayStr || !GROQ_API_KEY) return;

    setError("");
    const newMsg = { sender: "user", text };
    const messagesWithUser = [...messages, newMsg];

    setMessages(messagesWithUser);
    setInputText("");
    setIsTyping(true);

    const chatKey = `pawse_chat_history_${userId}_${todayStr}`;
    localStorage.setItem(chatKey, JSON.stringify(messagesWithUser));

    try {
      const responseText = await sendChatMessage(
        messages,
        text,
        todayMood ? todayMood.label.toLowerCase() : null,
        GROQ_API_KEY
      );

      if (responseText) {
        const messagesWithKitty = [
          ...messagesWithUser,
          { sender: "kitty", text: responseText },
        ];
        setMessages(messagesWithKitty);
        localStorage.setItem(chatKey, JSON.stringify(messagesWithKitty));
      } else {
        setError("Kitty couldn't respond. Try again later.");
      }
    } catch (err) {
      console.warn("Groq API failed:", err);
      setError(err.message || "Kitty couldn't respond. Try again later.");
    } finally {
      setIsTyping(false);
    }
  }

  async function handleRealtimeSend(e) {
    e.preventDefault();
    const text = realtimeInput.trim();
    if (!text || !activeFriend?.id || !userId) return;

    setError("");
    try {
      const newMsg = await sendPrivateMessage(userId, activeFriend.id, text);
      setRealtimeMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setRealtimeInput("");
    } catch (err) {
      console.error(err);
      setError("Failed to send message. Try again?");
    }
  }

  const isToday = selectedDate === getTodayDateString();
  const activeMood = todayMood || { id: "calm", label: "Calm", image: "calm.png" };
  const aiChatDisabled = !isToday || isTyping || !GROQ_API_KEY;

  return (
    <PawseWindow title="chat" onBack={() => navigate("/home")}>
      <div className="pawse-inner-card chat-inner-card">
        {/* Toggle navigation */}
        <div className="chat-toggle-container" aria-label="Chat mode">
          <button
            type="button"
            className={`chat-toggle-btn ${chatMode === "ai" ? "active" : ""}`}
            onClick={() => setChatMode("ai")}
          >
            kitty
          </button>
          <button
            type="button"
            className={`chat-toggle-btn ${chatMode === "realtime" ? "active" : ""}`}
            onClick={() => setChatMode("realtime")}
          >
            chat with friends
          </button>
        </div>

        {chatMode === "ai" ? (
          <div className="chat-panel">
            {loading ? (
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
          <div className="chat-friends-layout">
            <div className="chat-friends-sidebar">
              <h3 className="chat-sidebar-title">friends</h3>
              <div className="chat-friends-list">
                {friends.length === 0 ? (
                  <div className="chat-friends-empty">no users found</div>
                ) : (
                  friends.map((friend) => (
                    <button
                      key={friend.id}
                      type="button"
                      className={`chat-friend-item ${
                        activeFriend?.id === friend.id ? "active" : ""
                      }`}
                      onClick={() => {
                        setActiveFriend(friend);
                        setError("");
                      }}
                    >
                      <span className="chat-friend-name">{friend.username}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="chat-friends-main">
              {activeFriend ? (
                <div className="chat-panel">
                  <div className="chat-header-info">
                    <div className="chat-header-left-pane">
                      <div className="chat-status-dot online" />
                      <div className="chat-header-text">
                        <span className="chat-pet-name">{activeFriend.username}</span>
                      </div>
                    </div>
                  </div>

                  <div className="chat-messages-container">
                    {realtimeMessages.length === 0 && (
                      <div className="chat-realtime-empty">
                        No messages yet. Say hello to {activeFriend.username}!
                      </div>
                    )}

                    {realtimeMessages.map((msg) => {
                      const mine = msg.sender_id === userId;
                      return (
                        <div
                          key={msg.id}
                          className={`chat-message-row ${mine ? "user" : "friend"}`}
                        >
                          <div className={`chat-bubble ${mine ? "user" : "friend"}`}>
                            <p className="chat-msg-text">{msg.text}</p>
                          </div>
                        </div>
                      );
                    })}

                    <div ref={realtimeEndRef} />
                  </div>

                  {error && (
                    <div className="chat-feedback chat-error">
                      <span className="chat-feedback-icon">!</span>
                      {error}
                    </div>
                  )}

                  <form className="chat-input-form" onSubmit={handleRealtimeSend}>
                    <input
                      type="text"
                      className="chat-input-field"
                      placeholder={`Message ${activeFriend.username}...`}
                      value={realtimeInput}
                      onChange={(e) => setRealtimeInput(e.target.value)}
                      maxLength={500}
                      required
                    />
                    <button
                      type="submit"
                      className="chat-send-btn"
                      disabled={!realtimeInput.trim()}
                    >
                      send
                    </button>
                  </form>
                </div>
              ) : (
                <div className="chat-friends-placeholder">
                  <img src="/icons/paw.png" alt="" className="chat-placeholder-icon" />
                  <p>select a friend to start chatting!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PawseWindow>
  );
}
