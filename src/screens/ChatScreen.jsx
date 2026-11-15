import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PawseWindow from "../components/PawseWindow";
import PetImage from "../components/PetImage";
import { getMoodById } from "../data/moods";
import { sendChatMessage } from "../logic/groq";
import { fetchLatestMoodLog } from "../logic/moodLogs";
import { getAllUsers } from "../lib/profiles";
import {
  sendPrivateMessage,
  editPrivateMessage,
  deletePrivateMessage,
  fetchPrivateMessages,
  fetchRecentConversations,
  fetchMessageReactions,
  toggleMessageReaction,
  subscribeToPrivateMessages,
  subscribeToMessageReactions,
  subscribeToTypingPresence,
} from "../logic/privateMessages";
import EmojiPicker from "emoji-picker-react";
import "../styles/ChatScreen.css";

// Quick-tap reactions shown in the message toolbar.
const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "🙏", "👍"];

function getTodayDateString() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Generate unique soft color for user avatar
function getAvatarColor(username) {
  const name = username || "User";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "#f28482", // soft red
    "#84a59d", // soft teal
    "#f5cac3", // soft pink
    "#f7bc74", // soft orange
    "#a8dadc", // soft blue
    "#b5e2fa", // baby blue
    "#ccd5ae", // olive pastel
    "#e8c5e5", // lavender
  ];
  return colors[Math.abs(hash) % colors.length];
}

function formatMessageTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatPreviewTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const isToday = d.toDateString() === new Date().toDateString();
  return isToday
    ? formatMessageTime(dateStr)
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ChatScreen({ userId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);
  const realtimeEndRef = useRef(null);
  const realtimeInputRef = useRef(null);

  const [chatMode, setChatMode] = useState(location.state?.mode || "realtime");

  const [selectedDate, setSelectedDate] = useState(
    () => location.state?.date || getTodayDateString()
  );
  const [messages, setMessages] = useState([]);
  const [todayMood, setTodayMood] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState("");

  // Friends & DM state
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFriend, setActiveFriend] = useState(null);
  const [realtimeMessages, setRealtimeMessages] = useState([]);
  const [realtimeInput, setRealtimeInput] = useState("");

  // Sidebar starts open
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Other user typing status
  const [friendIsTyping, setFriendIsTyping] = useState(false);
  const friendTypingTimerRef = useRef(null);
  const broadcastTypingRef = useRef(null);
  const typingBroadcastTimerRef = useRef(null);

  // Reactions: { [messageId]: [{ message_id, user_id, emoji }, ...] }
  const [reactionsByMessage, setReactionsByMessage] = useState({});

  // Sidebar last-message previews: { [friendId]: messageObject }
  const [lastMessages, setLastMessages] = useState({});

  // Message reaction menu
  const [openMenuFor, setOpenMenuFor] = useState(null); // message id
  const menuRef = useRef(null);

  // Reply / edit state
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");

  // Emoji picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);

  // Close emoji picker when clicking outside
  useEffect(() => {
    if (!showEmojiPicker) return;
    function handleClick(e) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showEmojiPicker]);

  // Close message toolbar when clicking outside
  useEffect(() => {
    if (!openMenuFor) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuFor(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenuFor]);

  // Fetch users/friends
  useEffect(() => {
    if (!userId) return;
    getAllUsers(userId).then((users) => {
      // Robust mapping to make sure every user has a username
      const sanitized = (users || []).map((u) => ({
        ...u,
        username: u.username || `User_${u.id.substring(0, 4)}`,
      }));
      setFriends(sanitized);
    });
  }, [userId]);

  // Load last-message previews for the sidebar
  useEffect(() => {
    if (!userId || friends.length === 0) return;
    fetchRecentConversations(userId, friends.map((f) => f.id)).then(setLastMessages);
  }, [userId, friends]);

  // Load AI chat history
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
          if (isToday) loggedMood = getMoodById(latest.mood, userId);
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
      } catch (err) {
        console.error("Failed loading chat:", err);
        setError("Could not load your AI chat history right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadChatForDate();
    return () => { cancelled = true; };
  }, [userId, selectedDate]);

  // Handle DM subscription and history loading
  useEffect(() => {
    if (chatMode !== "realtime" || !activeFriend?.id || !userId) return;

    let mounted = true;
    let subscription = null;
    let reactionSubscription = null;
    let unsubscribeTyping = null;

    setRealtimeMessages([]);
    setFriendIsTyping(false);
    setReactionsByMessage({});
    setReplyingTo(null);
    setEditingMessageId(null);

    try {
      fetchPrivateMessages(userId, activeFriend.id).then((history) => {
        if (!mounted) return;
        setRealtimeMessages(history || []);
        const messageIds = (history || []).map((m) => m?.id).filter(Boolean);
        if (messageIds.length > 0) {
          fetchMessageReactions(messageIds).then((reactions) => {
            if (!mounted) return;
            const grouped = {};
            (reactions || []).forEach((r) => {
              if (r && r.message_id) {
                if (!grouped[r.message_id]) grouped[r.message_id] = [];
                grouped[r.message_id].push(r);
              }
            });
            setReactionsByMessage(grouped);
          });
        }
      }).catch((err) => {
        console.error("fetchPrivateMessages error", err);
        setError("Failed to fetch messages.");
      });

      subscription = subscribeToPrivateMessages(
        userId,
        activeFriend.id,
        (newMsg) => {
          if (!mounted || !newMsg) return;
          setRealtimeMessages((current) => {
            if (current.some((m) => m?.id === newMsg.id)) return current;
            return [...current, newMsg];
          });
          const otherId = newMsg.sender_id === userId ? newMsg.recipient_id : newMsg.sender_id;
          setLastMessages((prev) => ({ ...prev, [otherId]: newMsg }));
        },
        (updatedMsg) => {
          if (!mounted || !updatedMsg) return;
          setRealtimeMessages((current) =>
            current.map((m) => (m?.id === updatedMsg.id ? updatedMsg : m))
          );
          setLastMessages((prev) => {
            const otherId = updatedMsg.sender_id === userId ? updatedMsg.recipient_id : updatedMsg.sender_id;
            if (prev[otherId]?.id !== updatedMsg.id) return prev;
            return { ...prev, [otherId]: updatedMsg };
          });
        }
      );

      reactionSubscription = subscribeToMessageReactions((payload) => {
        if (!mounted || !payload) return;
        const row = payload.new?.message_id ? payload.new : payload.old;
        if (!row) return;
        setReactionsByMessage((prev) => {
          const list = (prev[row.message_id] || []).filter((r) => r?.user_id !== row.user_id);
          if (payload.eventType !== "DELETE" && payload.new) list.push(payload.new);
          return { ...prev, [row.message_id]: list };
        });
      });

      const typingRes = subscribeToTypingPresence(
        userId,
        activeFriend.id,
        userId,
        (isTyping) => {
          if (!mounted) return;
          setFriendIsTyping(isTyping);
          clearTimeout(friendTypingTimerRef.current);
          if (isTyping) {
            friendTypingTimerRef.current = setTimeout(() => setFriendIsTyping(false), 3000);
          }
        }
      );
      broadcastTypingRef.current = typingRes.broadcastTyping;
      unsubscribeTyping = typingRes.unsubscribe;
    } catch (err) {
      console.error("realtime init error", err);
      setError("Failed to connect to realtime chat.");
    }

    return () => {
      mounted = false;
      clearTimeout(friendTypingTimerRef.current);
      clearTimeout(typingBroadcastTimerRef.current);
      broadcastTypingRef.current = null;
      try {
        if (subscription?.unsubscribe) subscription.unsubscribe();
      } catch (e) {
        console.warn("Unsubscribe message error", e);
      }
      try {
        if (reactionSubscription?.unsubscribe) reactionSubscription.unsubscribe();
      } catch (e) {
        console.warn("Unsubscribe reaction error", e);
      }
      try {
        if (unsubscribeTyping) unsubscribeTyping();
      } catch (e) {
        console.warn("Unsubscribe typing error", e);
      }
    };
  }, [chatMode, activeFriend?.id, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    realtimeEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [realtimeMessages, friendIsTyping]);

  async function handleSendMessage(e) {
    e.preventDefault();
    const text = inputText.trim();
    const todayStr = getTodayDateString();
    if (!text || isTyping || selectedDate !== todayStr) return;

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
        todayMood ? todayMood.label.toLowerCase() : null
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

  // Handle typing broadcast on input change
  function handleRealtimeInputChange(e) {
    setRealtimeInput(e.target.value);
    if (broadcastTypingRef.current) {
      broadcastTypingRef.current(true);
      clearTimeout(typingBroadcastTimerRef.current);
      typingBroadcastTimerRef.current = setTimeout(() => {
        broadcastTypingRef.current?.(false);
      }, 2000);
    }
  }

  // Optimistic private message sending
  async function handleRealtimeSend(e) {
    e.preventDefault();
    const text = realtimeInput.trim();
    if (!text || !activeFriend?.id || !userId) return;

    setError("");
    setRealtimeInput("");
    setShowEmojiPicker(false);
    broadcastTypingRef.current?.(false);
    const replyToId = replyingTo?.id || null;
    setReplyingTo(null);

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMsg = {
      id: optimisticId,
      sender_id: userId,
      recipient_id: activeFriend.id,
      text,
      reply_to_id: replyToId,
      created_at: new Date().toISOString(),
    };
    setRealtimeMessages((prev) => [...prev, optimisticMsg]);

    try {
      const savedMsg = await sendPrivateMessage(userId, activeFriend.id, text, replyToId);
      setRealtimeMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? savedMsg : m))
      );
      setLastMessages((prev) => ({ ...prev, [activeFriend.id]: savedMsg }));
    } catch (err) {
      console.error(err);
      setRealtimeMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setError("Failed to send message. Try again?");
    }
  }

  function startReply(msg) {
    setEditingMessageId(null);
    setReplyingTo(msg);
    setOpenMenuFor(null);
    realtimeInputRef.current?.focus();
  }

  function startEdit(msg) {
    setReplyingTo(null);
    setEditingMessageId(msg.id);
    setEditingText(msg.text || "");
    setOpenMenuFor(null);
  }

  function cancelEdit() {
    setEditingMessageId(null);
    setEditingText("");
  }

  async function saveEdit(messageId) {
    const trimmed = editingText.trim();
    if (!trimmed) return;
    try {
      const updated = await editPrivateMessage(messageId, userId, trimmed);
      setRealtimeMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
    } catch (err) {
      console.error(err);
      setError("Couldn't edit that message.");
    } finally {
      setEditingMessageId(null);
      setEditingText("");
    }
  }

  async function handleDeleteMessage(messageId) {
    setOpenMenuFor(null);
    try {
      const updated = await deletePrivateMessage(messageId, userId);
      setRealtimeMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
    } catch (err) {
      console.error("Delete failed:", err);
      setError(err.message ? `Couldn't delete: ${err.message}` : "Couldn't delete that message.");
    }
  }

  async function handleReact(messageId, emoji) {
    const mine = reactionsByMessage[messageId]?.find((r) => r.user_id === userId);
    setOpenMenuFor(null);
    try {
      await toggleMessageReaction(messageId, userId, emoji, mine?.emoji);
      setReactionsByMessage((prev) => {
        const list = (prev[messageId] || []).filter((r) => r.user_id !== userId);
        if (mine?.emoji !== emoji) list.push({ message_id: messageId, user_id: userId, emoji });
        return { ...prev, [messageId]: list };
      });
    } catch (err) {
      console.error(err);
      setError("Couldn't react to that message.");
    }
  }

  function handleDoubleClickMessage(messageId) {
    handleReact(messageId, "❤️");
  }

  const insertEmoji = useCallback((emoji) => {
    setRealtimeInput((prev) => prev + emoji);
    realtimeInputRef.current?.focus();
  }, []);

  const isToday = selectedDate === getTodayDateString();
  const activeMood = todayMood || { id: "calm", label: "Calm", image: "calm.png" };
  const aiChatDisabled = !isToday || isTyping;

  // Filter + sort: most recent conversation first, then alphabetical
  const filteredFriends = friends
    .filter((f) => (f.username || "").toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const aTime = lastMessages[a.id]?.created_at ? new Date(lastMessages[a.id].created_at).getTime() : 0;
      const bTime = lastMessages[b.id]?.created_at ? new Date(lastMessages[b.id].created_at).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      return (a.username || "").localeCompare(b.username || "");
    });

  const activeFriendName = activeFriend?.username || "User";

  return (
    <PawseWindow title="chat" onBack={() => navigate("/home")}>
      <div className="pawse-inner-card chat-inner-card">
        {/* Toggle navigation */}
        <div className="chat-toggle-container" aria-label="Chat mode">
          <button
            type="button"
            className={`chat-toggle-btn ${chatMode === "realtime" ? "active" : ""}`}
            onClick={() => setChatMode("realtime")}
          >
            friends
          </button>
          <button
            type="button"
            className={`chat-toggle-btn ${chatMode === "ai" ? "active" : ""}`}
            onClick={() => setChatMode("ai")}
          >
            kitty
          </button>
        </div>

        {chatMode === "ai" ? (
          /* ── AI Chat Panel ────────────────────────────────────────── */
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
                    <input
                      type="date"
                      aria-label="Chat history date"
                      className="chat-history-select"
                      value={selectedDate}
                      max={getTodayDateString()}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        setSelectedDate(e.target.value);
                        setError("");
                      }}
                    />
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
                        <span className="chat-typing-dots">Kitty is typing</span>
                        <span className="chat-typing-dot-anim">
                          <span>.</span><span>.</span><span>.</span>
                        </span>
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
                    placeholder={isToday ? "Talk to Kitty..." : "Chatting disabled in history"}
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
          /* ── Friends DM Mode ─────────────────────────────────────── */
          <div className="chat-friends-layout">

            {/* Friends sidebar — side-by-side (non-overlay) layout */}
            {sidebarOpen && (
              <div className="chat-friends-sidebar">
                <div className="chat-friends-sidebar-header">
                  <span>chats</span>
                  <button
                    type="button"
                    className="chat-sidebar-close-btn"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Collapse sidebar"
                    title="Collapse sidebar"
                  >
                    ‹
                  </button>
                </div>

                {/* Search Bar for Friends */}
                <div className="chat-sidebar-search">
                  <input
                    type="text"
                    placeholder="Search chats..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="chat-sidebar-search-input"
                  />
                </div>

                <div className="chat-friends-list">
                  {filteredFriends.length === 0 ? (
                    <div className="chat-friends-empty">no chats found</div>
                  ) : (
                    filteredFriends.map((friend) => {
                      const name = friend.username || "User";
                      const lastMsg = lastMessages[friend.id];
                      const previewText = !lastMsg
                        ? "say hi 👋"
                        : lastMsg.deleted_at
                          ? (lastMsg.sender_id === userId ? "you deleted a message" : "message was deleted")
                          : `${lastMsg.sender_id === userId ? "you: " : ""}${(lastMsg.text || "").slice(0, 28)}`;

                      return (
                        <button
                          key={friend.id}
                          type="button"
                          className={`chat-friend-item ${activeFriend?.id === friend.id ? "active" : ""}`}
                          onClick={() => {
                            setActiveFriend(friend);
                            setError("");
                          }}
                        >
                          <div
                            className="friend-avatar-circle"
                            style={{ backgroundColor: getAvatarColor(name) }}
                          >
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div className="chat-friend-item-text">
                            <div className="chat-friend-item-top-row">
                              <span className="chat-friend-name">{name}</span>
                              {lastMsg && (
                                <span className="chat-friend-item-time">
                                  {formatPreviewTime(lastMsg.created_at)}
                                </span>
                              )}
                            </div>
                            <span className="chat-friend-item-preview">{previewText}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Main Chat Area */}
            <div className="chat-friends-main">
              {/* Header only renders once a conversation is active — otherwise the
                  placeholder card below fills the whole column, arrow and all. */}
              {activeFriend && (
                <div className="chat-header-info">
                  <div className="chat-header-left-pane">
                    {!sidebarOpen && (
                      <button
                        type="button"
                        className="chat-friends-arrow"
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Open sidebar"
                      >
                        <span>›</span>
                      </button>
                    )}

                    <div className="chat-status-dot online" />
                    <div className="chat-header-text">
                      <span className="chat-pet-name">{activeFriendName}</span>
                      {friendIsTyping && (
                        <span className="chat-friend-typing-label">
                          typing
                          <span className="chat-typing-dot-anim">
                            <span>.</span><span>.</span><span>.</span>
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeFriend ? (
                <div className="chat-panel">
                  <div className="chat-messages-container with-toolbar-space">
                    {realtimeMessages.length === 0 && (
                      <div className="chat-realtime-empty">
                        No messages yet. Say hello to {activeFriendName}!
                      </div>
                    )}

                    {realtimeMessages.map((msg) => {
                      if (!msg) return null;
                      const mine = msg.sender_id === userId;
                      const isOptimistic = String(msg.id || "").startsWith("optimistic-");
                      const isDeleted = !!msg.deleted_at;
                      const isEditing = editingMessageId === msg.id;
                      const repliedMsg = msg.reply_to_id
                        ? realtimeMessages.find((m) => m?.id === msg.reply_to_id)
                        : null;
                      const reactions = reactionsByMessage[msg.id] || [];
                      const menuOpen = openMenuFor === msg.id;

                      return (
                        <div
                          key={msg.id}
                          className={`chat-message-row ${mine ? "user" : "friend"}`}
                        >
                          <div className={`chat-bubble-stack ${mine ? "user" : "friend"}`}>

                            {/* Floating Reaction Toolbar — Absolute positioned on top of the bubble */}
                            {menuOpen && !isDeleted && !isOptimistic && (
                              <div
                                className={`chat-msg-toolbar ${mine ? "user" : "friend"}`}
                                ref={menuRef}
                              >
                                {/* Row 1: Reactions */}
                                <div className="chat-toolbar-row chat-toolbar-row-emojis">
                                  {QUICK_REACTIONS.map((emoji) => (
                                    <button
                                      type="button"
                                      key={emoji}
                                      className="chat-toolbar-emoji"
                                      onClick={() => handleReact(msg.id, emoji)}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                                {/* Row 2: Actions */}
                                <div className="chat-toolbar-row chat-toolbar-row-actions">
                                  <button
                                    type="button"
                                    className="chat-toolbar-btn"
                                    onClick={() => startReply(msg)}
                                    aria-label="Reply"
                                  >
                                    <span className="chat-toolbar-btn-icon">↩</span>
                                    <span className="chat-toolbar-btn-label">reply</span>
                                  </button>
                                  {mine && (
                                    <button
                                      type="button"
                                      className="chat-toolbar-btn"
                                      onClick={() => startEdit(msg)}
                                      aria-label="Edit"
                                    >
                                      <span className="chat-toolbar-btn-icon">✎</span>
                                      <span className="chat-toolbar-btn-label">edit</span>
                                    </button>
                                  )}
                                  {mine && (
                                    <button
                                      type="button"
                                      className="chat-toolbar-btn chat-toolbar-btn-delete"
                                      onClick={() => handleDeleteMessage(msg.id)}
                                      aria-label="Delete"
                                    >
                                      <span className="chat-toolbar-btn-icon">🗑</span>
                                      <span className="chat-toolbar-btn-label">delete</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Chat bubble */}
                            <div
                              className={`chat-bubble ${mine ? "user" : "friend"} ${isOptimistic ? "optimistic" : ""} ${isDeleted ? "deleted" : ""}`}
                              onDoubleClick={() =>
                                !isDeleted && !isOptimistic && handleDoubleClickMessage(msg.id)
                              }
                            >
                              {!isOptimistic && !isDeleted && (
                                <button
                                  type="button"
                                  className="chat-bubble-arrow"
                                  onClick={() =>
                                    setOpenMenuFor((cur) => (cur === msg.id ? null : msg.id))
                                  }
                                  aria-label="Message options"
                                >
                                  ⌄
                                </button>
                              )}

                              {repliedMsg && (
                                <div className="chat-reply-quote">
                                  <span className="chat-reply-quote-author">
                                    {repliedMsg.sender_id === userId ? "you" : activeFriendName}
                                  </span>
                                  <span className="chat-reply-quote-text">
                                    {repliedMsg.deleted_at
                                      ? "this message was deleted"
                                      : (repliedMsg.text || "").slice(0, 80)}
                                  </span>
                                </div>
                              )}

                              {isDeleted ? (
                                <p className="chat-msg-text chat-msg-deleted">
                                  {mine ? "you deleted this message" : "this message was deleted"}
                                </p>
                              ) : isEditing ? (
                                <div className="chat-edit-row">
                                  <input
                                    type="text"
                                    className="chat-edit-input"
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveEdit(msg.id);
                                      if (e.key === "Escape") cancelEdit();
                                    }}
                                    autoFocus
                                    maxLength={500}
                                  />
                                  <button
                                    type="button"
                                    className="chat-edit-save-btn"
                                    onClick={() => saveEdit(msg.id)}
                                  >
                                    ✓
                                  </button>
                                  <button
                                    type="button"
                                    className="chat-edit-cancel-btn"
                                    onClick={cancelEdit}
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <p className="chat-msg-text">
                                    {msg.text}
                                    {msg.edited_at && (
                                      <span className="chat-msg-edited-tag"> (edited)</span>
                                    )}
                                  </p>
                                  <span className="chat-msg-time">
                                    {formatMessageTime(msg.created_at)}
                                  </span>
                                </>
                              )}

                              {/* Reactions inside the bubble (always visible if added) */}
                              {reactions.length > 0 && (
                                <div className="chat-reaction-row">
                                  {reactions.map((r) => {
                                    if (!r) return null;
                                    return (
                                      <button
                                        key={r.id || r.user_id}
                                        type="button"
                                        className={`chat-reaction-pill ${r.user_id === userId ? "mine" : ""}`}
                                        onClick={() => handleReact(msg.id, r.emoji)}
                                        title={r.user_id === userId ? "Remove reaction" : "React"}
                                      >
                                        {r.emoji}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Friend typing message block */}
                    {friendIsTyping && (
                      <div className="chat-message-row friend">
                        <div className="chat-bubble friend chat-bubble-typing-indicator">
                          <span className="chat-typing-dot-anim">
                            <span>.</span><span>.</span><span>.</span>
                          </span>
                        </div>
                      </div>
                    )}

                    <div ref={realtimeEndRef} />
                  </div>

                  {error && (
                    <div className="chat-feedback chat-error">
                      <span className="chat-feedback-icon">!</span>
                      {error}
                    </div>
                  )}

                  {replyingTo && (
                    <div className="chat-reply-preview">
                      <div className="chat-reply-preview-text">
                        <span className="chat-reply-preview-author">
                          replying to {replyingTo.sender_id === userId ? "yourself" : activeFriendName}
                        </span>
                        <span className="chat-reply-preview-snippet">
                          {(replyingTo.text || "").slice(0, 60)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="chat-reply-preview-close"
                        onClick={() => setReplyingTo(null)}
                        aria-label="Cancel reply"
                      >
                        &times;
                      </button>
                    </div>
                  )}

                  <form className="chat-input-form" onSubmit={handleRealtimeSend}>
                    <div className="chat-input-wrap">
                      <button
                        type="button"
                        className={`chat-emoji-toggle-btn ${showEmojiPicker ? "active" : ""}`}
                        onClick={() => setShowEmojiPicker((v) => !v)}
                        aria-label="Add emoji"
                      >
                        🙂
                      </button>
                      {showEmojiPicker && (
                        <div className="chat-emoji-picker" ref={emojiPickerRef}>
                          <EmojiPicker
                            onEmojiClick={(emojiData) => insertEmoji(emojiData.emoji)}
                            width={280}
                            height={320}
                            previewConfig={{ showPreview: false }}
                            skinTonesDisabled
                          />
                        </div>
                      )}
                      <input
                        ref={realtimeInputRef}
                        type="text"
                        className="chat-input-field chat-input-field-with-emoji"
                        placeholder={`Message ${activeFriendName}...`}
                        value={realtimeInput}
                        onChange={handleRealtimeInputChange}
                        maxLength={500}
                        required
                      />
                    </div>
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
                  {!sidebarOpen && (
                    <button
                      type="button"
                      className="chat-friends-arrow"
                      onClick={() => setSidebarOpen(true)}
                      aria-label="Open sidebar"
                    >
                      <span>›</span>
                    </button>
                  )}
                  <img src="/icons/paw.png" alt="" className="chat-placeholder-icon" />
                  <h3>Pawse Web</h3>
                  <p>Select a chat from the sidebar to start messaging. Connect with your friends and share your moods!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PawseWindow>
  );
}