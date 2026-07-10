import { createServer } from "node:http";
import process from "node:process";
import { Server } from "socket.io";

const PORT = Number(process.env.CHAT_SERVER_PORT || 3001);
const DEFAULT_ROOM = "pawse-global";
const MAX_HISTORY = 50;

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, app: "pawse-chat" }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const roomHistory = new Map([[DEFAULT_ROOM, []]]);

function getRoomHistory(room) {
  if (!roomHistory.has(room)) {
    roomHistory.set(room, []);
  }
  return roomHistory.get(room);
}

function emitUserCount(room) {
  const count = io.sockets.adapter.rooms.get(room)?.size || 0;
  io.to(room).emit("room:user-count", count);
}

io.on("connection", (socket) => {
  let activeRoom = DEFAULT_ROOM;

  socket.on("room:join", ({ room = DEFAULT_ROOM, name = "friend", userId = null } = {}) => {
    const nextRoom = String(room).trim() || DEFAULT_ROOM;
    const displayName = String(name).trim().slice(0, 32) || "friend";

    if (activeRoom) {
      socket.leave(activeRoom);
      emitUserCount(activeRoom);
    }

    activeRoom = nextRoom;
    socket.data.name = displayName;
    socket.data.userId = userId ? String(userId) : null;
    socket.join(activeRoom);
    socket.emit("room:history", getRoomHistory(activeRoom));
    emitUserCount(activeRoom);
  });

  socket.on("chat:message", ({ room = activeRoom, text, name, userId } = {}) => {
    const cleanText = String(text || "").trim().slice(0, 500);
    if (!cleanText) return;

    const cleanRoom = String(room || DEFAULT_ROOM).trim() || DEFAULT_ROOM;
    const cleanName = String(name || socket.data.name || "friend").trim().slice(0, 32);
    const senderUserId = userId ? String(userId) : (socket.data.userId || null);
    const message = {
      id: `${Date.now()}-${socket.id}`,
      senderId: socket.id,
      senderUserId,
      senderName: cleanName || "friend",
      text: cleanText,
      createdAt: new Date().toISOString(),
    };

    const history = getRoomHistory(cleanRoom);
    history.push(message);
    if (history.length > MAX_HISTORY) {
      history.splice(0, history.length - MAX_HISTORY);
    }

    io.to(cleanRoom).emit("chat:message", message);
  });

  socket.on("disconnect", () => {
    emitUserCount(activeRoom);
  });
});

async function isExistingChatServerHealthy() {
  try {
    const response = await fetch(`http://localhost:${PORT}/health`);
    const data = await response.json().catch(() => ({}));
    return response.ok && data?.ok === true;
  } catch {
    return false;
  }
}

httpServer.on("error", async (error) => {
  if (error.code !== "EADDRINUSE") {
    console.error(error);
    process.exit(1);
  }

  const existingServerIsHealthy = await isExistingChatServerHealthy();
  if (existingServerIsHealthy) {
    console.log(
      `Pawse chat server is already running on http://localhost:${PORT}; reusing it.`
    );
    setInterval(() => {}, 2 ** 31 - 1);
    return;
  }

  console.error(
    `Port ${PORT} is already in use. Stop that process or set CHAT_SERVER_PORT and VITE_CHAT_SERVER_URL to another port.`
  );
  process.exit(1);
});

httpServer.listen(PORT, () => {
  console.log(`Pawse chat server listening on http://localhost:${PORT}`);
});
