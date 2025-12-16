# Update All Game Clients to Use Unified Server

This guide shows you how to update all 4 games (DDF, ClueScale, BingoBuddies, SUSD) to connect to the unified server.

---

## Prerequisites

✅ Unified server deployed at: `https://unified-game-server-XXXXX.onrender.com`

---

## Quick Summary

All 4 games need the same changes:

1. **Add `config.ts`** - ✅ Already created for you!
2. **Update socketService** - Import and use config
3. **Set environment variable** - `VITE_BACKEND_URL` in Render
4. **Deploy client** - Build and deploy to Render
5. **Update CORS** - Add client URL to server

---

## Game 1: DDF

### Files Created:
- ✅ `ddf/client/src/config.ts`

### Steps:

**1. Update socketService.ts**

**File:** `ddf/client/src/services/socketService.ts`

**Add import (line 3):**
```typescript
import { config } from '../config';
```

**Replace lines 12-23:**
```typescript
// OLD: Remove this
let backendUrl: string;
if (import.meta.env.VITE_BACKEND_URL) {
  backendUrl = import.meta.env.VITE_BACKEND_URL;
} else if (import.meta.env.PROD) {
  backendUrl = window.location.origin;
} else {
  backendUrl = 'http://localhost:3001';
}

// NEW: Use this
const backendUrl = config.backendUrl;
console.log('[SocketService] Connecting to:', backendUrl);
```

**2. Set Environment Variable in Render**
- Key: `VITE_BACKEND_URL`
- Value: `https://unified-game-server-XXXXX.onrender.com`

**3. Deploy**

---

## Game 2: ClueScale

### Files Created:
- ✅ `ClueScale/client/src/config.ts`

### Steps:

**1. Find socketService file**

Look for where ClueScale connects to the backend (likely `client/src/services/socketService.ts` or `client/src/App.tsx`)

**2. Add import:**
```typescript
import { config } from './config'; // or '../config' depending on file location
```

**3. Replace backend URL detection:**
```typescript
// OLD: Whatever method ClueScale currently uses
const backendUrl = 'http://localhost:3001'; // or similar

// NEW: Use config
const backendUrl = config.backendUrl;
console.log('[ClueScale] Connecting to:', backendUrl);
```

**4. Set Environment Variable in Render**
- Key: `VITE_BACKEND_URL`
- Value: `https://unified-game-server-XXXXX.onrender.com`

**5. Deploy**

---

## Game 3: BingoBuddies

### Files Created:
- ✅ `BingoBuddies/client/src/config.ts`

### Steps:

**1. Update socket connection**

**Find file:** Likely `client/src/services/SocketHandler.ts` or similar

**Add import:**
```typescript
import { config } from '../config';
```

**Replace backend URL:**
```typescript
// OLD:
const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// NEW:
const backendUrl = config.backendUrl;
console.log('[BingoBuddies] Connecting to:', backendUrl);
```

**2. Set Environment Variable in Render**
- Key: `VITE_BACKEND_URL`
- Value: `https://unified-game-server-XXXXX.onrender.com`

**3. Deploy**

---

## Game 4: SUSD

### Files Created:
- ✅ `SUSD/src/config.ts`

### Steps:

**1. Update socket connection**

**Find file:** Likely `src/services/socketService.ts` or `src/contexts/SocketContext.tsx`

**Add import:**
```typescript
import { config } from '../config'; // or './config' depending on location
```

**Replace backend URL:**
```typescript
// OLD:
const backendUrl = 'http://localhost:3001'; // or whatever SUSD uses

// NEW:
const backendUrl = config.backendUrl;
console.log('[SUSD] Connecting to:', backendUrl);
```

**2. Set Environment Variable in Render**
- Key: `VITE_BACKEND_URL`
- Value: `https://unified-game-server-XXXXX.onrender.com`

**3. Deploy**

---

## Update Unified Server CORS

After deploying all clients, update the unified server's CORS to include all client URLs:

**Render Dashboard → Unified Server → Environment → CORS_ORIGINS:**

```
http://localhost:5173,http://localhost:3000,https://gamebuddies.io,https://ddf-client.onrender.com,https://cluescale-client.onrender.com,https://bingobuddies-client.onrender.com,https://susd-client.onrender.com
```

**Format:** Comma-separated, no spaces!

Then redeploy the unified server.

---

## Testing Checklist

For each game, verify:

### Local Testing (Development)
- [ ] `npm run dev` works
- [ ] Connects to `http://localhost:3001`
- [ ] Can create/join rooms
- [ ] Multiplayer works

### Production Testing
- [ ] Client deployed successfully
- [ ] Browser console shows connection to unified server
- [ ] No CORS errors
- [ ] Can create/join rooms
- [ ] Multiplayer works across browser tabs

---

## Render Configuration for Each Game

### DDF Client (`ddf/render.yaml`)
```yaml
services:
  - type: web
    name: ddf-client
    runtime: static
    repo: https://github.com/YOUR_USERNAME/ddf
    branch: main
    buildCommand: cd client && npm install && npm run build
    staticPublishPath: client/dist
    envVars:
      - key: VITE_BACKEND_URL
        value: https://unified-game-server-XXXXX.onrender.com
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

### ClueScale Client (`ClueScale/render.yaml`)
```yaml
services:
  - type: web
    name: cluescale-client
    runtime: static
    repo: https://github.com/YOUR_USERNAME/ClueScale
    branch: main
    buildCommand: cd client && npm install && npm run build
    staticPublishPath: client/dist
    envVars:
      - key: VITE_BACKEND_URL
        value: https://unified-game-server-XXXXX.onrender.com
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

### BingoBuddies Client (`BingoBuddies/render.yaml`)
```yaml
services:
  - type: web
    name: bingobuddies-client
    runtime: static
    repo: https://github.com/YOUR_USERNAME/BingoBuddies
    branch: main
    buildCommand: cd client && npm install && npm run build
    staticPublishPath: client/dist
    envVars:
      - key: VITE_BACKEND_URL
        value: https://unified-game-server-XXXXX.onrender.com
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

### SUSD Client (`SUSD/render.yaml`)
```yaml
services:
  - type: web
    name: susd-client
    runtime: static
    repo: https://github.com/YOUR_USERNAME/SUSD
    branch: main
    buildCommand: npm install && npm run build
    staticPublishPath: dist
    envVars:
      - key: VITE_BACKEND_URL
        value: https://unified-game-server-XXXXX.onrender.com
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

---

## Complete Architecture

After deployment:

```
┌─────────────────────────────────────────────┐
│         Unified Game Server                 │
│    https://unified-game-server.onrender.com │
│                                             │
│  /ddf    /bingo    /clue    /susd          │
└────┬────────┬────────┬────────┬─────────────┘
     │        │        │        │
     ↓        ↓        ↓        ↓
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│  DDF   │ │ Bingo  │ │ Clue   │ │ SUSD   │
│ Client │ │ Client │ │ Client │ │ Client │
└────────┘ └────────┘ └────────┘ └────────┘
```

All clients connect to the same unified server, but different namespaces!

---

## Namespace Mapping

| Game | Namespace | Client URL | Example |
|------|-----------|------------|---------|
| DDF | `/ddf` | `https://ddf-client.onrender.com` | `wss://unified-server.onrender.com/ddf` |
| ClueScale | `/clue` | `https://cluescale-client.onrender.com` | `wss://unified-server.onrender.com/clue` |
| BingoBuddies | `/bingo` | `https://bingobuddies-client.onrender.com` | `wss://unified-server.onrender.com/bingo` |
| SUSD | `/susd` | `https://susd-client.onrender.com` | `wss://unified-server.onrender.com/susd` |

---

## Common Issues

### Issue: "Cannot find module './config'"

**Fix:** Make sure you created the `config.ts` file in the right location!
- DDF: `ddf/client/src/config.ts`
- ClueScale: `ClueScale/client/src/config.ts`
- BingoBuddies: `BingoBuddies/client/src/config.ts`
- SUSD: `SUSD/src/config.ts`

### Issue: Still connecting to localhost in production

**Check:**
1. `VITE_BACKEND_URL` is set in Render
2. Client was rebuilt **after** setting the env var
3. Clear browser cache and hard refresh (Ctrl+Shift+R)

### Issue: CORS error

**Fix:** Add your client URL to unified server's `CORS_ORIGINS` and redeploy server

---

## Migration Order

Recommended order for safety:

1. **Deploy unified server** (done)
2. **Update & deploy DDF** (most recently worked on)
3. **Update & deploy one other game** (test the process)
4. **Update & deploy remaining games**
5. **Update CORS** with all URLs
6. **Final testing** of all games

---

## ✅ Final Checklist

### Unified Server
- [ ] Deployed and responding to `/api/health`
- [ ] All 4 games show in health check response

### For Each Game (DDF, ClueScale, BingoBuddies, SUSD)
- [ ] `config.ts` created
- [ ] Socket service updated to import and use config
- [ ] `VITE_BACKEND_URL` set in Render
- [ ] Deployed successfully
- [ ] Client URL added to unified server CORS
- [ ] Tested multiplayer in production

### Final
- [ ] All clients connecting to unified server
- [ ] No CORS errors
- [ ] Multiplayer works in all games
- [ ] Local development still works

**All done! 🎉**

You now have all 4 games running on a single unified server!
