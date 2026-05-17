import { io, Socket } from 'socket.io-client';
import msgpackParser from 'socket.io-msgpack-parser';
import { applyPatch } from 'fast-json-patch';
import { STORAGE_KEYS } from '../config/storageKeys';
import { SERVERS, GAME_NAMESPACE, isCapacitor } from '../config/servers';
import type { Region } from '../config/servers';
import { detectFastestRegion } from './regionService';
import { trackGameError, trackReconnect } from './analyticsService';


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
  private maxReconnectAttempts = 15;
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
  // Store listener references for cleanup
  private visibilityListener: (() => void) | null = null;
  private onlineListener: (() => void) | null = null;
  private offlineListener: (() => void) | null = null;

  async connect(): Promise<Socket> {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Determine server URL based on environment
    let serverUrl: string;
    let region: Region = 'eu';

    if (isCapacitor()) {
      // Capacitor - use hardcoded DDF server
      console.log('[Socket] Capacitor detected, using DDF server');
      serverUrl = 'https://ddf-server.onrender.com';
    } else {
      // Web - detect fastest region
      region = await detectFastestRegion();
      this.currentRegion = region;
      serverUrl = SERVERS[region];
    }

    console.log(`[Socket] Connecting to ${region.toUpperCase()} server:`, serverUrl + GAME_NAMESPACE);

    // Cluster-routing hint (2026-05-15): include roomCode in connection
    // URL so the gameserver cluster master can route us to the worker that
    // owns the room. Without this, joiners from a different IP than the
    // host land on a different worker (rooms live in per-worker memory)
    // and see "room not found" (BC4HB3 incident).
    const _routingRoomCode =

      _initialRoutingRoomCode ||

      sessionStorage.getItem('lastRoomCode') ||

      undefined;
    this.socket = io(`${serverUrl}${GAME_NAMESPACE}`, {
      ...(_routingRoomCode ? { query: { roomCode: _routingRoomCode.toUpperCase() } } : {}),
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
      console.log('[Socket] Connected:', this.socket?.id);
      this.reconnectAttempts = 0;

      // Check for automatic state recovery (Socket.IO v4.5+)
      if ((this.socket as any).recovered) {
        console.log('[Socket] Connection state recovered automatically');
        return;
      }

      // Check for session token in URL params
      const params = new URLSearchParams(window.location.search);
      if (params.has('session')) {
        const urlToken = params.get('session') || '';
        if (urlToken) {
          console.log('[Socket] Session token detected in URL');
          sessionStorage.setItem('gameSessionToken', urlToken);
        }
      }

      // Manual reconnection with stored data — only if we actually disconnected
      // (prevents phantom reconnect events from transport upgrades or initial connect)
      const stored = this.getStoredReconnectionData();
      if (stored.sessionToken && stored.roomCode && stored.playerName && this.wasDisconnected) {
        console.log(`[Socket] Attempting auto-reconnection to room ${stored.roomCode}`);
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
      console.log('[Socket] Disconnected:', reason);
      this.wasDisconnected = true;
    });

    this.socket.on('reconnect_attempt', () => {
      this.reconnectAttempts++;
      console.log(`[Socket] Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    });

    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log(`[Socket] Reconnected after ${attemptNumber} attempts`);
      trackReconnect(true, 'socket.io');
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed after all attempts');
      trackReconnect(false, 'socket.io');
    });

    this.socket.on('error', (error: any) => {
      console.error('[Socket] Error:', error);
      trackGameError(error?.message || String(error));
    });

    // Server-side precondition rejections (see GameBuddieGamesServer rejectAction helper).
    // Previously these were silent `return;` calls that left clients hanging. Now they
    // arrive explicitly AND are written to game_client_errors on the server.
    this.socket.on('action:rejected', (payload: { event: string; reason: string; roomCode?: string; context?: unknown; ts?: number }) => {
      console.warn('[Socket] action:rejected', payload);
      trackGameError(`[action:rejected] ${payload?.event}: ${payload?.reason}`);
    });

    // Desync detection — request resync if state versions jump
    this.socket.on('roomStateUpdated', (data: any) => {
      if (data?._stateVersion) {
        const expected = this.lastStateVersion + 1;
        if (this.lastStateVersion > 0 && data._stateVersion > expected) {
          console.warn(`[Socket] State desync detected: expected v${expected}, got v${data._stateVersion} (${data._stateVersion - expected} missed)`);
          // Don't request resync — this IS the resync (latest state). Just log it.
        }
        this.lastStateVersion = data._stateVersion;
      }
      // v22 — cache full state for roomStateDelta patches
      this.lastFullState = data;
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
    });
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
        // v23 Phase B — re-apply cached private overlay on the new public state
        if (this.lastPrivateOverlayPatch && this.lastPrivateOverlayPatch.length > 0) {
          try {
            applyPatch(newState, this.lastPrivateOverlayPatch, false, true);
          } catch (err) {
            console.error('[Socket] private overlay re-apply failed on roomStateDelta:', err);
            this.lastPrivateOverlayPatch = null;
          }
        }
        this.lastFullState = newState;
        this.lastStateVersion = delta._stateVersion;
        // Re-dispatch as roomStateUpdated so app code sees a normal full state
        const listeners = this.socket?.listeners('roomStateUpdated') || [];
        for (const cb of listeners) {
          try { (cb as any)(newState); } catch (err) {
            console.error('[Socket] roomStateUpdated listener error after delta:', err);
          }
        }
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
      if (!this.lastFullState) {
        // No baseline yet — overlay applies on first public arrival.
        return;
      }
      try {
        let newState: any = this.lastFullState;
        if (this.lastPrivateOverlayPatch) {
          newState = applyPatch(this.lastFullState, this.lastPrivateOverlayPatch, false, false).newDocument;
        }
        if (msg._stateVersion) newState._stateVersion = msg._stateVersion;
        this.lastFullState = newState;
        const listeners = this.socket?.listeners('roomStateUpdated') || [];
        for (const cb of listeners) {
          try { (cb as any)(newState); } catch (err) {
            console.error('[Socket] roomStateUpdated listener error after private:', err);
          }
        }
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
    console.log(`[Socket] Persisting reconnection data for room ${roomCode}`);
    sessionStorage.setItem(STORAGE_KEYS.SESSION.ROOM_CODE, roomCode);
    sessionStorage.setItem(STORAGE_KEYS.SESSION.PLAYER_NAME, playerName);
    sessionStorage.setItem(STORAGE_KEYS.SESSION.SESSION_TOKEN, sessionToken);
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
    console.log('[Socket] Clearing reconnection data');
    sessionStorage.removeItem(STORAGE_KEYS.SESSION.ROOM_CODE);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION.PLAYER_NAME);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION.SESSION_TOKEN);
  }

  // ===== Browser Event Listeners =====

  private setupPageVisibilityListener(): void {
    this.visibilityListener = () => {
      const stored = this.getStoredReconnectionData();

      if (document.visibilityState === 'visible') {
        console.log('[Socket] Page became visible');

        if (!this.socket?.connected) {
          console.log('[Socket] Connection lost while backgrounded, reconnecting...');
          this.socket?.connect();
        } else if (stored.sessionToken && stored.roomCode) {
          // Server-side state may have been GC'd while backgrounded. Fire a full
          // session:reconnect to rebind the socket via sessionToken (hot-restores
          // the room from snapshot if it's no longer in memory).
          console.log('[Socket] Page visible — firing session:reconnect to rebind state');
          this.socket.emit('session:reconnect', { sessionToken: stored.sessionToken });
        } else if (stored.roomCode) {
          console.log('[Socket] Sending heartbeat to server');
          this.socket.emit('client:heartbeat', {
            roomCode: stored.roomCode,
            timestamp: Date.now(),
          });
        }
      } else {
        console.log('[Socket] Page backgrounded');
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
      console.log('[Socket] Network online - checking connection');
      if (!this.socket?.connected) {
        console.log('[Socket] Reconnecting after network restored...');
        this.socket?.connect();
      }
    };

    this.offlineListener = () => {
      console.log('[Socket] Network offline');
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
      console.log('[Socket] Disconnected');
    }
  }

  emit(event: string, data?: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.error('[Socket] Cannot emit - not connected');
    }
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
      console.log('[Socket] Requesting state resync from server');
      this.socket.emit('client:request-resync');
    }
  }

  /** Get the last received state version (for desync detection). */
  getLastStateVersion(): number {
    return this.lastStateVersion;
  }

  getCurrentRegion(): Region {
    return this.currentRegion;
  }
}

export default new SocketService();
