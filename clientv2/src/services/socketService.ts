import { io, Socket } from 'socket.io-client';
import msgpackParser from 'socket.io-msgpack-parser';
import { applyPatch, deepClone } from 'fast-json-patch';
import { STORAGE_KEYS } from '../config/storageKeys';
import { SERVERS, GAME_NAMESPACE, DISCORD_SOCKET_PATH, isCapacitor } from '../config/servers';
import type { Region } from '../config/servers';
import { isDiscordActivity } from './discordActivity';
import { detectFastestRegion } from './regionService';
import { trackGameError, trackReconnect } from './analyticsService';
import { resolveSessionToken } from './gameBuddiesSession';

// Capture URL routing hint at MODULE LOAD time. HomePage's useEffect runs
// `window.history.replaceState({}, '', window.location.pathname)` to clean
// up the address bar — and that fires BEFORE socketService.connect() awaits
// region detection and runs. By the time connect() reads window.location.search,
// the `?invite=` is already gone, the cluster master sees no roomCode hint, and
// IP-hashes the join to a random worker → "room not found" for cross-IP joiners.
// Module-level evaluation runs once during initial bundle parse, before React
// even mounts. The browser address bar still gets stripped by HomePage (cosmetic
// behavior preserved); only the WebSocket connection URL gains the routing hint.
const _initialRoutingRoomCode: string | undefined = (() => {
  try {
    const p = new URLSearchParams(window.location.search);
    return p.get('room') || p.get('invite') || undefined;
  } catch {
    return undefined;
  }
})();

class SocketService {
  private socket: Socket | null = null;
  private currentRegion: Region = 'eu';
  private reconnectAttempts = 0;
  // Infinity: never stop retrying. A cold cluster/Render boot can exceed the old
  // 15-attempt (~70s) budget and strand in-room users with no recovery. Keep
  // retrying with capped backoff instead.
  private maxReconnectAttempts = Infinity;
  private listenersSetup = false;
  private wasDisconnected = false;
  private lastStateVersion = 0; // Desync detection
  // v22 delta broadcast — baseline for applying roomStateDelta patches
  private lastFullState: any = null;

  // v23 Phase B — cached overlay patch (json-patch describing how to turn
  // public state into this player's personal view). Server emits roomStatePrivate
  // only when private fields actually change; we re-apply this on every public
  // update so app code sees the merged personal state.
  private lastPrivateOverlayPatch: any[] | null = null;
  // Reference to our OWN internal `roomStateUpdated` handler so the delta /
  // private re-dispatch loop can exclude it. Re-feeding the merged dispatch
  // state into the internal handler would re-pollute lastFullState (it would
  // `deepClone` the merged view back into the pure-public baseline) and break
  // subsequent positional array deltas. audit 2026-06.
  private internalRoomStateHandler: ((data: any) => void) | null = null;
  // Store listener references for cleanup
  // Timestamp of the last visibility-triggered session:reconnect emit — used to
  // throttle it so it can't double-fire the rejoin alongside the hook's onConnect.
  private lastSessionReconnectAt = 0;
  private visibilityListener: (() => void) | null = null;
  private onlineListener: (() => void) | null = null;
  private offlineListener: (() => void) | null = null;

  /**
   * Resolve the room code from the GameBuddies session token BEFORE the socket
   * opens, so the cluster routing hint is present without ever putting the room
   * code in the page URL (streamer-safe). Only used when the URL carries no
   * ?room=/?invite= hint — i.e. the platform→game handoff, which passes only
   * ?session=. Bounded by a short timeout so a slow/down session API never
   * blocks the connection; on failure we connect without the hint.
   */
  private async resolveRoutingRoomCode(): Promise<string | undefined> {
    let token: string | undefined;
    try {
      token = new URLSearchParams(window.location.search).get('session') || undefined;
    } catch { /* ignore */ }
    if (!token) {
      try {
        const pending = JSON.parse(sessionStorage.getItem('gamebuddies:session') || 'null');
        token = pending?.sessionToken || undefined;
      } catch { /* ignore */ }
    }
    if (!token) {
      token = sessionStorage.getItem('gameSessionToken') || undefined;
    }
    if (!token) return undefined;

    try {
      const resolved = await Promise.race([
        resolveSessionToken(token),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
      ]);
      const roomCode = resolved?.roomCode;
      if (roomCode) {
        sessionStorage.setItem('lastRoomCode', roomCode);
        return roomCode;
      }
    } catch (err) {
      console.warn('[Socket] Pre-connect room-code resolve failed; connecting without routing hint:', err);
    }
    return undefined;
  }

  async connect(): Promise<Socket> {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Determine server URL based on environment
    let serverUrl: string;
    let region: Region = 'eu';

    const inDiscord = isDiscordActivity();

    if (inDiscord) {
      // Discord Activity — connect through the discordsays.com proxy (same origin).
      // Skip region probing (latency probes to onrender hosts can't resolve through
      // the sandbox). The transport routes to the gameserver via DISCORD_SOCKET_PATH
      // below; the /bluffalo namespace stays in the io() URL.
      console.log('[Video/socket] Discord Activity detected, connecting via proxy');
      serverUrl = window.location.origin;
    } else if (isCapacitor()) {
      // Capacitor - use hardcoded DDF server
      console.log('[Video/socket] Capacitor detected, using DDF server');
      serverUrl = 'https://ddf-server.onrender.com';
    } else {
      // Web - detect fastest region
      region = await detectFastestRegion();
      this.currentRegion = region;
      serverUrl = SERVERS[region];
    }

    console.log(`[Video/socket] Connecting to ${region.toUpperCase()} server:`, serverUrl + GAME_NAMESPACE);

    // Cluster-routing hint: include roomCode in connection URL so the
    // gameserver cluster master can route us to the worker that owns the
    // room. Without this, joiners from a different IP than the host land
    // on a different worker (rooms live in per-worker memory) and see
    // "room not found" (BC4HB3 incident).
    // Use the module-load capture (above) — HomePage strips the URL via
    // history.replaceState BEFORE this code runs, so window.location.search
    // is empty by now. sessionStorage.lastRoomCode covers in-app navigation.
    let _routingRoomCode: string | undefined =
      _initialRoutingRoomCode ||
      sessionStorage.getItem('lastRoomCode') ||
      // Cluster fix: fall back to the persisted reconnect room code, set by
      // persistReconnectionData() on every room create/join, so a same-tab
      // reconnect after a server reboot ALWAYS carries the worker-routing hint
      // and lands on the worker that owns the room instead of IP-hashing to a
      // random worker (room_closed / cross-worker split-brain). No network call.
      sessionStorage.getItem(STORAGE_KEYS.SESSION.ROOM_CODE) ||
      undefined;
    // Visible debug marker so users can confirm in DevTools whether the
    // bundle they loaded is actually executing the cluster-routing patch.
    // Filter console for "[ClusterRouting]" — if you don't see this line at
    // all, the bundle is stale (clear cache / private tab).
    console.log(
      `[ClusterRouting] ${_routingRoomCode
        ? 'sending roomCode=' + _routingRoomCode.toUpperCase()
        : 'no hint — will fall back to IP-hash on the server'}`
    );
    if (!_routingRoomCode) {
      _routingRoomCode = await this.resolveRoutingRoomCode();
    }
    this.socket = io(`${serverUrl}${GAME_NAMESPACE}`, {
      ...(_routingRoomCode ? { query: { roomCode: _routingRoomCode.toUpperCase() } } : {}),
      // Discord Activity: route the engine.io transport through the proxy.
      ...(inDiscord ? { path: DISCORD_SOCKET_PATH } : {}),
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      parser: msgpackParser,
      transports: ['websocket'],
      timeout: 20000,
      forceNew: false,
      multiplex: true,
    });

    this.socket.on('connect', () => {
      console.log('[Video/socket] Connected:', this.socket?.id);
      this.reconnectAttempts = 0;

      // Check for automatic state recovery (Socket.IO v4.5+)
      if ((this.socket as any).recovered) {
        console.log('[Video/socket] Connection state recovered automatically');
        return;
      }

      // Check for session token in URL params
      const params = new URLSearchParams(window.location.search);
      if (params.has('session')) {
        const urlToken = params.get('session') || '';
        if (urlToken) {
          console.log('[Video/socket] Session token detected in URL');
          sessionStorage.setItem('gameSessionToken', urlToken);
        }
      }

      // Manual reconnection with stored data — only if we actually disconnected
      // (prevents phantom reconnect events from transport upgrades or initial connect).
      // When a gameSessionToken exists, useGameBuddiesClient's onConnect handles the
      // rejoin via session:reconnect — emitting room:join here too would race it and
      // can double-join the player. Keep room:join only as the no-session fallback.
      const hasGameSession = !!sessionStorage.getItem('gameSessionToken');
      const stored = this.getStoredReconnectionData();
      if (!hasGameSession && stored.sessionToken && stored.roomCode && stored.playerName && this.wasDisconnected) {
        console.log(`[Video/socket] Attempting auto-reconnection to room ${stored.roomCode}`);
        this.socket?.emit('room:join', {
          roomCode: stored.roomCode,
          playerName: stored.playerName,
          sessionToken: stored.sessionToken,
          avatarUrl: stored.avatarUrl || undefined,
        });
      }
      this.wasDisconnected = false;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Video/socket] Disconnected:', reason);
      this.wasDisconnected = true;
    });

    this.socket.on('reconnect_attempt', () => {
      this.reconnectAttempts++;
      console.log(`[Video/socket] Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    });

    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log(`[Video/socket] Reconnected after ${attemptNumber} attempts`);
      trackReconnect(true, 'socket.io');
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[Video/socket] Reconnection failed after all attempts');
      trackReconnect(false, 'socket.io');
    });

    this.socket.on('error', (error: any) => {
      console.error('[Video/socket] Error:', error);
      trackGameError(error?.message || String(error));
    });

    // Server-side precondition rejections (see GameBuddieGamesServer rejectAction helper).
    // Previously these were silent `return;` calls that left clients hanging. Now they
    // arrive explicitly AND are written to game_client_errors on the server.
    this.socket.on('action:rejected', (payload: { event: string; reason: string; roomCode?: string; context?: unknown; ts?: number }) => {
      console.warn('[Video/socket] action:rejected', payload);
      trackGameError(`[action:rejected] ${payload?.event}: ${payload?.reason}`);
    });

    // Desync detection — request resync if state versions jump
    const internalRoomStateHandler = (data: any) => {
      if (data?._stateVersion) {
        const expected = this.lastStateVersion + 1;
        if (this.lastStateVersion > 0 && data._stateVersion > expected) {
          console.warn(`[Video/socket] State desync detected: expected v${expected}, got v${data._stateVersion} (${data._stateVersion - expected} missed)`);
          // Don't request resync — this IS the resync (latest state). Just log it.
        }
        this.lastStateVersion = data._stateVersion;
      }
      // v22 — cache full state for roomStateDelta patches
      this.lastFullState = deepClone(data);
      // v23 Phase B — re-apply cached private overlay so app code sees merged personal view
      if (this.lastPrivateOverlayPatch && this.lastPrivateOverlayPatch.length > 0) {
        try {
          applyPatch(data, this.lastPrivateOverlayPatch, false, true);
        } catch (err) {
          console.error('[Socket] private overlay re-apply failed on roomStateUpdated:', err);
          this.lastPrivateOverlayPatch = null;
          this.socket?.emit('client:request-resync', { reason: 'overlay-reapply-failed' });
        }
      }
    };
    this.internalRoomStateHandler = internalRoomStateHandler;
    this.socket.on('roomStateUpdated', internalRoomStateHandler);
      // v22 — store full state as baseline for future roomStateDelta patches
      // (no-op if data is undefined; handler is called via socket.io)
    // v22 delta broadcast — apply JSON Patch RFC 6902 to last known full
    // state. Server emits this for high-frequency state changes when the
    // patch is smaller than 50% of the full state. Saves ~60-75% bandwidth
    // + frees server CPU.
    this.socket.on('roomStateDelta', (delta: any) => {
      if (!this.lastFullState) {
        console.warn('[Socket] roomStateDelta received with no baseline — requesting resync');
        this.socket?.emit('client:request-resync', { reason: 'no-baseline' });
        return;
      }
      const expected = this.lastStateVersion + 1;
      if (this.lastStateVersion > 0 && delta._stateVersion !== expected) {
        console.warn(`[Socket] roomStateDelta version gap: expected v${expected}, got v${delta._stateVersion} — requesting resync`);
        this.socket?.emit('client:request-resync', { reason: 'version-gap' });
        return;
      }
      try {
        const result = applyPatch(this.lastFullState, delta.patch, false, false);
        let newState = result.newDocument as any;
        if (delta.mySocketId) newState.mySocketId = delta.mySocketId;
        newState._stateVersion = delta._stateVersion;
        // Keep newState as the PURE-PUBLIC baseline (the server diffs deltas
        // against pure-public + uses positional array ops). Apply the overlay to
        // a CLONE for dispatch only, and re-dispatch to APP listeners (NOT our
        // internal handler, which would re-pollute the baseline). audit 2026-06.
        this.lastFullState = newState;
        this.lastStateVersion = delta._stateVersion;
        const dispatch = this.applyOverlayForDispatch(newState);
        this.dispatchMergedState(dispatch);
      } catch (err) {
        console.error('[Socket] applyPatch failed:', err);
        this.socket?.emit('client:request-resync', { reason: 'patch-error' });
      }
    });
    // v23 Phase B — Private overlay events. Server sends overlay as a json-patch
    // describing how to turn public state into THIS player's personal view.
    // Cached and re-applied on every public update; server skips emit when patch
    // unchanged. Empty patch = clear signal.
    this.socket.on('roomStatePrivate', (msg: any) => {
      const newPatch = Array.isArray(msg?.overlayPatch) ? msg.overlayPatch : [];
      this.lastPrivateOverlayPatch = newPatch.length > 0 ? newPatch : null;
      // Reconcile the shared version counter — an overlay-only broadcast (public
      // unchanged) would otherwise make the next public delta look like a gap and
      // trigger a spurious resync. audit 2026-06.
      if (typeof msg?._stateVersion === 'number' && msg._stateVersion > this.lastStateVersion) {
        this.lastStateVersion = msg._stateVersion;
      }
      if (!this.lastFullState) {
        // No baseline yet — overlay applies on first public arrival.
        return;
      }
      try {
        // Derive the merged view on a CLONE for dispatch — NEVER write it back to
        // lastFullState, which must stay the pure-public baseline. audit 2026-06.
        const dispatch = this.applyOverlayForDispatch(this.lastFullState);
        if (msg._stateVersion) dispatch._stateVersion = msg._stateVersion;
        this.dispatchMergedState(dispatch);
      } catch (err) {
        console.error('[Socket] roomStatePrivate apply failed:', err);
        this.lastPrivateOverlayPatch = null;
        this.socket?.emit('client:request-resync', { reason: 'private-patch-error' });
      }
    });





    // Reset version tracking on disconnect
    this.socket.on('disconnect', () => {
      this.lastStateVersion = 0;
      this.lastFullState = null;
      this.lastPrivateOverlayPatch = null;
    });

    // Setup browser event listeners (only once)
    if (!this.listenersSetup) {
      this.setupPageVisibilityListener();
      this.setupNetworkListeners();
      this.listenersSetup = true;
    }

    return this.socket;
  }

  // ===== Session Storage Methods =====

  persistReconnectionData(roomCode: string, playerName: string, sessionToken: string): void {
    console.log(`[Video/socket] Persisting reconnection data for room ${roomCode}`);
    sessionStorage.setItem(STORAGE_KEYS.SESSION.ROOM_CODE, roomCode);
    sessionStorage.setItem(STORAGE_KEYS.SESSION.PLAYER_NAME, playerName);
    sessionStorage.setItem(STORAGE_KEYS.SESSION.SESSION_TOKEN, sessionToken);
    // Cluster routing hint: keep lastRoomCode in sync so a reconnect after a
    // server reboot routes to the worker that owns this room (see connect()).
    sessionStorage.setItem('lastRoomCode', roomCode);
  }

  getStoredReconnectionData(): {
    roomCode: string | null;
    playerName: string | null;
    sessionToken: string | null;
    avatarUrl: string | null;
  } {
    return {
      roomCode: sessionStorage.getItem(STORAGE_KEYS.SESSION.ROOM_CODE),
      playerName: sessionStorage.getItem(STORAGE_KEYS.SESSION.PLAYER_NAME),
      sessionToken: sessionStorage.getItem(STORAGE_KEYS.SESSION.SESSION_TOKEN),
      avatarUrl: sessionStorage.getItem('avatarUrl'),
    };
  }

  clearReconnectionData(): void {
    console.log('[Video/socket] Clearing reconnection data');
    sessionStorage.removeItem(STORAGE_KEYS.SESSION.ROOM_CODE);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION.PLAYER_NAME);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION.SESSION_TOKEN);
    // Drop the cluster routing hint too so a fresh connect doesn't route by a stale code.
    sessionStorage.removeItem('lastRoomCode');
  }

  // ===== Browser Event Listeners =====

  private setupPageVisibilityListener(): void {
    this.visibilityListener = () => {
      const stored = this.getStoredReconnectionData();

      if (document.visibilityState === 'visible') {
        console.log('[Video/socket] Page became visible');

        if (!this.socket?.connected) {
          console.log('[Video/socket] Connection lost while backgrounded, reconnecting...');
          this.socket?.connect();
        } else if (stored.sessionToken && stored.roomCode) {
          // Server-side state may have been GC'd while backgrounded. Fire a full
          // session:reconnect to rebind the socket via sessionToken (hot-restores
          // the room from snapshot if it's no longer in memory).
          // Throttle: the hook's onConnect also owns session:reconnect (single
          // rejoin owner). Skip this ackless emit if one fired <5s ago so a
          // visibility flip coinciding with an auto-reconnect doesn't double-rejoin.
          if (Date.now() - this.lastSessionReconnectAt > 5000) {
            this.lastSessionReconnectAt = Date.now();
            console.log('[Video/socket] Page visible — firing session:reconnect to rebind state');
            this.socket.emit('session:reconnect', { sessionToken: stored.sessionToken });
          } else {
            console.log('[Video/socket] Page visible — session:reconnect throttled (<5s)');
          }
        } else if (stored.roomCode) {
          console.log('[Video/socket] Sending heartbeat to server');
          this.socket.emit('client:heartbeat', {
            roomCode: stored.roomCode,
            timestamp: Date.now(),
          });
        }
      } else {
        console.log('[Video/socket] Page backgrounded');
        if (this.socket?.connected && stored.roomCode) {
          this.socket.emit('client:page-backgrounded', {
            roomCode: stored.roomCode,
            timestamp: Date.now(),
          });
        }
      }
    };
    document.addEventListener('visibilitychange', this.visibilityListener);
  }

  private setupNetworkListeners(): void {
    this.onlineListener = () => {
      console.log('[Video/socket] Network online - checking connection');
      if (!this.socket?.connected) {
        console.log('[Video/socket] Reconnecting after network restored...');
        this.socket?.connect();
      }
    };

    this.offlineListener = () => {
      console.log('[Video/socket] Network offline');
    };

    window.addEventListener('online', this.onlineListener);
    window.addEventListener('offline', this.offlineListener);
  }

  private cleanupBrowserListeners(): void {
    if (this.visibilityListener) {
      document.removeEventListener('visibilitychange', this.visibilityListener);
      this.visibilityListener = null;
    }
    if (this.onlineListener) {
      window.removeEventListener('online', this.onlineListener);
      this.onlineListener = null;
    }
    if (this.offlineListener) {
      window.removeEventListener('offline', this.offlineListener);
      this.offlineListener = null;
    }
    this.listenersSetup = false;
  }

  // ===== Core Socket Methods =====

  getSocket(): Socket | null {
    return this.socket;
  }

  disconnect(): void {
    this.cleanupBrowserListeners();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('[Video/socket] Disconnected');
    }
  }

  /**
   * Emit an event. Returns true only when it actually went out on the wire.
   * Callers that render success (haptics, optimistic UI, "submitted!" state)
   * MUST check the result — with a dead socket the event is silently dropped.
   */
  emit(event: string, data?: unknown): boolean {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
      return true;
    }
    console.error('[Video/socket] Cannot emit - not connected');
    return false;
  }

  on(event: string, callback: (...args: unknown[]) => void): void {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: unknown[]) => void): void {
    this.socket?.off(event, callback);
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /** Request a full state resync from the server (e.g. after suspected desync). */
  requestResync(): void {
    if (this.socket?.connected) {
      console.log('[Video/socket] Requesting state resync from server');
      this.socket.emit('client:request-resync');
    }
  }

  /** Get the last received state version (for desync detection). */
  getLastStateVersion(): number {
    return this.lastStateVersion;
  }

  /** Pure-public baseline (overlay NOT baked in). Exposed for tests/debugging. */
  getLastFullState(): any {
    return this.lastFullState;
  }

  /**
   * Merged personal view for dispatch WITHOUT mutating the pure baseline.
   * Returns the input unchanged when there is no overlay; else applies the
   * cached overlay patch to a clone. audit 2026-06.
   */
  private applyOverlayForDispatch(pureState: any): any {
    if (!this.lastPrivateOverlayPatch || this.lastPrivateOverlayPatch.length === 0) {
      return pureState;
    }
    try {
      return applyPatch(pureState, this.lastPrivateOverlayPatch, false, false).newDocument;
    } catch (err) {
      console.error('[Socket] private overlay apply (dispatch) failed:', err);
      this.lastPrivateOverlayPatch = null;
      this.socket?.emit('client:request-resync', { reason: 'overlay-apply-failed' });
      return pureState;
    }
  }

  /**
   * Re-dispatch a merged state to all `roomStateUpdated` listeners EXCEPT our
   * own internal handler (feeding the merged view back would re-pollute the
   * pure-public baseline). audit 2026-06.
   */
  private dispatchMergedState(state: any): void {
    const listeners = this.socket?.listeners('roomStateUpdated') || [];
    for (const cb of listeners) {
      if (cb === this.internalRoomStateHandler) continue;
      try { (cb as any)(state); } catch (err) {
        console.error('[Socket] roomStateUpdated listener error (re-dispatch):', err);
      }
    }
  }

  getCurrentRegion(): Region {
    return this.currentRegion;
  }

  reportError(message: string, context?: Record<string, unknown>): void {
    if (!this.socket?.connected) return;
    this.socket.emit('game:report-error', {
      gameName: GAME_NAMESPACE.replace('/', ''),
      errorMessage: message,
      errorContext: context ? JSON.stringify(context) : undefined,
    });
  }

  /**
   * Submit an in-game player feedback / bug report. The server enriches it with
   * the room code + a full room/game/player state snapshot and stores it in the
   * shared feedback table (visible in the /admin/feedback dashboard).
   */
  submitFeedback(
    payload: { reportType: 'bug' | 'idea' | 'other'; message: string; clientContext?: Record<string, unknown> },
    callback?: (res: { success: boolean; error?: string }) => void,
  ): void {
    if (!this.socket?.connected) {
      callback?.({ success: false, error: 'not-connected' });
      return;
    }
    this.socket.emit('feedback:submit', payload, (res: { success: boolean; error?: string }) => {
      callback?.(res || { success: false, error: 'no-response' });
    });
  }
}

export default new SocketService();
