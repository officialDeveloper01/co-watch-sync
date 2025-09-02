# 🎬 Watch Together - WebRTC Video Sync App

A beautiful WebRTC-based web application that allows two users to watch YouTube videos together in perfect sync while chatting in real-time.

## ✨ Features

- 🎥 **YouTube Video Synchronization** - Watch videos together with perfect sync
- 💬 **Real-time Chat** - Chat via WebRTC data channels with instant messaging
- 🔄 **Peer-to-Peer Connection** - Direct WebRTC connection between users
- 📱 **Responsive Design** - Beautiful dark theme optimized for video watching
- 🏠 **Room System** - Create or join rooms with simple room IDs
- 🎛️ **Player Controls** - Synchronized play, pause, and seek functionality
- 🌐 **Connection Status** - Real-time connection and peer count indicators

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### 1. Clone & Install Frontend Dependencies

The frontend React app is already set up. The dependencies are installed automatically.

### 2. Set Up the Signaling Server

The signaling server handles WebRTC negotiation between peers. You need to run it separately.

#### Install Server Dependencies

Create a new terminal window and run:

```bash
# Install server dependencies using the provided package.json
npm install --prefix . express socket.io cors nodemon
```

Or if you prefer, create the server in a separate directory:

```bash
# Create server directory
mkdir watch-together-server
cd watch-together-server

# Copy the server files
cp ../server.js .
cp ../package-server.json ./package.json

# Install dependencies
npm install
```

#### Start the Signaling Server

```bash
# From the root directory
node server.js

# OR if using nodemon for development
npx nodemon server.js

# OR from server directory
npm start
```

The server will start on `http://localhost:3001`

### 3. Start the Frontend

In your main terminal (or a new one):

```bash
# Start the Vite development server
npm run dev
```

The frontend will be available at `http://localhost:8080`

## 🎯 How to Use

### Creating a Room (Host)

1. **Open the app** in your browser at `http://localhost:8080`
2. **Paste a YouTube URL** in the "Create New Room" section
3. **Click "Create Room & Start Watching"**
4. **Share the Room ID** with your friend (displayed in the header)
5. **Wait for them to join** - you'll see the peer count update

### Joining a Room (Guest)

1. **Get the Room ID** from the host
2. **Enter the Room ID** in the "Join Existing Room" section
3. **Click "Join Room"**
4. **Start watching together!** The video will automatically load

### Watching Together

- **Video Sync**: All play/pause/seek actions are automatically synchronized
- **Real-time Chat**: Use the chat panel to message each other instantly
- **Connection Status**: Monitor your connection status in the header
- **Responsive**: Works great on desktop and mobile devices

## 🔧 Technical Details

### Frontend Stack
- **React 18** with TypeScript
- **Tailwind CSS** with custom design system
- **WebRTC** for peer-to-peer connections
- **Socket.io Client** for signaling
- **YouTube IFrame API** for video control

### Backend Stack
- **Node.js** with Express
- **Socket.io** for real-time signaling
- **CORS** enabled for cross-origin requests

### WebRTC Flow
1. **Room Creation**: Host creates room, server assigns room ID
2. **Peer Discovery**: Guest joins with room ID
3. **Signaling**: Server facilitates SDP offer/answer exchange
4. **ICE Candidates**: Server relays network candidates
5. **Direct Connection**: Peers connect directly via WebRTC
6. **Data Channels**: Chat and sync data sent peer-to-peer

## 🎨 Design System

The app features a beautiful dark theme perfect for video watching:

- **Colors**: Purple/blue gradient theme with semantic tokens
- **Typography**: Clean, modern fonts with proper contrast
- **Layout**: Split video/chat interface, fully responsive
- **Animations**: Smooth transitions and loading states
- **Components**: Shadcn/ui components with custom variants

## 🐛 Troubleshooting

### Connection Issues

- **Firewall**: Ensure WebRTC traffic is allowed
- **STUN Servers**: App uses Google's public STUN servers
- **Network**: Some corporate networks block WebRTC

### Video Issues

- **YouTube URL**: Ensure the URL is a valid YouTube video
- **Embedded**: Some videos may not allow embedding
- **Age Restricted**: Age-restricted videos won't work

### Server Issues

- **Port Conflict**: Change port in server.js if 3001 is occupied
- **CORS**: Frontend must run on localhost:8080 for CORS to work
- **Dependencies**: Run `npm install` in both frontend and server

## 📡 Server Endpoints

- **WebSocket**: `ws://localhost:3001` - Main signaling server
- **Health Check**: `GET http://localhost:3001/health` - Server status

## 🔮 Future Enhancements

Potential improvements for the app:

- **Multiple Rooms**: Support for more than 2 users per room
- **Voice Chat**: Add audio communication
- **Screen Share**: Share any screen content, not just YouTube
- **Playlist**: Queue multiple videos
- **User Profiles**: Persistent usernames and avatars
- **Room Persistence**: Save room state across sessions

## 🤝 Contributing

This is a demonstration project, but feel free to:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use this code for your own projects!

---

**Built with ❤️ using Lovable, React, WebRTC, and Socket.io**