# Socket.IO Event Reference - GameBuddies Unified Server

**Last Updated:** 2025-11-06
**Server Location:** E:\GamebuddiesPlatform\GameBuddieGamesServer
**Base Port:** 3001 (configurable via PORT env var)

## Available Games & Namespaces

| Game | Namespace | ID | Min Players | Max Players |
|------|-----------|----|----|---------|
| DDF | `/ddf` | `ddf` | 2 | 20 |
| SUSD | `/susd` | `susd` | 3 | 8 |
| ClueScale | `/clue` | `clue-scale` | 3 | 20 |
| BingoBuddies | `/bingo` | `bingo-buddies` | 2 | 8 |

## Core Events (All Games)

### Room Management

**room:create** - Create new room
- Emit: `socket.emit('room:create', { playerName, settings })`
- Response: `socket.on('room:created', data => { data.room, data.sessionToken })`

**room:join** - Join existing room
- Emit: `socket.emit('room:join', { roomCode, playerName, sessionToken })`
- Response: `socket.on('room:joined', data => { data.room, data.player, data.sessionToken })`
- Broadcast: Other players get `socket.on('player:joined')`

**room:leave** - Leave current room
- Emit: `socket.emit('room:leave')`
- Broadcast: `socket.on('player:left')`

### Chat

**chat:message** - Send message
- Emit: `socket.emit('chat:message', { message })`
- Broadcast: `socket.on('chat:message', chatMessage)`

### WebRTC

**webrtc:enable-video** - Enable video
- Emit: `socket.emit('webrtc:enable-video', { roomCode, connectionType })`
- Broadcast: `socket.on('webrtc:peer-enabled-video')`

**webrtc:disable-video** - Disable video
- Emit: `socket.emit('webrtc:disable-video', { roomCode })`
- Broadcast: `socket.on('webrtc:peer-disabled-video')`

**webrtc:offer** - Send WebRTC offer
- Emit: `socket.emit('webrtc:offer', { roomCode, toPeerId, offer })`
- Unicast: `socket.on('webrtc:offer')`

**webrtc:answer** - Send WebRTC answer
- Emit: `socket.emit('webrtc:answer', { roomCode, toPeerId, answer })`
- Unicast: `socket.on('webrtc:answer')`

**webrtc:ice-candidate** - Send ICE candidate
- Emit: `socket.emit('webrtc:ice-candidate', { roomCode, toPeerId, candidate })`
- Unicast: `socket.on('webrtc:ice-candidate')`

### State Sync

**game:sync-state** - Sync current game state
- Emit: `socket.emit('game:sync-state', { roomCode }, callback)`
- Callback: `(response) => { response.success, response.room }`

## DDF Game Events (`/ddf`)

### Setup
- `ddf:setup-game` → Response: `ddf:game-setup`

### Game Control
- `ddf:start-game` → Response: `ddf:game-state-update`
- `ddf:start-next-turn` → Response: `ddf:game-state-update`
- `ddf:assign-question` → Response: `ddf:game-state-update`
- `ddf:start-new-game` → Response: `ddf:game-state-update`

### Questions
- `ddf:rate-answer` (playerId, rating, answerSummary, questions) → `ddf:game-state-update`
- `ddf:skip-question` → `ddf:game-state-update`
- `ddf:skip-question-keep-player` → `ddf:game-state-update`
- `ddf:mark-question-bad` (questionId) → `ddf:question-marked-bad`
- `ddf:update-categories` (categories) → `ddf:game-state-update`

### Timer
- `ddf:control-timer` (action: start|pause|reset|start-voting, duration) 
  → `ddf:timer-update` or `ddf:game-state-update`

### Voting
- `ddf:submit-vote` (votedPlayerId) → `ddf:game-state-update`
- `ddf:skip-vote` → `ddf:game-state-update`
- `ddf:end-voting` → `server:voting-results`
- `ddf:skip-voting` → `ddf:game-state-update`
- `ddf:toggle-show-questions` → `ddf:game-state-update`
- `ddf:close-voting-results` → `ddf:game-state-update`
- `ddf:close-results-for-all` → `ddf:game-state-update` + `ddf:close-results-broadcast`
- `ddf:break-tie` (selectedPlayerId) → `ddf:game-state-update`

### Finale
- `ddf:submit-finale-answer` (questionId, answer) → `ddf:game-state-update` + `server:all-finale-answers-ready`
- `ddf:evaluate-single-finale` (questionId, questionIndex, evaluations) → `server:finale-single-evaluation-update` + `ddf:game-state-update`
- `ddf:finale-scroll-sync` (scrollTop) → `server:finale-scroll-sync`
- `ddf:next-finale-question` → `ddf:game-state-update`

### Player Management
- `ddf:edit-lives` (playerId, lives) → `ddf:game-state-update`

## Server Broadcasts (All Games)

- `server:game-state-update` - Updated game state
- `player:disconnected` - Player disconnected (grace period starts)
- `host:disconnected` - Host disconnected (game will end)
- `webrtc:peer-left` - WebRTC peer left room

## HTTP Endpoints

### DDF Questions API
- `GET /api/ddf/questions` - Get all questions
- `POST /api/ddf/questions` - Add question
- `PUT /api/ddf/questions/:id` - Update question
- `DELETE /api/ddf/questions/:id` - Delete question
- `GET /api/ddf/questions/bad/stats` - Bad question statistics
- `POST /api/ddf/questions/duplicates/find` - Find duplicates
- `POST /api/ddf/questions/duplicates/delete` - Remove duplicates

### Global Endpoints
- `GET /health` - Server health check
- `GET /api/stats` - Global server statistics
- `GET /api/stats/:gameId` - Game-specific statistics

## Key Data Structures

### Player
```javascript
{
  socketId: string,           // Current Socket.IO ID
  id: string,                 // UUID (stable across reconnects)
  name: string,               // Display name
  isHost: boolean,            // Is this player the host
  connected: boolean,         // Currently connected
  disconnectedAt?: number,    // Timestamp if disconnected
  sessionToken?: string,      // For reconnection
  joinedAt: number,           // Timestamp
  lastActivity: number,       // Last activity timestamp
  gameData?: object           // Game-specific player data
}
```

### Room
```javascript
{
  code: string,               // Room code (e.g., "ABC123")
  gameId: string,             // Game ID
  hostId: string,             // UUID of host
  players: Map<string, Player>,  // socketId -> Player map
  gameState: {
    phase: string,            // Current phase
    data: object              // Game-specific state
  },
  settings: object,           // Room settings
  messages: Message[]         // Chat history
}
```

## Load Testing Considerations

### Basic Connection
```javascript
const socket = io('http://localhost:3001/ddf', {
  reconnection: false,        // Disable auto-reconnect for testing
  transports: ['websocket']   // Use websocket only
});
```

### Typical Flow
1. Connect → `connect` event
2. Emit `room:create` or `room:join`
3. Wait for `room:created` or `room:joined`
4. Emit game events
5. Handle `ddf:game-state-update` broadcasts
6. Handle errors via `error` event

### Performance Tips
- Each room is isolated (failures in one room don't affect others)
- Use `reconnection: false` to avoid auto-reconnect noise
- Monitor websocket message queue size
- Test with multiple concurrent rooms (not just sequential)
- Measure latency: timestamp emit time, measure receive time

## Error Handling

All events can respond with `error`:
```javascript
socket.on('error', (data) => {
  console.log(data.message);  // "Room not found", etc.
});
```

Common errors:
- "Not in a room"
- "Room not found"
- "Invalid player name"
- "Cannot join room (full or already started)"
- "Failed to [action]"

