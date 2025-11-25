# Deployment Guide for WatchParty

## Problem
Vercel (and other serverless platforms) **cannot** host WebSocket servers. Your Socket.IO server needs to run on a platform that supports persistent connections.

## Solution: Deploy Socket.IO Server Separately

### Step 1: Deploy Socket.IO Server

Choose one of these platforms (all support WebSockets):

#### Option A: Railway (Recommended - Free tier available)
1. Go to [railway.app](https://railway.app)
2. Create a new project
3. Click "New" → "GitHub Repo" → Select your repo
4. Add a new service → "Empty Service"
5. In the service settings:
   - Set **Root Directory** to your project root
   - Set **Start Command** to: `cd /path/to/socket-server && npm install && npm start`
   - Or create a `railway.json`:
   ```json
   {
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "node socket-server.js",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```
6. Add environment variables:
   - `PORT=3001` (or let Railway assign one)
   - `ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,https://your-custom-domain.com`
7. Railway will give you a URL like: `https://your-app.railway.app`
8. Copy the **full URL** (including https://)

#### Option B: Render
1. Go to [render.com](https://render.com)
2. Create a new "Web Service"
3. Connect your GitHub repo
4. Settings:
   - **Build Command**: `npm install` (in socket-server directory)
   - **Start Command**: `node socket-server.js`
   - **Environment**: Node
5. Add environment variables:
   - `PORT=10000` (Render assigns port automatically, but set this)
   - `ALLOWED_ORIGINS=https://your-vercel-app.vercel.app`
6. Deploy and copy the URL

#### Option C: Fly.io
1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. In your project root, run: `fly launch`
3. Create `fly.toml`:
   ```toml
   app = "your-socket-server"
   primary_region = "iad"

   [build]

   [http_service]
     internal_port = 3001
     force_https = true
     auto_stop_machines = false
     auto_start_machines = true
     min_machines_running = 1

   [[services]]
     internal_port = 3001
     protocol = "tcp"
     processes = ["app"]
   ```
4. Deploy: `fly deploy`
5. Get URL: `fly status`

### Step 2: Configure Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add:
   - **Name**: `NEXT_PUBLIC_SOCKET_URL`
   - **Value**: `https://your-socket-server.railway.app` (or your deployed URL)
   - **Environment**: Production, Preview, Development (check all)
4. **Important**: Redeploy your Vercel app after adding the variable

### Step 3: Update Socket Server Code (if needed)

The `socket-server.ts` file is ready to deploy. Make sure it's in your repo.

For production, you may want to compile it:
```bash
tsc socket-server.ts --outDir dist --target ES2020 --module commonjs
```

Or use the provided `package-socket.json` in the socket-server directory.

### Step 4: Test

1. Deploy Socket.IO server (Railway/Render/Fly.io)
2. Add `NEXT_PUBLIC_SOCKET_URL` to Vercel
3. Redeploy Vercel app
4. Open your app and check browser console - should see "Socket connected!"

## Troubleshooting

### "Connection Error: websocket error"
- ✅ Check `NEXT_PUBLIC_SOCKET_URL` is set in Vercel
- ✅ Verify Socket.IO server is running (check Railway/Render dashboard)
- ✅ Check `ALLOWED_ORIGINS` includes your Vercel domain
- ✅ Make sure you redeployed Vercel after adding env var

### CORS Errors
- Add your Vercel domain to `ALLOWED_ORIGINS` on Socket.IO server
- Format: `ALLOWED_ORIGINS=https://app.vercel.app,https://custom.com`

### Socket Server Not Starting
- Check logs in Railway/Render dashboard
- Verify `PORT` environment variable is set
- Make sure `socket.io` is installed: `npm install socket.io`

## Quick Deploy Commands

### Railway
```bash
railway login
railway init
railway up
```

### Render
Just connect GitHub repo in dashboard - it auto-deploys!

### Fly.io
```bash
fly launch
fly deploy
```

## Alternative: Use a Managed Service

If you don't want to manage a server, consider:
- **Pusher** (has free tier)
- **Ably** (has free tier)
- **Socket.io Cloud** (paid)

These require code changes to use their SDKs instead of Socket.IO.

