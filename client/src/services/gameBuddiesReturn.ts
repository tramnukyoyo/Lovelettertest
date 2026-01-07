/**
 * GameBuddies Return Manager
 * Handles returning players to the GameBuddies lobby
 *
 * SECURITY: This service uses socket events to request returns.
 * The server handles API calls with server-side API keys.
 * DO NOT add API keys to this client-side code.
 */

import { getCurrentSession } from './gameBuddiesSession';
import socketService from './socketService';

export type ReturnMode = 'individual' | 'group';

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
    this.apiBase = import.meta.env.VITE_GAMEBUDDIES_API_BASE || 'https://gamebuddies.io';
  }

  /**
   * Return to GameBuddies lobby via socket event
   * SECURITY: Uses socket to server which has the API key server-side
   */
  async returnToLobby(
    mode: ReturnMode = 'group',
    roomCode: string,
    currentPlayer?: { id?: string; name?: string },
    _allPlayers?: Array<{ id?: string; name?: string }>
  ): Promise<GameBuddiesReturnResponse> {
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

    try {
      console.log(`[GameBuddiesReturn] Requesting ${mode} return for room ${roomCode} via socket`);

      const socket = socketService.getSocket();
      if (!socket?.connected) {
        console.warn('[GameBuddiesReturn] Socket not connected, using fallback URL');
        this.isReturning = false;
        return {
          success: false,
          returnUrl: session?.returnUrl || `${this.apiBase}/lobby/${roomCode}`,
          message: 'Socket not connected'
        };
      }

      // Emit socket event - server handles API call with server-side key
      socket.emit('gamebuddies:return', {
        roomCode,
        mode,
        reason: 'user_initiated'
      });

      // The server will emit 'gamebuddies:return-redirect' with the URL
      // This method returns immediately; the redirect is handled by the event listener
      this.isReturning = false;
      return {
        success: true,
        returnUrl: session?.returnUrl || `${this.apiBase}/lobby/${roomCode}`,
        message: 'Return request sent via socket'
      };

    } catch (error) {
      console.error('[GameBuddiesReturn] Error during return:', error);
      this.isReturning = false;

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

export const gameBuddiesReturn = new GameBuddiesReturnManager();
export default gameBuddiesReturn;
