import { io, Socket } from 'socket.io-client';
import { SERVERS, GAME_NAMESPACE } from '../config/servers';
import type { Region } from '../config/servers';
import { detectFastestRegion } from './regionService';

class SocketService {
  private socket: Socket | null = null;
  private currentRegion: Region = 'eu';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 15; // Increased from 5 for better mobile support
  private listenersSetup = false;

  // Store listener references for cleanup (prevents memory leaks)
  private visibilityListener: (() => void) | null = null;
  private onlineListener: (() => void) | null = null;
  private offlineListener: (() => void) | null = null;

  // Background idle disconnect — 30 minutes hidden = disconnect
  private backgroundIdleTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly BACKGROUND_IDLE_MS = 30 * 60 * 1000;

  // Storage keys for reconnection data
  private static readonly STORAGE_KEYS = {
    sessionToken: 'primesuspect_session_token',
    roomCode: 'primesuspect_room_code',
    playerName: 'primesuspect_player_name',
  };

  async connect(): Promise<Socket> {
    console.log('[Socket] connect() called');
    if (this.socket?.connected) {
      console.log('[Socket] Already connected, reusing socket');
      return this.socket;
    }

    // Detect fastest region for connection
    console.log('[Socket] Starting region detection...');
    const region = await detectFastestRegion();
    this.currentRegion = region;
    const serverUrl = SERVERS[region];

    console.log(`[Socket] Connecting to ${region.toUpperCase()} server:`, serverUrl + GAME_NAMESPACE);

    this.socket = io(`${serverUrl}${GAME_NAMESPACE}`, {
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: false,
      multiplex: true,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
      this.reconnectAttempts = 0;

      // Check for automatic state recovery (Socket.IO v4.5+)
      if ((this.socket as any).recovered) {
        console.log('[Socket] Connection state recovered automatically (missed events replayed)');
        console.log('[Socket] Socket ID preserved, all missed events replayed');
        return; // No need to rejoin - server already restored our state
      }

      // Check if we are initializing a new session from URL params
      const params = new URLSearchParams(window.location.search);
      if (params.has('session')) {
        const urlToken = params.get('session') || '';
        if (urlToken) {
          console.log('[Socket] Session token detected in URL, storing for reconnect:', urlToken.substring(0, 12) + '...');
          sessionStorage.setItem('gameSessionToken', urlToken);
        }
      }

      // Manual reconnection with stored data
      const stored = this.getStoredReconnectionData();
      const userId = sessionStorage.getItem('gamebuddies_playerId');
      if (stored.sessionToken && stored.roomCode && stored.playerName) {
        console.log(`[Socket] Attempting auto-reconnection to room ${stored.roomCode}`);
        this.socket?.emit('room:join', {
          roomCode: stored.roomCode,
          playerName: stored.playerName,
          sessionToken: stored.sessionToken,
          avatarUrl: stored.avatarUrl || undefined,
          userId: userId || undefined,
          playerId: userId || undefined,
        });
        console.log('🔑 [USER DEBUG] userId being sent:', userId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected us, attempt reconnection
        console.log('[Socket] Server disconnected - will attempt reconnection');
      }
    });

    this.socket.on('reconnect_attempt', () => {
      this.reconnectAttempts++;
      console.log(`[Socket] Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    });

    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log(`[Socket] Reconnected after ${attemptNumber} attempts`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed after all attempts');
    });

    this.socket.on('error', (error) => {
      console.error('[Socket] Error:', error);
    });

    this.socket.on('heartbeat-ack', () => {
      console.log('[Socket] Heartbeat acknowledged by server');
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

  /**
   * Persist reconnection data to sessionStorage
   * Call this when joining or creating a room
   */
  persistReconnectionData(roomCode: string, playerName: string, sessionToken: string): void {
    console.log(`[Socket] Persisting reconnection data for room ${roomCode}`);
    sessionStorage.setItem(SocketService.STORAGE_KEYS.roomCode, roomCode);
    sessionStorage.setItem(SocketService.STORAGE_KEYS.playerName, playerName);
    sessionStorage.setItem(SocketService.STORAGE_KEYS.sessionToken, sessionToken);
  }

  /**
   * Get stored reconnection data from sessionStorage
   */
  getStoredReconnectionData(): {
    roomCode: string | null;
    playerName: string | null;
    sessionToken: string | null;
    avatarUrl: string | null;
  } {
    return {
      roomCode: sessionStorage.getItem(SocketService.STORAGE_KEYS.roomCode),
      playerName: sessionStorage.getItem(SocketService.STORAGE_KEYS.playerName),
      sessionToken: sessionStorage.getItem(SocketService.STORAGE_KEYS.sessionToken),
      avatarUrl: sessionStorage.getItem('avatarUrl'),
    };
  }

  /**
   * Clear reconnection data from sessionStorage
   * Call this when intentionally leaving a room
   */
  clearReconnectionData(): void {
    console.log('[Socket] Clearing reconnection data');
    Object.values(SocketService.STORAGE_KEYS).forEach(key =>
      sessionStorage.removeItem(key)
    );
  }

  // ===== Browser Event Listeners =====

  /**
   * Setup page visibility listener to send heartbeat when tab becomes visible
   */
  private setupPageVisibilityListener(): void {
    // Store reference for cleanup
    this.visibilityListener = () => {
      const stored = this.getStoredReconnectionData();

      if (document.visibilityState === 'visible') {
        console.log('[Socket] Page became visible');

        // Cancel any pending background idle disconnect
        if (this.backgroundIdleTimeout) {
          clearTimeout(this.backgroundIdleTimeout);
          this.backgroundIdleTimeout = null;
          console.log('[Socket] Background idle timer cancelled (tab foregrounded)');
        }

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
        console.log('[Socket] Page backgrounded — starting 30m idle timer');
        if (this.socket?.connected && stored.roomCode) {
          this.socket.emit('client:page-backgrounded', {
            roomCode: stored.roomCode,
            timestamp: Date.now(),
          });
        }

        // Start 30-minute idle timer — disconnect if still in background
        if (this.backgroundIdleTimeout) clearTimeout(this.backgroundIdleTimeout);
        this.backgroundIdleTimeout = setTimeout(() => {
          this.backgroundIdleTimeout = null;
          if (document.visibilityState !== 'visible' && this.socket?.connected) {
            console.log('[Socket] Background idle timeout (30m) — disconnecting');
            this.clearReconnectionData();
            this.socket.disconnect();
            this.socket = null;
          }
        }, this.BACKGROUND_IDLE_MS);
      }
    };
    document.addEventListener('visibilitychange', this.visibilityListener);
  }

  /**
   * Setup network change listeners to detect online/offline status
   */
  private setupNetworkListeners(): void {
    // Store references for cleanup
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

  /**
   * Clean up browser event listeners (prevents memory leaks)
   */
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
    if (this.backgroundIdleTimeout) {
      clearTimeout(this.backgroundIdleTimeout);
      this.backgroundIdleTimeout = null;
    }
    this.listenersSetup = false;
  }

  // ===== Core Socket Methods =====

  getSocket(): Socket | null {
    return this.socket;
  }

  disconnect(): void {
    // Clean up browser event listeners to prevent memory leaks
    this.cleanupBrowserListeners();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('[Socket] Disconnected');
    }
  }

  // Emit events
  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.error('[Socket] Cannot emit - not connected');
    }
  }

  // Listen to events
  on(event: string, callback: (...args: any[]) => void): void {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    this.socket?.off(event, callback);
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Get current region
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
}

export default new SocketService();
