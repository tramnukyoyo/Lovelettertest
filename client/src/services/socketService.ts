import { io, Socket } from 'socket.io-client';
import msgpackParser from 'socket.io-msgpack-parser';
import { STORAGE_KEYS } from '../config/storageKeys';
import { SERVERS, GAME_NAMESPACE, isCapacitor } from '../config/servers';
import type { Region } from '../config/servers';
import { detectFastestRegion } from './regionService';
import { trackGameError, trackReconnect } from './analyticsService';

class SocketService {
  private socket: Socket | null = null;
  private currentRegion: Region = 'eu';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 15;
  private listenersSetup = false;
  private wasDisconnected = false;
  private lastStateVersion = 0; // Desync detection

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

    this.socket = io(`${serverUrl}${GAME_NAMESPACE}`, {
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
    });

    // Reset version tracking on disconnect
    this.socket.on('disconnect', () => {
      this.lastStateVersion = 0;
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
