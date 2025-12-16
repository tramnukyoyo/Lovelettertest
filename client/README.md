# GameBuddies Game Template

This is the ThinkAlike client, designed to serve as a template for creating new GameBuddies games with WebRTC video chat integration.

## Quick Start

1. Fork this repository
2. Rename game-specific files and update types
3. Replace game components in `src/components/game/`
4. Update socket events in `src/types.ts`
5. Modify server plugin in `GameBuddieGamesServer/games/`

## Architecture Overview

```
src/
├── components/
│   ├── game/           # GAME-SPECIFIC - Replace these
│   │   ├── TextModeInput.tsx      # Main game input
│   │   ├── VoiceModeInput.tsx     # Alternative input mode
│   │   ├── RevealScreen.tsx       # Round result display
│   │   ├── VictoryScreen.tsx      # Win screen
│   │   ├── GameOverScreen.tsx     # Lose screen
│   │   └── SpectatorView.tsx      # Spectator UI
│   ├── ui/             # REUSABLE - Keep or customize
│   │   ├── LivesDisplay.tsx
│   │   ├── WordHistory.tsx
│   │   └── Timer.tsx
│   ├── overlays/       # REUSABLE - Keep or customize
│   ├── animations/     # REUSABLE - Keep or customize
│   ├── GameComponent.tsx    # GAME-SPECIFIC - Main game router
│   ├── Lobby.tsx            # REUSABLE - Lobby UI
│   ├── Home.tsx             # REUSABLE - Join/Create UI
│   ├── ChatWindow.tsx       # REUSABLE - Chat component
│   ├── PlayerList.tsx       # REUSABLE - Player list
│   └── ErrorBoundary.tsx    # REUSABLE - Error handling
├── contexts/
│   ├── WebRTCContext.tsx    # REUSABLE - Video chat (don't modify)
│   ├── VideoUIContext.tsx   # REUSABLE - Video UI state
│   └── ThemeContext.tsx     # REUSABLE - Theme management
├── services/
│   ├── socketService.ts     # REUSABLE - Socket.IO client
│   └── gameBuddiesSession.ts # REUSABLE - Session management
├── types.ts                 # GAME-SPECIFIC - Define your types here
├── App.tsx                  # SEMI-REUSABLE - Update socket events
└── main.tsx                 # REUSABLE - Entry point
```

## Files to Customize

### Must Replace (Game-Specific)

| File | Purpose |
|------|---------|
| `components/game/TextModeInput.tsx` | Main game input mechanism |
| `components/game/VoiceModeInput.tsx` | Alternative input mode |
| `components/game/RevealScreen.tsx` | Round result display |
| `components/game/VictoryScreen.tsx` | Win condition screen |
| `components/game/GameOverScreen.tsx` | Lose condition screen |
| `components/GameComponent.tsx` | Game phase routing |
| `types.ts` | Game state types and socket events |

### May Customize (Semi-Reusable)

| File | Purpose |
|------|---------|
| `App.tsx` | Update game-specific socket events |
| `components/ui/LivesDisplay.tsx` | Score/lives display |
| `components/overlays/RoundStartOverlay.tsx` | Round transition |

### Don't Modify (Fully Reusable)

| File | Purpose |
|------|---------|
| `contexts/WebRTCContext.tsx` | WebRTC video chat |
| `services/socketService.ts` | Socket.IO client |
| `components/ChatWindow.tsx` | Chat functionality |
| `components/ErrorBoundary.tsx` | Error handling |
| `hooks/useGameBuddiesClient.ts` | Room lifecycle + reconnection + chat |
| `config/gameMeta.ts` | Centralized game name/branding copy |

## GameBuddies Client Hook

`hooks/useGameBuddiesClient.ts` now centralizes the reusable GameBuddies plumbing:

- Connects to the correct namespace and persists reconnection tokens.
- Handles room create/join responses, player list updates, chat, and kick/error cases.
- Auto-resolves GameBuddies session tokens (host vs player) and auto-joins/creates.
- Exposes a `registerGameEvents` hook so each game can wire its own socket events without rewriting the core lifecycle.

Usage example (ThinkAlike):

```tsx
const registerGameEvents = useCallback((socket, helpers) => {
  socket.on('roomStateUpdated', helpers.setLobbyState);
  socket.on('timer:update', ({ timeRemaining }) => {
    helpers.patchLobby(prev => !prev?.gameData ? prev : {
      ...prev,
      gameData: { ...prev.gameData, timeRemaining }
    });
  });
  return () => {
    socket.off('roomStateUpdated', helpers.setLobbyState);
    socket.off('timer:update');
  };
}, []);

const { lobby, socket, messages, isConnected, createRoom, joinRoom } =
  useGameBuddiesClient({ registerGameEvents });
```

Keep your game-specific listeners inside `registerGameEvents`; the hook already tracks reconnection, session persistence, player lists, and chat.

## Socket Contract

Authoritative event mapping is in `docs/SOCKET_CONTRACT.md`. Use that file as the single truth when wiring new games and keep server/client payloads aligned there.

## Branding Config

`config/gameMeta.ts` centralizes the game name/tagline/mascot alt text so you can rebrand or clone the client without hunting strings across components.

## Socket Events

### Core Events (Keep These)
- `room:create` / `room:created`
- `room:join` / `room:joined`
- `room:player-joined` / `room:player-left`
- `chat:message` / `chat:received`
- `session:reconnect`

### Game Events (Replace These)
- `game:start` - Start the game
- `game:submit-word` - Submit game input
- `game:next-round` - Move to next round
- `game:restart` - Restart game
- `roomStateUpdated` - Full state sync
- `game:victory` / `game:ended` - Game end states

## Type Definitions

Update `types.ts` with your game's types:

```typescript
// Your game states
export type GameState = 'LOBBY_WAITING' | 'PLAYING' | 'GAME_OVER';

// Your player data
export interface Player {
  socketId: string;
  name: string;
  // Add your game-specific fields
  score?: number;
}

// Your game data
export interface GameData {
  // Add your game-specific state
  currentRound: number;
}

// Socket event payloads
export interface YourGameEventPayload {
  // Define your event types
}
```

## Server Plugin

Create a corresponding server plugin in `GameBuddieGamesServer/games/yourgame/`:

```
games/yourgame/
├── plugin.ts    # Main game logic
└── types.ts     # Server-side types
```

See `games/thinkalike/plugin.ts` for reference implementation.

## WebRTC Video Chat

Video chat is already integrated and ready to use. Key features:
- Virtual backgrounds
- Audio processing
- Face avatars
- Device management
- Reconnection handling

No modifications needed - it works out of the box.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type check
npm run typecheck
```

## Testing Checklist

Before deploying your game:
- [ ] Game works with 2 players
- [ ] Spectators can watch (3+ players)
- [ ] Reconnection works mid-game
- [ ] Video chat functions correctly
- [ ] Game restarts properly
- [ ] Error boundary catches crashes
