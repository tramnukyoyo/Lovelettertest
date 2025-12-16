import { getCurrentSession } from './gameBuddiesSession';

export type ReturnMode = 'individual' | 'group';

export interface GameBuddiesReturnOptions {
  roomCode: string;
  currentPlayer?: {
    id?: string;
    name?: string;
  };
  allPlayers?: Array<{
    id?: string;
    name?: string;
  }>;
  mode?: ReturnMode;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface GameBuddiesReturnResponse {
  success: boolean;
  returnUrl: string;
  sessionToken?: string;
  playersReturned?: number;
  message?: string;
}

class GameBuddiesReturnManager {
  private apiBase: string;
  private isReturning: boolean = false;

  constructor() {
    // Use GameBuddies production URL by default
    this.apiBase = import.meta.env.VITE_GAMEBUDDIES_API_BASE || 'https://gamebuddies.io';
  }

  /**
   * Return to GameBuddies lobby
   */
  async returnToLobby(
    mode: ReturnMode = 'group',
    roomCode: string,
    currentPlayer?: { id?: string; name?: string },
    allPlayers?: Array<{ id?: string; name?: string }>
  ): Promise<GameBuddiesReturnResponse> {
    // Get current session
    const session = getCurrentSession();

    if (!roomCode) {
      console.error('[GameBuddiesReturn] No room code provided');
      return {
        success: false,
        returnUrl: `${this.apiBase}/lobby`,
        message: 'No room code provided'
      };
    }

    if (this.isReturning) {
      console.warn('[GameBuddiesReturn] Already processing return request');
      return {
        success: false,
        returnUrl: `${this.apiBase}/lobby/${roomCode}`,
        message: 'Return already in progress'
      };
    }

    this.isReturning = true;

    const payload = {
      roomCode,
      returnAll: mode === 'group',
      playerId: mode === 'individual' ? currentPlayer?.id : undefined,
      playerName: currentPlayer?.name,
      initiatedBy: session?.isHost ? 'host' : 'player',
      reason: 'user_initiated',
      metadata: {
        game: 'template-game',
        timestamp: new Date().toISOString(),
        playersInRoom: allPlayers?.length || 1
      }
    };

    try {
      console.log(`[GameBuddiesReturn] Requesting ${mode} return for room ${roomCode}`);

      // Get API key from environment
      const apiKey = import.meta.env.VITE_GAMEBUDDIES_API_KEY;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }

      const response = await fetch(`${this.apiBase}/api/v2/external/return`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[GameBuddiesReturn] Return request failed (${response.status}):`, errorText);

        this.isReturning = false;
        return {
          success: false,
          returnUrl: session?.returnUrl || `${this.apiBase}/lobby/${roomCode}`,
          message: `Return request failed: ${response.status}`
        };
      }

      const data = await response.json();
      console.log('[GameBuddiesReturn] Return successful:', data);

      // Update session with new return URL if provided
      if (data.returnUrl && session) {
        session.returnUrl = data.returnUrl;
      }

      this.isReturning = false;
      return {
        success: true,
        returnUrl: data.returnUrl || session?.returnUrl || `${this.apiBase}/lobby/${roomCode}`,
        sessionToken: data.sessionToken,
        playersReturned: data.playersReturned,
        message: data.message
      };

    } catch (error) {
      console.error('[GameBuddiesReturn] Error during return:', error);
      this.isReturning = false;

      // Fallback return URL
      const fallbackUrl = session?.returnUrl || `${this.apiBase}/lobby/${roomCode}`;

      return {
        success: false,
        returnUrl: fallbackUrl,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Redirect to GameBuddies lobby
   */
  redirectToLobby(url?: string): void {
    const session = getCurrentSession();
    const targetUrl = url || session?.returnUrl || `${this.apiBase}/lobby`;

    console.log(`[GameBuddiesReturn] Redirecting to: ${targetUrl}`);

    // Add a small delay for UX
    setTimeout(() => {
      window.location.href = targetUrl;
    }, 500);
  }

  /**
   * Check if launched from GameBuddies
   */
  isGameBuddiesLaunched(): boolean {
    const session = getCurrentSession();
    return session?.source === 'gamebuddies';
  }

  /**
   * Get return URL
   */
  getReturnUrl(roomCode?: string): string {
    const session = getCurrentSession();

    if (session?.returnUrl) {
      return session.returnUrl;
    }

    if (roomCode) {
      return `${this.apiBase}/lobby/${roomCode}`;
    }

    return `${this.apiBase}/lobby`;
  }
}

// Export singleton instance
export const gameBuddiesReturn = new GameBuddiesReturnManager();

// Export default
export default gameBuddiesReturn;