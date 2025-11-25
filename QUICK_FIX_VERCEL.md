# Quick Fix for Vercel WebSocket Error

## The Problem
Vercel shows "Connection Error: websocket error" because Vercel **cannot** run WebSocket servers (it's serverless).

## Quick Solution (5 minutes)

### Step 1: Deploy Socket Server to Railway (Free)

1. Go to https://railway.app and sign up/login
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. Railway will auto-detect your project
5. In the service settings, click **"Generate Domain"** to get a public URL
6. Copy that URL (e.g., `https://your-app.railway.app`)

### Step 2: Configure Environment Variables

**On Railway:**
- Go to your service → **Variables** tab
- Add:
  - `PORT` = `3001` (or leave Railway's auto-assigned port)
  - `ALLOWED_ORIGINS` = `https://youtube-watch-with-friend-44148hyfl.vercel.app,*` (add your Vercel domain)

**On Vercel:**
1. Go to your project dashboard
2. **Settings** → **Environment Variables**
3. Add:
   - **Name**: `NEXT_PUBLIC_SOCKET_URL`
   - **Value**: `https://your-app.railway.app` (the Railway URL from Step 1)
   - **Environments**: Check ✅ Production, ✅ Preview, ✅ Development
4. Click **Save**

### Step 3: Update Railway Start Command

In Railway service settings:
- **Start Command**: `npx ts-node socket-server.ts`
- Or if you prefer compiled: `npm run build && node dist/socket-server.js`

### Step 4: Redeploy

1. **Railway**: Should auto-deploy, or click **"Deploy"**
2. **Vercel**: Go to **Deployments** → Click **"Redeploy"** (to pick up the new env var)

### Step 5: Test

Open your Vercel app. The "Connection Error" should be gone! Check browser console - you should see "Socket connected!".

## Alternative: Render.com (Also Free)

1. Go to https://render.com
2. **New** → **Web Service**
3. Connect GitHub repo
4. Settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npx ts-node socket-server.ts`
   - **Environment**: Node
5. Add environment variables:
   - `PORT` = `10000`
   - `ALLOWED_ORIGINS` = `https://your-vercel-app.vercel.app`
6. Deploy and copy the URL
7. Add `NEXT_PUBLIC_SOCKET_URL` to Vercel (same as Step 2 above)

## Troubleshooting

**Still seeing "websocket error"?**
- ✅ Wait 1-2 minutes after deploying (DNS propagation)
- ✅ Check Railway/Render logs for errors
- ✅ Verify `NEXT_PUBLIC_SOCKET_URL` is set in Vercel
- ✅ Make sure you **redeployed Vercel** after adding the env var
- ✅ Check browser console for the actual error message

**CORS errors?**
- Add your exact Vercel domain to `ALLOWED_ORIGINS` (no trailing slash)

**Socket server not starting?**
- Check Railway/Render logs
- Make sure `socket.io` is in `package.json` dependencies
- Try the start command: `npx ts-node socket-server.ts`

## Need Help?

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions and other platform options.

