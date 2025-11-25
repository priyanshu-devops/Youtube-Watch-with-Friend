## WatchParty – YouTube sync & chat

This app lets friends watch any YouTube URL together with synchronized playback, chat and voice notes. Built with Next.js (App Router), Server-Sent Events (SSE), Tailwind and the YouTube IFrame API.

## ✨ Features

- ✅ **100% Vercel-compatible** - No separate server needed!
- ✅ Real-time video synchronization
- ✅ Live chat with text and voice messages
- ✅ Works on any device

## Getting started (development)

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`, create a room and share the URL with friends.

## Project structure

- `src/app/api/` – Serverless API routes for room state and chat
- `src/components/VideoPlayer.tsx` – YouTube player with real-time sync
- `src/components/ChatPanel.tsx` – Chat interface with text/voice messages
- `src/hooks/useRoomSync.ts` – SSE-based room synchronization hook
- `src/hooks/useChat.ts` – SSE-based chat hook

## Deployment

### 🚀 Deploy to Vercel (Recommended)

**It just works!** No configuration needed.

1. Push to GitHub
2. Import to Vercel
3. Deploy

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for details.

### 📝 Notes

- Uses Server-Sent Events (SSE) instead of WebSockets - fully compatible with Vercel
- Room state and messages stored in-memory (per serverless function instance)
- For production scale, consider adding Vercel KV for persistence

### 🔧 Legacy: Separate Socket Server

If you need WebSocket support, see [DEPLOYMENT.md](./DEPLOYMENT.md) for deploying the Socket.IO server separately.
