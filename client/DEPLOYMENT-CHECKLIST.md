# Deployment Checklist - Unified Server + Game Clients

Follow these steps **in order**:

---

## Step 1: Deploy Unified Server

### 1.1 Update render.yaml
**File:** `unified-game-server/render.yaml`

Change this line:
```yaml
repo: https://github.com/YOUR_USERNAME/unified-game-server # TODO: Update with your repo URL
```

To your actual GitHub repo.

### 1.2 Push to GitHub
```bash
cd E:/GamebuddiesPlatform/unified-game-server
git add .
git commit -m "Add Render configuration"
git push
```

### 1.3 Deploy on Render
1. Go to https://render.com/dashboard
2. Click "New +" → "Web Service"
3. Connect GitHub repo: `unified-game-server`
4. Render detects `render.yaml` automatically
5. Click "Create Web Service"
6. **Wait for deployment to complete** (5-10 minutes)

### 1.4 Copy Server URL
After deployment, copy your server URL:
```
https://unified-game-server-XXXXX.onrender.com
```

**✅ You'll need this URL for the next steps!**

---

## Step 2: Configure DDF Client

### 2.1 Set Environment Variable in Render

**BEFORE deploying the client:**

1. Go to your DDF client service on Render (or create it if new)
2. Go to "Environment" tab
3. Click "Add Environment Variable"
4. Add:
   - **Key:** `VITE_BACKEND_URL`
   - **Value:** `https://unified-game-server-XXXXX.onrender.com` (your URL from Step 1.4)
5. Click "Save Changes"

**⚠️ CRITICAL:** This must be set **before** building the client! Vite bakes environment variables into the build.

### 2.2 (Optional) Update Default URL

**File:** `ddf/client/src/config.ts` (line 37)

Change the default fallback URL if you want:
```typescript
? 'https://unified-game-server.onrender.com' // ⚠️ UPDATE THIS to your actual URL
```

But this is just a fallback - the environment variable takes priority!

---

## Step 3: Update DDF Client Code

### 3.1 Update socketService.ts

**File:** `ddf/client/src/services/socketService.ts`

**Add import at top (around line 3):**
```typescript
import { config } from '../config';
```

**Replace lines 12-23** (the backendUrl detection logic):

**OLD:**
```typescript
connect() {
  let backendUrl: string;

  if (import.meta.env.VITE_BACKEND_URL) {
    backendUrl = import.meta.env.VITE_BACKEND_URL;
  } else if (import.meta.env.PROD) {
    backendUrl = window.location.origin;
  } else {
    backendUrl = 'http://localhost:3001';
  }

  // Connect to the /ddf namespace on the unified game server
  this.socket = io(`${backendUrl}/ddf`, {
```

**NEW:**
```typescript
connect() {
  // Use centralized config (reads from environment variables)
  const backendUrl = config.backendUrl;

  console.log('[SocketService] Connecting to:', backendUrl);

  // Connect to the /ddf namespace on the unified game server
  this.socket = io(`${backendUrl}/ddf`, {
```

---

## Step 4: Test Locally

```bash
cd E:/GamebuddiesPlatform/ddf/client
npm run dev
```

Open browser console - should see:
```
[Config] Environment: {isProduction: false, backendUrl: "http://localhost:3001", ...}
[SocketService] Connecting to: http://localhost:3001
```

✅ Should still connect to local unified server!

---

## Step 5: Deploy DDF Client

### 5.1 Create render.yaml (if not exists)

**File:** `ddf/render.yaml`

```yaml
services:
  - type: web
    name: ddf-client
    runtime: static
    repo: https://github.com/YOUR_USERNAME/ddf # Update this!
    branch: main
    buildCommand: cd client && npm install && npm run build
    staticPublishPath: client/dist
    envVars:
      - key: VITE_BACKEND_URL
        value: https://unified-game-server-XXXXX.onrender.com # Your unified server URL!
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

### 5.2 Push and Deploy

```bash
cd E:/GamebuddiesPlatform/ddf
git add .
git commit -m "Update to use unified server"
git push
```

Deploy on Render (same process as Step 1.3)

### 5.3 Copy Client URL

After deployment:
```
https://ddf-client-XXXXX.onrender.com
```

---

## Step 6: Update CORS on Unified Server

### 6.1 Add Client URL to CORS

1. Go to **Unified Server** on Render dashboard
2. Click "Environment"
3. Find `CORS_ORIGINS` (or add it)
4. Update value to include your DDF client URL:

```
http://localhost:5173,https://ddf-client-XXXXX.onrender.com,https://gamebuddies.io
```

**Format:** Comma-separated, no spaces!

### 6.2 Trigger Redeploy

Click "Manual Deploy" → "Deploy latest commit"

Wait for server to restart (~2 minutes)

---

## Step 7: Verify Deployment

### 7.1 Test Unified Server Health

Visit:
```
https://unified-game-server-XXXXX.onrender.com/api/health
```

Should see:
```json
{
  "status": "ok",
  "games": [
    {"id": "ddf", "name": "DDF Quiz Game", "namespace": "/ddf"},
    ...
  ]
}
```

### 7.2 Test DDF Client

1. Open: `https://ddf-client-XXXXX.onrender.com`
2. Open browser console
3. Should see:
   ```
   [SocketService] Connecting to: https://unified-game-server-XXXXX.onrender.com
   Connected to server
   ```

### 7.3 Test Multiplayer

1. **Browser 1:** Create room
2. **Browser 2 (different tab/incognito):** Join room
3. **Verify:** Both players see each other
4. **Start game** and verify gameplay works

---

## Step 8: Repeat for Other Games

For BingoBuddies, ClueScale, SUSD:

1. Create `client/src/config.ts` (same pattern as DDF)
2. Update their socketService to use config
3. Set `VITE_BACKEND_URL` in Render
4. Deploy client
5. Add client URL to unified server's `CORS_ORIGINS`

---

## Troubleshooting

### ❌ "Failed to connect to server"

**Check:**
- [ ] Unified server is running (visit `/api/health`)
- [ ] `VITE_BACKEND_URL` is set correctly in Render
- [ ] Client was rebuilt **after** setting environment variable
- [ ] CORS includes client URL on server

**Fix:**
```bash
# Rebuild client with correct environment variable
# Go to Render → DDF Client → Manual Deploy → Deploy Latest Commit
```

### ❌ CORS error in browser console

**Check:**
- [ ] Unified server's `CORS_ORIGINS` includes your client URL
- [ ] No typos in CORS URLs
- [ ] Server was redeployed after updating CORS

**Fix:**
```bash
# Update CORS_ORIGINS on unified server
# Redeploy unified server
```

### ❌ WebSocket connection fails

**Check:**
- [ ] Using `https://` (not `http://`) for production
- [ ] Firewall allows WebSocket connections
- [ ] Check browser Network tab for errors

### ❌ Environment variable not working

**Remember:**
- Vite bakes env vars into the build at **build time**
- Changing `VITE_BACKEND_URL` requires **rebuilding** the client
- Not like server env vars that work at runtime!

---

## Deployment URLs Summary

After completing all steps, you'll have:

| Service | URL | Purpose |
|---------|-----|---------|
| Unified Server | `https://unified-game-server-XXXXX.onrender.com` | Handles all games |
| DDF Client | `https://ddf-client-XXXXX.onrender.com` | DDF game UI |
| Health Check | `https://unified-game-server-XXXXX.onrender.com/api/health` | Server status |

---

## Environment Variables Reference

### Unified Server (Runtime - can change anytime)
- `NODE_ENV=production`
- `PORT=3001`
- `CORS_ORIGINS=https://ddf-client-XX.onrender.com,...`
- `DDF_API_KEY=...` (optional, for GameBuddies integration)

### DDF Client (Build-time - requires rebuild to change)
- `VITE_BACKEND_URL=https://unified-game-server-XX.onrender.com`
- `VITE_METERED_USERNAME=...` (optional, for WebRTC TURN)
- `VITE_METERED_PASSWORD=...` (optional, for WebRTC TURN)

---

## ✅ Final Checklist

- [ ] Unified server deployed and responding to `/api/health`
- [ ] DDF client `config.ts` created
- [ ] DDF client `socketService.ts` updated to use config
- [ ] `VITE_BACKEND_URL` set in Render for DDF client
- [ ] DDF client deployed successfully
- [ ] DDF client URL added to unified server's `CORS_ORIGINS`
- [ ] Unified server redeployed with updated CORS
- [ ] Tested multiplayer in production (2+ browser tabs)
- [ ] No CORS errors in browser console
- [ ] WebSocket connection working (check Network tab)

**All done! 🎉**
