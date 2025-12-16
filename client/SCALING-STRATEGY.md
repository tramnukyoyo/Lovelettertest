# GameBuddies Platform - Scaling Strategy Document

**Created:** 2025-11-05
**Status:** Comprehensive Analysis & Roadmap
**Scope:** GameBuddieGamesServer + DDF Multi-Server Scaling

---

## Executive Summary

The GameBuddies platform currently uses a **single-instance monolithic architecture** suitable for 500-1000 concurrent players. To scale beyond this and support multiple game servers with load distribution, significant architectural changes are required.

### Quick Decision Matrix

| Scenario | Recommended Approach | Timeline | Effort | Cost |
|----------|---------------------|----------|--------|------|
| <500 players | Keep current setup | N/A | None | $7-25/mo |
| 500-2000 players | Vertical scaling (Phase 1) | Immediate | 1 day | $25-50/mo |
| 2000-5000 players | Service registry (Phase 2) | 2-3 weeks | Medium | $40-60/mo |
| 5000+ players | Full distributed (Phase 3) | 6-8 weeks | High | $60-150/mo |

### **TL;DR - Start Here**

1. **This week:** Monitor actual player counts (might not need scaling yet)
2. **When approaching 500 players:** Upgrade Render.com instance size (vertical scaling)
3. **When approaching 2000 players:** Implement Phase 2 (GameBuddies server assignment)
4. **When approaching 5000 players:** Implement Phase 3 (full distributed with Redis)

---

## Part 1: Current Architecture Analysis

### GameBuddieGamesServer Architecture

#### Technology Stack
- **Framework:** Node.js + Express + TypeScript
- **Real-time:** Socket.IO 4.7.5 (WebSocket + polling)
- **State Storage:** In-memory JavaScript Maps (NO database)
- **Games:** Plugin-based architecture (SUSD, DDF, BingoBuddies, ClueScale)
- **Deployment:** Single instance on Render.com

#### Current State Management

**File:** `core/managers/RoomManager.ts`
```typescript
class RoomManager {
  private rooms: Map<string, Room>;              // ❌ In-memory only
  private playerRoomMap: Map<string, string>;    // socketId -> roomCode
  private oldSocketCleanupTimers: Map<string, NodeJS.Timeout>;
}
```

**File:** `core/managers/SessionManager.ts`
```typescript
class SessionManager {
  private sessions: Map<string, PlayerSession>;  // ❌ Lost on restart
}
```

**Limitation:** All state is process-local. If you restart the server, all games end. If you add a second server, it knows nothing about rooms on Server 1.

#### Socket.IO Configuration

**File:** `core/server.ts:76-95`
```typescript
this.io = new SocketIOServer(this.httpServer, {
  cors: { /* config */ },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,  // 2 min recovery window
  },
  pingTimeout: 300000,                         // 5 min (for backgrounded tabs)
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});
```

**Current Capacity:**
- No hardcoded limits
- Limited by: process memory (~1.5GB free tier), CPU (single core), bandwidth
- Realistic max: **500-1000 concurrent players**
- Memory: 5KB per room, 2KB per player
- Performance: Socket.IO broadcasts are efficient but single-threaded

#### Game Plugin Architecture

Each game runs as a plugin with its own Socket.IO namespace:
- SUSD: `/susd` namespace
- DDF: `/ddf` namespace
- BingoBuddies: `/bingo` namespace
- ClueScale: `/clue` namespace

**Issue:** Each namespace is bound to a single Socket.IO instance. Broadcasting only reaches clients on that instance.

---

### DDF Architecture

#### Integration Pattern

DDF is a **standalone game server** that integrates with GameBuddies via REST API:

```
GameBuddies.io (Central Authority)
    |
    └─→ Redirect player to: https://ddf.render.com/?room=ABC123&playerId=xyz
         |
         └─→ DDF Socket.IO Server (Standalone)
              └─→ WebRTC peer-to-peer video
              └─→ HTTP REST calls back to GameBuddies
```

**File:** `client/src/services/socketService.ts:62-76`
```typescript
let backendUrl: string;
if (import.meta.env.VITE_BACKEND_URL) {
  backendUrl = import.meta.env.VITE_BACKEND_URL;
} else if (import.meta.env.PROD) {
  backendUrl = window.location.origin;  // ❌ Assumes same-origin
} else {
  backendUrl = 'http://localhost:3001';
}

this.socket = io(`${backendUrl}/ddf`, { /* config */ });
```

**Issue:** Client hardcodes connection to single server. No mechanism to discover multiple servers or balance load.

#### GameBuddies Integration Points

**File:** `server/src/services/gameBuddiesService.js`

DDF calls GameBuddies API:
1. **Room validation:** `GET /api/rooms/{roomCode}/validate`
2. **Game registration:** `POST /api/rooms/{roomCode}/game-instance`
3. **State reporting:** `POST /api/rooms/{roomCode}/game-state`
4. **Player updates:** `POST /api/game/rooms/{roomCode}/players/{playerId}/status`
5. **Return to lobby:** `POST /api/v2/external/return`

**Key Point:** All communication is via REST API with axios. NO WebSocket to GameBuddies during gameplay.

#### In-Memory Game State

**File:** `server/src/game/EnhancedGameManager.js`
```typescript
class EnhancedGameManager {
  private games = new Map();  // ❌ Per-process only
}
```

**Issue:** Game state lost on server restart. No sharing between multiple DDF instances.

---

## Part 2: Horizontal Scaling Blockers

### Blocker #1: In-Memory State (CRITICAL)

**Problem:**
```
Server 1: Room ABC123 exists in memory
Server 2: Room ABC123 doesn't exist (different process)
Player joins Server 2 → Error: "Room not found"
```

**Solution:** Replace all Maps with external state store (Redis or database)

### Blocker #2: Socket.IO Namespace Isolation (CRITICAL)

**Problem:**
```
socket.to(roomCode).emit('update', data);  // Only reaches clients on THIS instance
// Clients on Server 1 broadcasting
// Clients on Server 2 receive NOTHING
```

**Solution:** Add Socket.IO Redis adapter for cross-server pub/sub

### Blocker #3: No Service Discovery (CRITICAL)

**Problem:**
```
Client connects to: window.location.origin
// Assumes same server hosted the client (monolithic architecture)
// With multiple servers, client needs to discover which server has the room
```

**Solution:** Add service registry or GameBuddies-based server assignment

### Blocker #4: Session Affinity (MEDIUM)

**Problem:**
```
Player 1 connects to Server 1 (session stored in RAM)
Server 1 crashes
Player 1 reconnects → routed to Server 2
Session lost → "Room not found"
```

**Solution:** Sticky sessions at load balancer OR persistent session storage

### Blocker #5: Room Code Collisions (LOW PRIORITY)

**Problem:**
```
Server 1 generates ABC123 (checks local Map only)
Server 2 generates ABC123 simultaneously
Two different rooms with same code
```

**Solution:** Use Redis atomic counter for room code generation

---

## Part 3: Three-Phase Scaling Roadmap

### Phase 1: Vertical Scaling (IMMEDIATE)

**Timeline:** Now
**Effort:** 1 day (just config change)
**Cost:** $25/mo → $50/mo (upgrade instance)
**Recommended for:** <2000 concurrent players

#### What It Is
Buy a larger server instead of more servers. Single instance handles more load.

#### Implementation
1. Render.com: Upgrade from Starter ($7) to Pro ($25) or Custom ($50+)
2. Monitor resource usage
3. Scale up again when approaching limits

#### Pros & Cons

**Pros:**
- Minimal code changes
- No architecture changes
- Simple deployment
- Works immediately

**Cons:**
- Not unlimited (cloud has max instance size)
- No redundancy (single point of failure)
- Costs increase exponentially at high scale
- No load distribution between games

#### When to Stop This Approach
When single server maxes out (~2000 concurrent players) or when cost becomes excessive.

---

### Phase 2: Hybrid Scaling - GameBuddies Server Assignment (RECOMMENDED FIRST STEP)

**Timeline:** 2-3 weeks
**Effort:** Medium (GameBuddies + minimal game server changes)
**Cost:** $40-60/mo (2-3 servers + coordination overhead)
**Recommended for:** 2000-5000 concurrent players

#### What It Is
GameBuddies acts as orchestrator, assigning each room to a specific game server instance. Clients connect directly to their assigned server.

```
┌──────────────────────────────────────────┐
│       GameBuddies.io                     │
│  (Room-to-Server Assignment Registry)    │
└──────────────────────────────────────────┘
         |
         ├─→ Room ABC123 → https://ddf-server-1.render.com
         ├─→ Room XYZ789 → https://ddf-server-2.render.com
         └─→ Room QWE456 → https://ddf-server-3.render.com

Client gets redirect: window.location = assignedServerUrl
```

#### Architecture Diagram

```
Load Balancer / Router (GameBuddies)
    |
    ├─── Game Server 1 (ddf-1)
    |    └─ Rooms: ABC123, DEF456
    |    └ Players: 150 (60% load)
    |
    ├─── Game Server 2 (ddf-2)
    |    └─ Rooms: GHI789, JKL012
    |    └ Players: 200 (80% load)
    |
    └─── Game Server 3 (ddf-3)
         └─ Rooms: MNO345, PQR678
         └ Players: 50 (20% load)
```

#### GameBuddies Changes Required

**New Database Field:**
```sql
ALTER TABLE game_rooms ADD COLUMN (
  game_server_url VARCHAR(255),           -- e.g., https://ddf-server-1.render.com
  game_server_id VARCHAR(50),             -- e.g., "ddf-1"
  game_server_assigned_at TIMESTAMP
);
```

**New API Endpoint:**
```typescript
// GET /api/game/servers/{gameType}
Response: {
  servers: [
    {
      id: "ddf-1",
      url: "https://ddf-server-1.render.com",
      health: "healthy",
      load: 60,                           // % capacity
      currentRooms: 2,
      maxRooms: 100
    },
    {
      id: "ddf-2",
      url: "https://ddf-server-2.render.com",
      health: "healthy",
      load: 80,
      currentRooms: 2,
      maxRooms: 100
    }
  ]
}
```

**Room Creation Logic:**
```javascript
async function createGameRoom(gameType, settings) {
  // 1. Get available servers
  const servers = await fetch(`/api/game/servers/${gameType}`);

  // 2. Pick least-loaded server
  const assigned = servers.sort((a, b) => a.load - b.load)[0];

  // 3. Create room record
  const room = {
    code: generateRoomCode(),
    gameType,
    gameServerUrl: assigned.url,
    gameServerId: assigned.id,
    hostId: userId,
    ...settings
  };

  await supabase.from('game_rooms').insert(room);

  // 4. Redirect host to assigned server
  window.location = `${assigned.url}/?room=${room.code}&userId=${userId}&role=host`;

  // 5. Host sends invite links with same server URL
  return `${assigned.url}/?room=${room.code}&userId=&role=player`;
}
```

#### Game Server Changes Required (Minimal!)

**For GameBuddieGamesServer:**

1. **Add server registration on startup**
   ```typescript
   // core/server.ts
   async function registerWithGameBuddies() {
     const serverId = process.env.SERVER_ID || `server-${process.env.PORT}`;
     const maxRooms = parseInt(process.env.MAX_ROOMS) || 100;

     // POST to GameBuddies
     await axios.post('https://gamebuddies.io/api/game/servers/register', {
       id: serverId,
       url: process.env.PUBLIC_URL,  // e.g., https://server-1.render.com
       gameType: 'gamebuddies',
       maxRooms,
       health: 'healthy'
     }, {
       headers: { 'x-api-key': process.env.GAMEBUDDIES_API_KEY }
     });
   }

   // Call on startup
   this.httpServer.listen(this.port, () => {
     registerWithGameBuddies();
   });
   ```

2. **Add load reporting (periodic)**
   ```typescript
   // core/managers/HealthManager.ts (new)
   async function reportLoad() {
     const load = (roomManager.getRoomCount() / maxRooms) * 100;

     await axios.patch(
       `https://gamebuddies.io/api/game/servers/${serverId}`,
       { load, health: 'healthy' },
       { headers: { 'x-api-key': process.env.GAMEBUDDIES_API_KEY } }
     );
   }

   // Report every 30 seconds
   setInterval(reportLoad, 30000);
   ```

3. **Add `/health` endpoint** (already exists)
   ```typescript
   app.get('/health', (req, res) => {
     res.json({
       status: 'healthy',
       uptime: process.uptime(),
       rooms: roomManager.getRoomCount(),
       players: getConnectedPlayerCount()
     });
   });
   ```

**For DDF:**

1. **Accept server URL from query parameters**
   ```typescript
   // client/src/services/GameBuddiesIntegration.js
   function initializeServerConnection() {
     // GameBuddies URL params include assigned server
     const params = new URLSearchParams(window.location.search);

     // Store assigned server (won't change during session)
     sessionStorage.setItem('gameServerUrl', window.location.origin);

     connectToGameServer(window.location.origin);  // Same-origin works now!
   }
   ```

2. **No client changes needed!** DDF assumes `window.location.origin` is the game server
   - GameBuddies redirects to the assigned server
   - Client connects to that server
   - Works automatically!

#### Pros & Cons

**Pros:**
- Minimal code changes to game servers
- GameBuddies maintains room-server mapping
- Each room stays on one server (no cross-server state)
- Easy to implement for both GameBuddieGamesServer and DDF
- Load balancing possible (least-loaded server)
- Health monitoring simple

**Cons:**
- Server failure loses that room (no automatic failover)
- GameBuddies must maintain server registry
- Requires changes to GameBuddies (external dependency)
- No cross-server player communication
- Still limited by single-server capacity per room

#### When to Transition to Phase 3
When you need:
- Failover (room continues on different server if one crashes)
- Load balancing within a room (multiple servers per room)
- Unbounded scaling (single room can use multiple servers)

---

### Phase 3: Full Distributed Architecture with Redis

**Timeline:** 6-8 weeks
**Effort:** High (significant refactoring)
**Cost:** $60-150/mo (3+ servers + Redis instance)
**Recommended for:** 5000+ concurrent players or high reliability requirements

#### What It Is
All game servers share state via Redis. Socket.IO uses Redis adapter for cross-server broadcasting. Load balancers route players with sticky sessions.

```
                    ┌─────────────────────────┐
                    │  Redis (Shared State)   │
                    │  - Rooms                │
                    │  - Sessions             │
                    │  - Pub/Sub              │
                    └─────────────────────────┘
                              ▲
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
    ┌───┴────┐            ┌───┴────┐            ┌───┴────┐
    │Server 1 │            │Server 2 │            │Server 3 │
    │   CPU1  │            │   CPU2  │            │   CPU3  │
    │  Rooms: │            │  Rooms: │            │  Rooms: │
    │ABC, DEF │            │GHI, JKL │            │MNO, PQR │
    └────┬────┘            └────┬────┘            └────┬────┘
         │                      │                      │
         └──────────┬───────────┴──────────┬───────────┘
                    │                      │
              ┌─────▼────────┬─────────────▼─────┐
              │  Load Balancer (Sticky Sessions) │
              │  Route by sessionId/socketId      │
              └──────────────┬────────────────────┘
                             │
                      ┌──────▼──────┐
                      │ Players     │
                      │ Clients     │
                      └─────────────┘
```

#### Core Changes

##### 1. Add Redis Infrastructure

**Render.com:**
```bash
# Add Redis instance on Render.com
# Cost: $15/mo for 256MB instance
# URL: redis://default:password@host:port
```

**Environment Variables:**
```env
REDIS_URL=redis://default:password@host:6379
```

##### 2. Replace Map-Based State with Redis

**GameBuddieGamesServer: RoomManager**

**BEFORE:**
```typescript
// core/managers/RoomManager.ts
class RoomManager {
  private rooms: Map<string, Room>;
  private playerRoomMap: Map<string, string>;

  getRoomByCode(code: string): Room | undefined {
    return this.rooms.get(code);  // ❌ Local only
  }

  addRoom(room: Room): void {
    this.rooms.set(room.code, room);  // ❌ Local only
  }
}
```

**AFTER:**
```typescript
// core/managers/RoomManager.ts
import { createClient } from 'redis';

class RoomManager {
  private redis: RedisClient;
  private localCache: Map<string, Room>;  // L1 cache for performance

  async getRoomByCode(code: string): Promise<Room | undefined> {
    // 1. Check local cache first
    if (this.localCache.has(code)) {
      return this.localCache.get(code);
    }

    // 2. Check Redis (shared state)
    const data = await this.redis.get(`room:${code}`);
    if (!data) return undefined;

    // 3. Parse and cache locally
    const room = JSON.parse(data);
    this.localCache.set(code, room);
    return room;
  }

  async addRoom(room: Room): Promise<void> {
    // Save to Redis with TTL (2 hours)
    await this.redis.setex(
      `room:${room.code}`,
      7200,  // 2 hours
      JSON.stringify(room)
    );

    // Cache locally
    this.localCache.set(room.code, room);

    // Add to player-room index
    room.players.forEach(player => {
      this.redis.set(`player:${player.id}:room`, room.code);
    });
  }

  async updateRoom(code: string, updates: Partial<Room>): Promise<void> {
    const room = await this.getRoomByCode(code);
    if (!room) throw new Error('Room not found');

    const updated = { ...room, ...updates };

    // Redis: Use WATCH/MULTI/EXEC for atomic updates
    await this.redis.setex(
      `room:${code}`,
      7200,
      JSON.stringify(updated)
    );

    // Local cache
    this.localCache.set(code, updated);

    // Publish update event for all servers
    await this.redis.publish(`room:${code}:update`, JSON.stringify(updated));
  }
}
```

**DDF: EnhancedGameManager**

**BEFORE:**
```typescript
// server/src/game/EnhancedGameManager.js
class EnhancedGameManager {
  games = new Map();

  getGame(roomCode) {
    return this.games.get(roomCode);  // ❌ Per-server only
  }

  setGameState(roomCode, state) {
    this.games.set(roomCode, state);  // ❌ Not shared
  }
}
```

**AFTER:**
```typescript
// server/src/game/EnhancedGameManager.js
const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL });

class EnhancedGameManager {
  async getGame(roomCode) {
    const data = await client.get(`game:${roomCode}`);
    return data ? JSON.parse(data) : null;
  }

  async setGameState(roomCode, state) {
    // Save with TTL
    await client.setex(
      `game:${roomCode}`,
      3600,  // 1 hour
      JSON.stringify(state)
    );

    // Broadcast to all servers
    await client.publish(`game:${roomCode}:stateChange`, JSON.stringify(state));
  }

  async updateGameState(roomCode, updates) {
    const current = await this.getGame(roomCode) || {};
    const updated = { ...current, ...updates };
    await this.setGameState(roomCode, updated);
  }
}
```

##### 3. Add Socket.IO Redis Adapter

**Installation:**
```bash
npm install @socket.io/redis-adapter redis
```

**GameBuddieGamesServer: server.ts**

```typescript
// core/server.ts
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

class GameBuddieServer {
  private setupSocket.io(): void {
    // Create Redis pub/sub clients
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    pubClient.connect();
    subClient.connect();

    // Initialize Socket.IO with Redis adapter
    this.io = new SocketIOServer(this.httpServer, {
      adapter: createAdapter(pubClient, subClient),
      cors: { /* config */ }
    });

    // NOW: io.to(roomCode).emit() reaches ALL servers!
    this.setupGameNamespace();
  }

  private setupGameNamespace(): void {
    const namespace = this.io.of('/gamebuddies');

    namespace.on('connection', (socket: Socket) => {
      const roomCode = socket.handshake.query.room;

      socket.join(roomCode);

      // This broadcasts to ALL server instances now!
      socket.to(roomCode).emit('player:joined', {
        playerId: socket.data.playerId,
        playerName: socket.data.playerName
      });
    });
  }
}
```

**DDF: server.js**

```javascript
// server/src/server.js
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const redisUrl = process.env.REDIS_URL;
const pubClient = createClient({ url: redisUrl });
const subClient = pubClient.duplicate();

pubClient.connect();
subClient.connect();

const io = new SocketIOServer(httpServer, {
  adapter: createAdapter(pubClient, subClient),
  cors: { /* config */ }
});

io.of('/ddf').on('connection', (socket) => {
  const roomCode = socket.handshake.query.room;

  socket.join(roomCode);

  // Cross-server broadcast!
  socket.to(roomCode).emit('game:update', { /* ... */ });
});
```

##### 4. Configure Sticky Sessions at Load Balancer

**Why:** HTTP long-polling sends multiple requests. Each must hit the same server (otherwise in-memory session data is lost).

**Note:** If you use only WebSocket transport, sticky sessions are optional.

**NGINX Configuration:**
```nginx
upstream game_servers {
  # Session affinity by IP hash
  hash $remote_addr consistent;

  server server-1.render.com weight=1;
  server server-2.render.com weight=1;
  server server-3.render.com weight=1;
}

server {
  listen 80;
  server_name gamebuddies.io;

  location / {
    proxy_pass http://game_servers;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
  }
}
```

**AWS ALB:**
```yaml
TargetGroup:
  Name: game-servers
  HealthCheckPath: /health
  HealthCheckInterval: 30s
  Protocol: HTTP

  Attributes:
    - Key: stickiness.enabled
      Value: true
    - Key: stickiness.type
      Value: lb_cookie
    - Key: stickiness.duration
      Value: 86400  # 24 hours

  Targets:
    - Id: server-1:3001
    - Id: server-2:3001
    - Id: server-3:3001
```

**Render.com Limitation:** Does NOT support sticky sessions out of box. Would need custom solution or migration to AWS/GCP.

##### 5. Distributed Room Code Generation

Replace local uniqueness check:

**BEFORE:**
```typescript
// core/managers/RoomManager.ts
private generateUniqueRoomCode(): string {
  let code: string;
  do {
    code = validationService.generateRoomCode();  // Random 6 chars
  } while (this.rooms.has(code));  // ❌ Only checks local Map
  return code;
}
```

**AFTER:**
```typescript
private async generateUniqueRoomCode(): Promise<string> {
  // Use Redis atomic counter for guaranteed uniqueness
  const counter = await this.redis.incr('room_code_counter');

  // Convert to alphanumeric code (Base36)
  const code = this.encodeRoomCode(counter);

  // Verify Redis doesn't have it (race condition safety)
  const exists = await this.redis.exists(`room:${code}`);
  if (exists) {
    // Theoretically shouldn't happen, but retry
    return this.generateUniqueRoomCode();
  }

  return code;
}

private encodeRoomCode(num: number): string {
  // Base36 encoding: 0-9, A-Z (allows 36^6 = 2.17 billion codes)
  return num.toString(36).toUpperCase().padStart(6, '0');
}
```

##### 6. Session Token Storage

**BEFORE:**
```typescript
// core/managers/SessionManager.ts
class SessionManager {
  private sessions: Map<string, PlayerSession>;  // Lost on restart
}
```

**AFTER:**
```typescript
// core/managers/SessionManager.ts
class SessionManager {
  private redis: RedisClient;

  async createSession(
    playerId: string,
    roomCode: string
  ): Promise<{ sessionToken: string }> {
    const sessionToken = generateUUID();

    const session = {
      playerId,
      roomCode,
      createdAt: Date.now()
    };

    // Store with 60-second TTL (grace period for reconnection)
    await this.redis.setex(
      `session:${sessionToken}`,
      60,
      JSON.stringify(session)
    );

    return { sessionToken };
  }

  async getSession(sessionToken: string): Promise<PlayerSession | null> {
    const data = await this.redis.get(`session:${sessionToken}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(sessionToken: string): Promise<void> {
    await this.redis.del(`session:${sessionToken}`);
  }
}
```

#### Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Internet                           │
└────────────────────────┬────────────────────────────────┘
                         │
                    ┌────▼──────┐
                    │ CloudFlare │ (Global CDN + DDoS)
                    │    DNS     │
                    └────┬───────┘
                         │
                    ┌────▼──────────────┐
                    │ AWS ALB / NGINX    │ (Load Balancer)
                    │ Sticky Sessions    │
                    └────┬──┬──┬─────────┘
         ┌──────────────┬─┘  │  └─────────────┐
         │              │    │                │
    ┌────▼────┐    ┌────▼────┐          ┌────▼────┐
    │Server 1  │    │Server 2 │          │Server 3 │
    │Port 3001 │    │Port 3001│          │Port 3001│
    │(ddf-1)   │    │(ddf-2)  │          │(ddf-3)  │
    └────┬─────┘    └────┬────┘          └────┬────┘
         │               │                    │
         └───────────────┴────────┬───────────┘
                                  │
                          ┌───────▼────────┐
                          │ Redis Instance │
                          │ (Redis Cloud)  │
                          │ 1GB Memory     │
                          └────────────────┘
```

#### Implementation Steps

1. **Week 1:** Infrastructure setup (Redis, load balancer)
2. **Week 2-3:** GameBuddieGamesServer refactoring (state → Redis)
3. **Week 3-4:** Socket.IO adapter integration + testing
4. **Week 4-5:** DDF refactoring
5. **Week 5-6:** Multi-server testing, load testing
6. **Week 6-8:** Gradual rollout, monitoring, optimization

#### Pros & Cons

**Pros:**
- True horizontal scaling (add servers freely)
- Automatic failover (if server dies, room continues)
- Load distribution across servers
- Unbounded capacity (5000+, 50000+, etc.)
- High reliability
- Auto-scaling possible

**Cons:**
- Complex (significant refactoring)
- Redis becomes critical dependency
- Higher cost ($60-150/mo)
- Redis management overhead
- Requires testing across multiple servers
- Increased latency (Redis lookups)

---

## Part 4: Technology Stack Requirements

### For Phase 2 (Hybrid)
- No new tech required
- Minimal: GameBuddies API changes only
- Game servers: Optional server registration (simple HTTP calls)

### For Phase 3 (Full Distributed)

#### Redis Instance
```
Service: Render Redis / Redis Cloud
Tier: Starter ($15/mo)
Capacity: 256MB (suitable for <5000 players)
Features: Persistence, backups, monitoring
```

#### Node.js Dependencies
```json
{
  "dependencies": {
    "@socket.io/redis-adapter": "^8.1.0",
    "redis": "^4.6.0"
  },
  "devDependencies": {
    "@types/redis": "^4.0.11"
  }
}
```

#### Load Balancer
- **Render.com:** Use custom domain + URL proxy (limited sticky session support)
- **AWS ALB:** Full ALB with sticky sessions + health checks
- **AWS GameLift:** AWS's managed game server solution (expensive but automatic)
- **NGINX:** Self-hosted (requires VM)
- **HAProxy:** Open-source load balancer

#### Monitoring
```typescript
// Recommended: OpenTelemetry + Datadog / New Relic / Prometheus
```

---

## Part 5: Code Changes Checklist

### GameBuddieGamesServer Changes

#### Phase 2 (Hybrid)
- [ ] Add server registration on startup
- [ ] Add periodic health/load reporting
- [ ] Ensure `/health` endpoint exists
- [ ] Set `SERVER_ID` and `PUBLIC_URL` environment variables

**Estimated Effort:** 1-2 days

#### Phase 3 (Full Distributed)
- [ ] Replace `RoomManager` Map with Redis
- [ ] Replace `SessionManager` Map with Redis
- [ ] Add Redis client connection
- [ ] Update all `this.rooms.get()` → `await redis.get()`
- [ ] Update all `this.rooms.set()` → `await redis.set()`
- [ ] Add Socket.IO Redis adapter
- [ ] Configure sticky sessions at load balancer
- [ ] Update room code generation to use Redis atomic counter
- [ ] Test reconnection across different servers
- [ ] Test room isolation (rooms on different servers)
- [ ] Test broadcasting (socket.to(room).emit works across servers)

**Affected Files:**
```
core/managers/RoomManager.ts        ⚠️ MAJOR changes
core/managers/SessionManager.ts     ⚠️ MAJOR changes
core/server.ts                      ⚠️ Socket.IO adapter
core/managers/GameRegistry.ts       ✅ No changes (plugins don't store state)
games/*/GameManager.ts              ⚠️ Check if any local state
```

**Estimated Effort:** 3-4 weeks

### DDF Changes

#### Phase 2 (Hybrid)
- [ ] No code changes needed!
- [ ] GameBuddies redirects to assigned server
- [ ] Client connects to `window.location.origin` (which is assigned server)

**Estimated Effort:** 0 days

#### Phase 3 (Full Distributed)
- [ ] Replace `EnhancedGameManager` Map with Redis
- [ ] Add Redis client connection
- [ ] Update game state storage/retrieval
- [ ] Add Socket.IO Redis adapter
- [ ] Configure sticky sessions at load balancer
- [ ] Test game state persistence across server restarts

**Affected Files:**
```
server/src/game/EnhancedGameManager.js    ⚠️ MAJOR changes
server/src/server.js                      ⚠️ Socket.IO adapter
client/src/services/socketService.ts      ✅ No changes
server/src/services/gameBuddiesService.js ✅ No changes
```

**Estimated Effort:** 2-3 weeks

---

## Part 6: Cost Analysis

### Current Setup (Single Server)
```
Render Pro Instance (1GB RAM, 1 CPU): $25/month
Total: $25/month
Supports: 500-1000 players
Cost per 100 players: $2.50
```

### Phase 1: Vertical Scaling
```
Render Custom (2GB RAM, 2 CPU): $50/month
or
Render Custom (4GB RAM, 4 CPU): $100/month
or
AWS t3.medium (2GB RAM, 2 vCPU): $35/month
Total: $50-100/month
Supports: 1500-3000 players
Cost per 100 players: $1.67-3.33
```

### Phase 2: Hybrid (Recommended)
```
Server 1 (ddf-1): Render Pro $25/month
Server 2 (ddf-2): Render Pro $25/month
Server 3 (ddf-3): Render Pro $25/month
Total: $75/month
Supports: 1500-3000 players (with load balancing)
Cost per 100 players: $2.50
```

### Phase 3: Full Distributed
```
Server 1: Render Pro $25/month
Server 2: Render Pro $25/month
Server 3: Render Pro $25/month
Redis Instance: Redis Cloud $15/month (or Render Redis $15/month)
Load Balancer: AWS ALB $22/month (or included with Render)
Monitoring: Datadog $20/month (optional)
Total: $127-150/month
Supports: 5000+ players
Cost per 100 players: $2.54-3.00
```

### Cost Efficiency Comparison

| Players | Phase 1 | Phase 2 | Phase 3 | Recommendation |
|---------|---------|---------|---------|-----------------|
| 500 | $25 | $75 ❌ | N/A | Phase 1 (upgrade once) |
| 1000 | $50 | $75 | N/A | Phase 2 (or Phase 1 large) |
| 2000 | $100 | $75 ✅ | $150 | Phase 2 |
| 5000 | $400+ | $225 | $150 ✅ | Phase 3 |
| 10000 | $800+ | $450 | $150 ✅ | Phase 3 |

**Conclusion:** Phase 2 (hybrid) is most cost-effective for 1000-5000 players. Phase 3 only makes sense if you need true unlimited scaling or high availability.

---

## Part 7: Implementation Timeline

### Phase 1: Vertical Scaling
```
Day 1:
  - Monitor current server load
  - Plan instance upgrade (Render Pro or AWS)

Day 2:
  - Upgrade instance size
  - Run load testing
  - Monitor resource usage

Day 3:
  - Document performance improvements
  - Set up alerts for when to scale again

Total: 3 days
```

### Phase 2: Hybrid Scaling

**Dependency:** Requires GameBuddies changes (external)

```
Week 1: Planning & Design
  - Design room-to-server assignment logic
  - Design server registration API
  - Design load balancing algorithm

Week 2: GameBuddies Backend
  - Add game_server_url, game_server_id columns
  - Add /api/game/servers/{gameType} endpoint
  - Add server registration/health check endpoints
  - Update room creation logic
  - Update redirect URL generation

Week 3: Game Server Implementation
  - Add server registration on startup
  - Add health check endpoint
  - Add periodic load reporting
  - Environment variables (SERVER_ID, PUBLIC_URL)

Week 4: Testing & Deployment
  - Test room creation on specific servers
  - Test room joining (player finds correct server)
  - Test failover (what if server is down?)
  - Load test with multiple servers
  - Gradual rollout

Total: 4 weeks
```

### Phase 3: Full Distributed

**Dependency:** Requires Phase 2 complete (optional) or parallel

```
Week 1-2: Infrastructure
  - Spin up Redis instance
  - Set up monitoring
  - Set up load balancer with sticky sessions
  - Test Redis connection, persistence

Week 3-4: GameBuddieGamesServer
  - Refactor RoomManager (Maps → Redis)
  - Refactor SessionManager
  - Add Socket.IO Redis adapter
  - Write integration tests

Week 5: DDF
  - Refactor EnhancedGameManager
  - Add Socket.IO Redis adapter
  - Write integration tests

Week 6: Testing & Stability
  - Multi-server e2e testing
  - Server crash recovery tests
  - Load testing (5000 players)
  - Monitoring & alerts

Week 7-8: Gradual Rollout & Optimization
  - Blue-green deployment
  - Monitor Redis performance
  - Optimize caching strategy
  - Documentation

Total: 8 weeks
```

---

## Part 8: Testing Strategy

### Phase 2 Testing (Hybrid)

```typescript
// Test: Room creation assigns to least-loaded server
describe('Phase 2: Server Assignment', () => {
  it('should assign room to least-loaded server', async () => {
    const servers = [
      { id: 'ddf-1', load: 80 },
      { id: 'ddf-2', load: 30 },  // <- Should pick this
      { id: 'ddf-3', load: 50 }
    ];

    const assigned = await assignServer(servers);
    expect(assigned.id).toBe('ddf-2');
  });

  it('should route player to correct server', async () => {
    const room = await createRoom({
      code: 'ABC123',
      gameType: 'ddf',
      gameServerUrl: 'https://ddf-server-2.render.com'
    });

    const redirect = generateRedirectUrl(room);
    expect(redirect).toContain('ddf-server-2');
  });

  it('should handle server failure gracefully', async () => {
    // Room assigned to ddf-1 which is down
    // Host tries to connect
    // Should get error: "Server unavailable" with suggestion to pick another
  });
});
```

### Phase 3 Testing (Full Distributed)

```typescript
// Test: Socket.IO broadcasts work across servers
describe('Phase 3: Multi-Server Broadcasting', () => {
  it('should broadcast to all servers', async () => {
    // Client 1 on Server 1
    const client1 = io('http://server-1:3001/ddf?room=ABC123');

    // Client 2 on Server 2
    const client2 = io('http://server-2:3001/ddf?room=ABC123');

    let received = false;
    client2.on('game:update', () => {
      received = true;
    });

    // Emit from client 1
    client1.emit('game:action', { action: 'answer', value: 'A' });

    // Wait for Redis Pub/Sub to deliver
    await new Promise(r => setTimeout(r, 100));

    expect(received).toBe(true);  // Should receive on server 2
  });

  it('should survive server restart', async () => {
    // 1. Room and game state in Redis
    // 2. Stop Server 1
    // 3. Client reconnects to Server 2
    // 4. Game state is there (via Redis)
    // 5. Game continues
  });

  it('should handle Redis connection loss gracefully', async () => {
    // Redis goes down
    // Server should fallback to local cache
    // Resume operations
    // Reconnect to Redis
  });
});
```

### Load Testing

```bash
# Phase 1: Single server (500 players)
npm run load-test -- --players 500 --servers 1

# Phase 2: Multiple servers, GameBuddies assignment (1000 players)
npm run load-test -- --players 1000 --servers 3 --assignment hybrid

# Phase 3: Full distributed with Redis (5000 players)
npm run load-test -- --players 5000 --servers 3 --redis true --sticky true
```

---

## Part 9: Monitoring & Alerting

### Key Metrics to Track

**Server-Level:**
```
- CPU usage (% per server)
- Memory usage (% per server)
- Request latency (p50, p95, p99)
- Active WebSocket connections
- Room count
- Player count per room
```

**Redis-Level:**
```
- Connected clients
- Memory usage
- Evictions
- Key hit rate
- Pub/Sub messages/sec
```

**Game-Level:**
```
- Game state updates/sec
- Broadcasting latency
- Room creation time
- Player join time
- Match completion rate
```

### Alert Thresholds

```yaml
Alerts:
  - CPU > 80%: Scale up server
  - Memory > 90%: Immediate response
  - Redis latency > 100ms: Investigate
  - Socket.IO broadcast latency > 500ms: Check network
  - Room creation > 5s: DB/Redis issue
  - Player join failure > 1%: Connection issue
```

---

## Part 10: Migration Guide

### Zero-Downtime Migration from Phase 1 → Phase 2

```
1. Set up new DDF servers (ddf-2, ddf-3) in parallel
2. Update GameBuddies to route new rooms to ddf-2, ddf-3
3. Existing rooms stay on ddf-1
4. Wait for all games to finish on ddf-1
5. Decommission ddf-1
6. Profit!
```

### Zero-Downtime Migration from Phase 2 → Phase 3

```
1. Set up Redis instance (non-disruptive)
2. Deploy new server code to ddf-1 (with Redis code, but fallback to local)
3. Enable Redis gradual rollout: 10% → 25% → 50% → 100%
4. Monitor metrics
5. Once stable, disable local caching fallback
```

---

## Part 11: Recommended Path

### For Small Studios (Current Stage)
**Start here:** Phase 1 → Phase 2

```
Now:
  - Monitor player count (likely <500)
  - Use current single-server setup

When approaching 500 players:
  - Implement Phase 1 (upgrade instance size)
  - Low cost, minimal work

When approaching 2000 players:
  - Implement Phase 2 (GameBuddies server assignment)
  - Moderate cost, moderate work
  - Get experience with multi-server architecture

Future (if needed):
  - Phase 3 (full Redis) only if must support 5000+ players
```

### For Growing Platforms
**Start here:** Phase 2 directly

```
If planning for 5000+ from start:
  - Implement Phase 2 as foundation
  - Plan Phase 3 infrastructure in parallel
  - Can upgrade incrementally as traffic grows
```

### For Enterprise / High-Availability Requirement
**Go full:** Phase 3

```
If must have:
  - Auto-failover
  - Zero data loss
  - Unbounded scaling

→ Implement Phase 3 from start
  - Higher upfront cost
  - Simpler path to 10000+ players
```

---

## Part 12: Quick Reference: Files That Will Change

### GameBuddieGamesServer

**Phase 2:**
- `core/server.ts` - Add server registration
- `core/managers/HealthManager.ts` - New file for health checks
- `render.yaml` - Add environment variables
- `.env` - Add SERVER_ID, PUBLIC_URL

**Phase 3:**
- `core/managers/RoomManager.ts` - Replace all Maps with Redis
- `core/managers/SessionManager.ts` - Replace all Maps with Redis
- `core/server.ts` - Add Socket.IO Redis adapter
- `package.json` - Add redis, @socket.io/redis-adapter
- All game plugins - Update game-state access patterns

### DDF

**Phase 2:**
- No changes (GameBuddies handles routing)

**Phase 3:**
- `server/src/game/EnhancedGameManager.js` - Replace Map with Redis
- `server/src/server.js` - Add Socket.IO Redis adapter
- `package.json` - Add redis, @socket.io/redis-adapter

### GameBuddies

**Phase 2:**
- Database schema (add game_server_url, game_server_id)
- Room creation API (assign servers)
- New server registration endpoints
- Redirect URL generation (include assigned server)

---

## Conclusion

**TL;DR:**

1. **Now:** Monitor player count (probably fine with single server)
2. **500 players:** Vertical scaling (upgrade server size)
3. **2000 players:** Hybrid scaling (GameBuddies assigns servers)
4. **5000+ players:** Full distributed (Redis + multi-server)

**Recommended next step:** Implement Phase 2 when you have 10+ games with 2000+ concurrent players. Until then, vertical scaling is more cost-effective.

**Questions to answer before scaling:**
- What's your actual player count today?
- What's your growth rate?
- What's your reliability requirement?
- Do you have budget for $100+/mo infrastructure?

---

**Document Version:** 1.0
**Last Updated:** 2025-11-05
**Author:** AI Technical Analysis
