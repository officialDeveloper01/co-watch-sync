import express from "express";
import http from "http";
import { Server as SocketIoServer } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);

// Enable CORS for all routes
app.use(
  cors({
    origin: "http://localhost:8080",
    methods: ["GET", "POST"],
    credentials: true,
  })
);

const io = new SocketIoServer(server, {
  cors: {
    origin: "http://localhost:8080",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Store room information
const rooms = new Map();

// Utility: get existing room
function getRoom(roomId) {
  return rooms.get(roomId);
}

// Ensure room exists
function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { users: new Map(), peersCount: 0 });
  }
  return rooms.get(roomId);
}

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Handle joining a room
  socket.on("join-room", (data) => {
    const { roomId, isHost, username } = data;

    // Leave all previous rooms except own socket room
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.leave(room);
      }
    }

    // Join new room
    socket.join(roomId);

    const room = getOrCreateRoom(roomId);
    room.users.set(socket.id, {
      username: username || `User${Math.floor(Math.random() * 1000)}`,
      isHost,
      joinedAt: new Date(),
    });
    room.peersCount = room.users.size;

    console.log(
      `User ${socket.id} joined room ${roomId} as ${isHost ? "host" : "guest"}`
    );

    // Notify the user
    socket.emit("room-joined", {
      roomId,
      peersCount: room.peersCount,
      isHost,
    });

    // Notify others
    socket.to(roomId).emit("peer-joined", {
      peerId: socket.id,
      peersCount: room.peersCount,
      username: room.users.get(socket.id).username,
    });

    // If 2 users, start WebRTC
    if (room.peersCount === 2) {
      const hostSocket = [...room.users.entries()].find(
        ([, user]) => user.isHost
      )?.[0];
      if (hostSocket) {
        io.to(hostSocket).emit("ready-to-connect");
      }
    }
  });

  // WebRTC signaling relay
  socket.on("offer", ({ roomId, offer }) => {
    console.log("Relaying offer for room:", roomId);
    socket.to(roomId).emit("offer", { offer, peerId: socket.id });
  });

  socket.on("answer", ({ roomId, answer }) => {
    console.log("Relaying answer for room:", roomId);
    socket.to(roomId).emit("answer", { answer, peerId: socket.id });
  });

  socket.on("ice-candidate", ({ roomId, candidate }) => {
    console.log("Relaying ICE candidate for room:", roomId);
    socket.to(roomId).emit("ice-candidate", { candidate, peerId: socket.id });
  });

  // Handle room leave
  socket.on("leave-room", ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room) return;

    socket.leave(roomId);

    if (room.users.has(socket.id)) {
      const user = room.users.get(socket.id);
      room.users.delete(socket.id);
      room.peersCount = room.users.size;

      socket.to(roomId).emit("peer-left", {
        peerId: socket.id,
        peersCount: room.peersCount,
        username: user.username,
      });

      console.log(`User ${socket.id} left room ${roomId}`);

      if (room.peersCount === 0) {
        rooms.delete(roomId);
        console.log(`Deleted empty room: ${roomId}`);
      }
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);

    rooms.forEach((room, roomId) => {
      if (room.users.has(socket.id)) {
        const user = room.users.get(socket.id);
        room.users.delete(socket.id);
        room.peersCount = room.users.size;

        socket.to(roomId).emit("peer-left", {
          peerId: socket.id,
          peersCount: room.peersCount,
          username: user.username,
        });

        if (room.peersCount === 0) {
          rooms.delete(roomId);
          console.log(`Deleted empty room: ${roomId}`);
        }

        console.log(`User ${socket.id} left room ${roomId}`);
      }
    });
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    activeRooms: rooms.size,
    totalUsers: [...rooms.values()].reduce(
      (sum, room) => sum + room.peersCount,
      0
    ),
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 WebSocket server ready for connections`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down server...");
  server.close(() => {
    console.log("✅ Server shutdown complete");
    process.exit(0);
  });
});
