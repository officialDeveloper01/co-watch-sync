const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Enable CORS for all routes
app.use(cors({
  origin: "http://localhost:8080",
  methods: ["GET", "POST"],
  credentials: true
}));

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:8080",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store room information
const rooms = new Map();

// Utility function to get room info
function getRoomInfo(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      users: new Map(),
      peersCount: 0
    });
  }
  return rooms.get(roomId);
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Handle joining a room
  socket.on('join-room', (data) => {
    const { roomId, isHost, username } = data;
    
    // Leave any existing rooms
    Array.from(socket.rooms).forEach(room => {
      if (room !== socket.id) {
        socket.leave(room);
      }
    });

    // Join the new room
    socket.join(roomId);
    
    const room = getRoomInfo(roomId);
    room.users.set(socket.id, {
      username: username || `User${Math.floor(Math.random() * 1000)}`,
      isHost,
      joinedAt: new Date()
    });
    
    room.peersCount = room.users.size;
    
    console.log(`User ${socket.id} joined room ${roomId} as ${isHost ? 'host' : 'guest'}`);
    
    // Notify the user they joined successfully
    socket.emit('room-joined', {
      roomId,
      peersCount: room.peersCount,
      isHost
    });
    
    // Notify others in the room
    socket.to(roomId).emit('peer-joined', {
      peerId: socket.id,
      peersCount: room.peersCount,
      username: room.users.get(socket.id).username
    });
    
    // If there are 2 users, initiate WebRTC connection
    if (room.peersCount === 2) {
      // Tell the host to create an offer
      const hostSocket = Array.from(room.users.entries())
        .find(([_, user]) => user.isHost)?.[0];
      
      if (hostSocket) {
        io.to(hostSocket).emit('ready-to-connect');
      }
    }
  });

  // Handle WebRTC signaling
  socket.on('offer', (data) => {
    console.log('Relaying offer for room:', data.roomId);
    socket.to(data.roomId).emit('offer', {
      offer: data.offer,
      peerId: socket.id
    });
  });

  socket.on('answer', (data) => {
    console.log('Relaying answer for room:', data.roomId);
    socket.to(data.roomId).emit('answer', {
      answer: data.answer,
      peerId: socket.id
    });
  });

  socket.on('ice-candidate', (data) => {
    console.log('Relaying ICE candidate for room:', data.roomId);
    socket.to(data.roomId).emit('ice-candidate', {
      candidate: data.candidate,
      peerId: socket.id
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Find and clean up user from all rooms
    rooms.forEach((room, roomId) => {
      if (room.users.has(socket.id)) {
        const user = room.users.get(socket.id);
        room.users.delete(socket.id);
        room.peersCount = room.users.size;
        
        // Notify others in the room
        socket.to(roomId).emit('peer-left', {
          peerId: socket.id,
          peersCount: room.peersCount,
          username: user.username
        });
        
        // Clean up empty rooms
        if (room.peersCount === 0) {
          rooms.delete(roomId);
          console.log(`Deleted empty room: ${roomId}`);
        }
        
        console.log(`User ${socket.id} left room ${roomId}`);
      }
    });
  });

  // Handle room cleanup
  socket.on('leave-room', (data) => {
    const { roomId } = data;
    
    socket.leave(roomId);
    
    const room = getRoomInfo(roomId);
    if (room.users.has(socket.id)) {
      const user = room.users.get(socket.id);
      room.users.delete(socket.id);
      room.peersCount = room.users.size;
      
      // Notify others
      socket.to(roomId).emit('peer-left', {
        peerId: socket.id,
        peersCount: room.peersCount,
        username: user.username
      });
      
      console.log(`User ${socket.id} left room ${roomId}`);
    }
  });
});

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    activeRooms: rooms.size,
    totalUsers: Array.from(rooms.values()).reduce((sum, room) => sum + room.peersCount, 0)
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
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server shutdown complete');
    process.exit(0);
  });
});