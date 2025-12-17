import { io, Socket } from 'socket.io-client';

// Use environment variable in development, same origin in production (for GameBuddies reverse proxy)
const getServerUrl = (): string => {
  // If VITE_BACKEND_URL is explicitly set, use it
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }

  // In production, use same origin (works with reverse proxy)
  if (import.meta.env.PROD) {
    return window.location.origin;
  }

  // Development fallback
  return 'http://localhost:3001';
};

const SERVER_URL = getServerUrl();

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 15; // Increased from 5 for better mobile support
  private listenersSetup = false;

  // Store listener references for cleanup (prevents memory leaks)
  private visibilityListener: (() => void) | null = null;
  private onlineListener: (() => void) | null = null;
  private offlineListener: (() => void) | null = null;

  // Storage keys for reconnection data
  private static readonly STORAGE_KEYS = {
    sessionToken: 'heartsgambit_session_token',
    roomCode: 'heartsgambit_room_code',
    playerName: 'heartsgambit_player_name',
  };

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    console.log('[Socket] Connecting to server:', SERVER_URL + '/heartsgambit');

    this.socket = io(`${SERVER_URL}/heartsgambit`, {
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
      if (stored.sessionToken && stored.roomCode && stored.playerName) {
        console.log(`[Socket] Attempting auto-reconnection to room ${stored.roomCode}`);
        this.socket?.emit('room:join', {
          roomCode: stored.roomCode,
          playerName: stored.playerName,
          sessionToken: stored.sessionToken,
          avatarUrl: stored.avatarUrl || undefined,
        });
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

        // If disconnected, try to reconnect
        if (!this.socket?.connected) {
          console.log('[Socket] Connection lost while backgrounded, reconnecting...');
          this.socket?.connect();
        } else if (stored.roomCode) {
          // Send heartbeat to let server know we're back
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
}

export default new SocketService();
