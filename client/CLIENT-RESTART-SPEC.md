# Prime Suspect Client -- Server Restart Resilience Spec

**Status:** PARTIALLY IMPLEMENTED -- needs emitQueued and pending action replay

---

## 1. Current State Assessment

### 1a. socketService.ts (services/socketService.ts) -- Connection Layer

**Has:**
- `showConnectionToast` (lines 7-24) -- identical to ThinkAlike reference
- `server:restarting` handler (lines 120-123) -- sets `serverRestarting` flag, shows info toast
- `wasDisconnected` tracking (lines 30-31) -- shows "Game restored!" / "Reconnected!" on reconnect
- `socket.recovered` check (lines 87-91) -- Socket.IO v4.5+ CSR support
- Auto-rejoin on reconnect (lines 104-117) -- reads stored session token, room code, player name; emits `room:join`
- `persistReconnectionData` / `getStoredReconnectionData` / `clearReconnectionData` (lines 172-205)
- `reportError` (lines 351-358) -- centralized error reporting
- 30-minute background idle disconnect (lines 40-41, 212-258)
- Page visibility / network listeners (lines 212-304)

**Missing:**
- **`emitQueued` / `getPendingAction` / `clearPendingAction`** -- No queued action system
- **`pendingActionReplayScheduled` flag** -- No replay mechanism on `roomStateUpdated`

### 1b. App.tsx -- State Recovery via useGameBuddiesClient

Prime Suspect uses the `useGameBuddiesClient` hook pattern (shared with HotPotato). App.tsx delegates most socket management to this hook.

**Has:**
- `ReconnectOverlay` integration (lines 507-516) -- listens for `game:restored`, `game:resumed`, `player:reconnected`
- `restoreInfo` state (lines 147, 237-245) -- same pattern as ThinkAlike
- `registerGameEvents` callback (lines 159-262) -- registers `roomStateUpdated`, `timer:update`, `game:victory`, `game:no-match`, `game:log`, `game:backToLobby`, plus reconnect overlay events

### 1c. useGameBuddiesClient.ts (hooks/useGameBuddiesClient.ts) -- Core Client Hook

**Has:**
- Session reconnection via `session:reconnect` emit with callback (lines 249-289)
- Stale session detection (lines 307-314) -- discards old session when new URL session differs
- `game:sync-state` follow-up after reconnection (lines 269-278)
- GameBuddies session auto-join/create with retry logic (lines 208-236, 330-360)
- `persistReconnectionData` (lines 136-145)

**Missing:**
- No `emitQueued` integration
- No pending action replay after `roomStateUpdated`

---

## 2. Game Components with Local State Risk

### 2a. HeartsGambitGame.tsx (components/hearts-gambit/HeartsGambitGame.tsx)

**Risk: MEDIUM** -- Hearts Gambit is a card game where players play/discard cards.

Prime Suspect's primary game mode is "Hearts Gambit" -- a card game. Actions include:
- Playing a card from hand
- Discarding a card (forced)
- Drawing cards

These are discrete actions emitted to the server. If the server restarts mid-turn:
- The current player's pending play is lost
- The game state (hands, discards, turn order) is held server-side

After reconnect, `roomStateUpdated` will restore the full game state including whose turn it is. The main risk is a card play that was emitted but not processed.

**Fix needed:** Use `emitQueued` for card play/discard events so they survive restart.

### 2b. GameComponent.tsx (components/GameComponent.tsx)

This is a router component that delegates to `HeartsGambitGame`. No local state risk itself.

### 2c. TextModeInput.tsx (components/game/TextModeInput.tsx)

**Risk: NONE** -- This is a stub (`Legacy Component Removed`). The original word-input game mode has been removed.

### 2d. VoiceModeInput.tsx (components/game/VoiceModeInput.tsx)

**Risk: LOW** -- Voice input is transient by nature. If the server restarts mid-recording, the player simply re-records.

### 2e. Lobby.tsx / LobbyPage.tsx

**Risk: NONE** -- Lobby state is fully server-driven. `roomStateUpdated` restores everything.

---

## 3. Concrete Changes Needed

### Priority 1: Add emitQueued to socketService.ts

Add the following methods to the `SocketService` class (copy from ThinkAlike):

```typescript
private static readonly PENDING_ACTION_KEY = 'ps_pending_action';

emitQueued(event: string, payload: any): void {
  sessionStorage.setItem(SocketService.PENDING_ACTION_KEY, JSON.stringify({ event, payload, ts: Date.now() }));
  this.emit(event, payload);
}

getPendingAction(): { event: string; payload: any; ts: number } | null {
  const raw = sessionStorage.getItem(SocketService.PENDING_ACTION_KEY);
  if (!raw) return null;
  try {
    const action = JSON.parse(raw);
    if (Date.now() - action.ts > 5 * 60 * 1000) {
      sessionStorage.removeItem(SocketService.PENDING_ACTION_KEY);
      return null;
    }
    return action;
  } catch { return null; }
}

clearPendingAction(): void {
  sessionStorage.removeItem(SocketService.PENDING_ACTION_KEY);
}
```

### Priority 2: Add Pending Action Replay on roomStateUpdated

In `socketService.ts`, add the replay mechanism inside the `connect()` method, exactly like ThinkAlike:

```typescript
private pendingActionReplayScheduled = false;

// In the connect handler, after wasDisconnected check:
if (this.getPendingAction()) {
  this.pendingActionReplayScheduled = true;
}

// New listener:
this.socket.on('roomStateUpdated', () => {
  if (this.pendingActionReplayScheduled) {
    this.pendingActionReplayScheduled = false;
    const pending = this.getPendingAction();
    if (pending) {
      setTimeout(() => {
        const stillPending = this.getPendingAction();
        if (stillPending && this.socket?.connected) {
          this.socket.emit(stillPending.event, stillPending.payload);
        }
      }, 2000);
    }
  }
});
```

### Priority 3: Use emitQueued in HeartsGambitGame

In `HeartsGambitGame.tsx` and `HeartsGambitGameMobile.tsx`, replace direct `socket.emit` calls for game actions with `socketService.emitQueued`:

**Card play events to queue:**
- `game:play-card` (when player plays a card on their turn)
- `game:discard` (when player is forced to discard)

**Events that do NOT need queuing:**
- `game:draw-card` (idempotent -- server handles duplicate draws)
- Chat messages
- Settings changes

### Priority 4: Clear Pending Action on Phase/Turn Change

In the `registerGameEvents` callback in `App.tsx`, when handling `roomStateUpdated`:

```typescript
// After setting lobby state:
import socketService from '../services/socketService';

// On new turn or phase change, clear stale pending actions
const prevPhase = helpers.currentPhase; // need to track
if (updatedLobby.gameData?.phase !== prevPhase) {
  socketService.clearPendingAction();
}
```

Or more simply: clear pending action when the server confirms the action was processed (e.g., turn advances).

---

## 4. Summary Table

| Feature | ThinkAlike (ref) | Prime Suspect | Action |
|---------|-----------------|---------------|--------|
| showConnectionToast | YES | YES | None |
| server:restarting | YES | YES | None |
| Auto-rejoin on reconnect | YES | YES | None |
| socket.recovered (CSR) | YES | YES | None |
| emitQueued | YES | **NO** | Add to socketService.ts |
| Pending action replay | YES | **NO** | Add roomStateUpdated listener in socketService |
| session:reconnect | Via room:join | Via explicit callback | Already good |
| game:sync-state follow-up | N/A | YES (in hook) | Already good |
| Component syncs with server state | YES | Partial | HeartsGambit needs clearPendingAction |
| ReconnectOverlay | YES | YES | None |
| 30-min background disconnect | YES | YES | None |
| reportError | YES | YES | None |
| Clear pending on phase change | YES | **NO** | Add to registerGameEvents |

---

## 5. Architecture Note

Prime Suspect uses `useGameBuddiesClient` hook + `registerGameEvents` pattern for socket management. The `emitQueued` functionality should live in the `socketService` singleton (not the hook) because:
1. It needs to persist across React re-renders.
2. The replay logic triggers on raw socket events, not React state.
3. Game components can import `socketService` directly for `emitQueued`.
