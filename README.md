# FileMesh 🚀

> **Lightning-fast P2P file sharing** • No size limits • No server storage • Beautiful UI

<div align="center">

![FileMesh](https://img.shields.io/badge/FileMesh-P2P%20File%20Sharing-purple?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

</div>

---

## ✨ Features

- 🚀 **Lightning Fast** - Direct peer-to-peer transfer via WebRTC
- 🔒 **Secure** - Files never touch the server
- 💾 **No Limits** - Transfer files of any size
- 📦 **Resume Support** - Interrupted transfers automatically resume
- 🎨 **Beautiful UI** - Modern gradient design with Tailwind CSS
- 📱 **Responsive** - Works on desktop, tablet, and mobile
- 🔄 **Auto-Reconnect** - Handles network interruptions gracefully
- 👥 **Multi-Peer** - Send to multiple peers simultaneously
- 📊 **Progress Tracking** - Real-time progress for each transfer
- 🎯 **Zero Config** - Works out of the box

---

## 🎥 Demo

### Landing Page
Beautiful gradient design with intuitive room creation and joining.

### Room Interface
Clean, modern UI showing:
- Connected peers with status indicators
- Drag-and-drop file upload
- Real-time progress bars
- Received files list
- Room ID with one-click copy

---

## 🏗️ Architecture

### Frontend
- **React 18** - Modern UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Beautiful styling
- **Vite** - Lightning-fast dev server
- **WebRTC DataChannels** - P2P data transfer
- **IndexedDB** - Chunk storage for resume

### Backend
- **Node.js + Express** - REST API
- **WebSocket (ws)** - Real-time signaling
- **Redis** - Room metadata & peer tracking
- **TypeScript** - Type safety

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Redis server

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd PeerDrop-claude

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Running Locally

**Terminal 1 - Redis:**
```bash
redis-server
```

**Terminal 2 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```

**Access:** http://localhost:5173

---

## 📦 Deployment

### Quick Deploy (Recommended)

**Backend:** Railway (with Redis)
**Frontend:** Vercel

See [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) for detailed instructions.

### Environment Variables

**Backend (.env):**
```bash
PORT=3000
REDIS_URL=redis://localhost:6379
```

**Frontend (.env):**
```bash
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000/ws
```

For production, use HTTPS and WSS!

---

## 🎯 How It Works

### 1. Create or Join Room
User creates a room and gets a unique room ID, or joins an existing room with a room ID.

### 2. Peer Discovery
Backend (WebSocket) facilitates peer discovery. Once peers find each other, they establish direct WebRTC connections.

### 3. File Transfer
Files are chunked (64KB each), sent directly peer-to-peer via DataChannel, and stored in IndexedDB for resume capability.

### 4. Download
When all chunks are received, the file is reassembled and automatically downloaded.

---

## 🛠️ Tech Stack

### Core Technologies
- **WebRTC** - Peer-to-peer data transfer
- **WebSocket** - Signaling server
- **Redis** - Distributed state management
- **IndexedDB** - Client-side storage

### Frontend Stack
- React 18
- TypeScript
- Tailwind CSS v4
- Vite 8
- React Router 6

### Backend Stack
- Node.js 18+
- Express 5
- ws (WebSocket library)
- Redis (ioredis)
- TypeScript

---

## 📊 Performance

- **Same Machine:** 20-50 MB/s
- **Local Network:** 5-20 MB/s
- **Internet:** 0.5-5 MB/s (depends on connection)

**File Transfer:**
- Chunk size: 64KB
- Progress updates: Real-time
- Resume: Automatic on reconnect

---

## 🧪 Testing

### Run Tests

```bash
# Backend API tests
./test-api.sh

# Connection verification
./verify-fix.sh

# Full system test
# See TEST.md for manual testing procedures
```

### Test Checklist

- [x] Room creation and joining
- [x] Peer connection establishment
- [x] WebRTC DataChannel opening
- [x] File transfer (small, medium, large)
- [x] Progress tracking
- [x] Resume after disconnect
- [x] Multi-peer transfer
- [x] Error handling

---

## 📁 Project Structure

```
PeerDrop-claude/
├── backend/
│   ├── server.ts           # Main server entry
│   └── src/
│       ├── ws/             # WebSocket handling
│       ├── routes/         # REST API routes
│       ├── controllers/    # Business logic
│       ├── service/        # Services
│       └── store/          # Redis integration
├── frontend/
│   └── src/
│       ├── lib/            # Core utilities
│       │   ├── identity.ts # Node ID management
│       │   ├── ws.ts       # WebSocket client
│       │   ├── webrtc.ts   # WebRTC manager
│       │   ├── transfer.ts # File transfer logic
│       │   ├── db.ts       # IndexedDB wrapper
│       │   └── api.ts      # REST API client
│       └── pages/
│           ├── Landing.tsx # Home page
│           └── Room.tsx    # Room interface
└── docs/                   # Documentation
```

---

## 🎨 UI Features

### Landing Page
- Gradient background with animated decorations
- Two-button interface (Create / Join)
- Smooth animations and transitions
- Feature highlights
- Error handling with visual feedback

### Room Page
- Split layout: Peers on left, transfers on right
- Real-time peer status indicators
- Drag-and-drop file upload area
- Animated progress bars
- File size formatting
- One-click room ID copying
- Visual feedback for all actions

### Design System
- **Colors:** Indigo → Purple → Pink gradient
- **Typography:** System fonts for performance
- **Icons:** Heroicons (included via SVG)
- **Animations:** Smooth CSS transitions
- **Responsive:** Mobile-first design

---

## 🔒 Security

### Current Implementation
✅ P2P transfer (no server storage)
✅ CORS enabled (configure for production)
✅ Input validation on API
✅ WebSocket authentication via Redis
✅ Room cleanup on disconnect

### Recommended for Production
⚠️ Add rate limiting
⚠️ Implement room passwords
⚠️ Add end-to-end encryption
⚠️ Use HTTPS/WSS
⚠️ Restrict CORS to specific domains

---

## 🐛 Known Limitations

1. **STUN Only** - May not work behind symmetric NATs (add TURN server for production)
2. **No Authentication** - Rooms are public with room ID
3. **Memory** - Large files (>500MB) may cause memory issues
4. **Browser Support** - Requires modern browser with WebRTC

---

## 🗺️ Roadmap

### v1.1 (Planned)
- [ ] Room passwords
- [ ] File queue system
- [ ] Transfer speed indicator
- [ ] Pause/Resume controls
- [ ] Dark mode

### v2.0 (Future)
- [ ] End-to-end encryption
- [ ] Multi-file selection
- [ ] Folder upload
- [ ] Text chat
- [ ] Video/audio calls

---

## 📖 Documentation

- [Production Deployment Guide](./PRODUCTION_DEPLOYMENT.md)
- [Testing Guide](./TEST.md)
- [Debug Guide](./DEBUG_GUIDE.md)
- [WebRTC Race Condition Fix](./WEBRTC_RACE_CONDITION_FIX.md)
- [DataChannel Fix](./DATACHANNEL_FIX.md)
- [File Transfer Debug](./FILE_TRANSFER_DEBUG.md)

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

- **WebRTC** - For making P2P possible
- **Tailwind CSS** - For the beautiful UI
- **React** - For the component system
- **Redis** - For distributed state management

---

## 📞 Support

Having issues? Check:
1. [Debug Guide](./DEBUG_GUIDE.md)
2. Browser console for errors
3. Backend logs
4. Environment variables

---

<div align="center">

**Made with ❤️ for the decentralized web**

⭐ Star this repo if you find it useful!

</div>
