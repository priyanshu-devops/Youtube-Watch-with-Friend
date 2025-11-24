## WatchParty – YouTube sync & chat

This app lets friends watch any YouTube URL together with synchronized playback, chat and voice notes. It is built with Next.js (App Router), a custom Node/Socket.IO server, Tailwind and the YouTube IFrame API.

## Getting started (development)

```bash
npm install

# start Next.js on :3000 and the Socket.IO server on :3001
npm run dev
```

Visit `http://localhost:3000`, create a room and share the URL with friends.

## Real-time sync server configuration

The client connects to the Socket.IO server via the `NEXT_PUBLIC_SOCKET_URL` (and optional `NEXT_PUBLIC_SOCKET_PORT`) environment variables:

```bash
# .env.local
NEXT_PUBLIC_SOCKET_URL=http://your-domain.com:3001
# NEXT_PUBLIC_SOCKET_PORT=3001 # optional helper if you just want to override the port
```

- In local dev we automatically fall back to `http://localhost:3001`.
- In production you **must** set the public URL that exposes your Socket.IO server; otherwise viewers on other devices will fail to sync and chat.

After updating env values, restart `npm run dev` (or your process manager) so the client picks up the changes.

## Project structure

- `server.ts` – boots Next.js and a dedicated Socket.IO server with per-room state.
- `src/components/VideoPlayer.tsx` – embeds the YouTube IFrame player and mirrors play/pause/seek/url events across sockets.
- `src/components/ChatPanel.tsx` – text + voice chat panel synchronized through Socket.IO.
- `src/hooks/useSocket.ts` – singleton client socket hook with environment-aware URL resolution.

## Deployment notes

To deploy, run the custom server (e.g. `NODE_ENV=production npm run build && node server.js`) on a host that can expose both the Next.js port (3000 by default) and the Socket.IO port (3001 by default). Update `NEXT_PUBLIC_SOCKET_URL` so browsers connect to your public socket endpoint.
