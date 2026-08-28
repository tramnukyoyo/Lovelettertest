/**
 * Platform Return
 *
 * Single clean exit path back to GameBuddies.io — used by the return button
 * AND the header logo, so every deliberate way out of the game goes through
 * gamebuddies:return (the game server then reconciles the platform's room /
 * player status) instead of tearing the socket down with a bare navigation.
 *
 * Fallbacks so the player is never stranded on the game screen:
 * - dead socket → navigate straight to the platform lobby URL
 * - no gamebuddies:return-redirect within 5s → same direct navigation
 *   (the redirect handler in App.tsx does location.replace first and wins)
 */

import socketService from './socketService';
import { trackGameLeft } from './analyticsService';

const RETURN_REDIRECT_TIMEOUT_MS = 5000;

let fallbackTimer: number | null = null;

export interface PlatformReturnOptions {
  roomCode: string;
  playerId?: string;
  isHost: boolean;
  /** Standalone (not platform-launched): create a fresh GB lobby instead */
  isStandalone?: boolean;
  /** Pass through streamer mode so a new GB lobby preserves it */
  streamerMode?: boolean;
  /** Analytics source of the exit */
  source?: 'return_button' | 'header_logo';
}

function fallbackReturnUrl(roomCode: string, isStandalone: boolean): string {
  // Standalone rooms have no platform lobby to return to — land on the home
  // page. Platform rooms go straight to their lobby; /lobby/:code degrades
  // gracefully to the join flow when no session token is present.
  const base = isStandalone
    ? 'https://gamebuddies.io/'
    : `https://gamebuddies.io/lobby/${encodeURIComponent(roomCode)}`;
  try {
    const url = new URL(base);
    // Cross-domain returning detection (sessionStorage doesn't cross domains)
    url.searchParams.set('returning', 'true');
    const playerName = sessionStorage.getItem('gamebuddies_playerName') || '';
    if (playerName) url.searchParams.set('returningPlayer', playerName);
    return url.toString();
  } catch {
    return base;
  }
}

/** Cancel the pending no-reply fallback (the real redirect is happening). */
export function clearPlatformReturnFallback(): void {
  if (fallbackTimer !== null) {
    window.clearTimeout(fallbackTimer);
    fallbackTimer = null;
  }
}

export function beginPlatformReturn(opts: PlatformReturnOptions): void {
  const {
    roomCode,
    playerId,
    isHost,
    isStandalone = false,
    streamerMode = false,
    source = 'return_button',
  } = opts;

  trackGameLeft(source, { room_code: roomCode, is_host: isHost });

  const socket = socketService.getSocket();
  const fallbackUrl = fallbackReturnUrl(roomCode, isStandalone);

  if (!socket || !socket.connected) {
    window.location.href = fallbackUrl;
    return;
  }

  // Seed the portal overlay immediately so the animation plays regardless of
  // server response; the gamebuddies:return-redirect / gamebuddies:lobby-redirect
  // listeners overwrite the URL with the real tokenised one.
  window.dispatchEvent(new CustomEvent('gb:portal-begin', {
    detail: {
      mode: isStandalone ? 'standalone' : (isHost ? 'group' : 'individual'),
      roomCode,
      playerName: sessionStorage.getItem('gamebuddies_playerName') || '',
    }
  }));

  if (isStandalone) {
    socket.emit('gamebuddies:create-lobby', { roomCode, streamerMode });
  } else {
    socket.emit('gamebuddies:return', {
      roomCode,
      playerId,
      mode: isHost ? 'group' : 'individual'
    });
  }

  // No-reply fallback: if the redirect event never lands, navigate anyway —
  // tagging the leave first so the server files it as an intentional return.
  clearPlatformReturnFallback();
  fallbackTimer = window.setTimeout(() => {
    fallbackTimer = null;
    try {
      socket.emit('gb:client:leaving', { reason: 'return_to_platform' });
    } catch { /* best effort */ }
    window.location.href = fallbackUrl;
  }, RETURN_REDIRECT_TIMEOUT_MS);
  // The real redirect fires pagehide — don't re-navigate after it.
  window.addEventListener('pagehide', clearPlatformReturnFallback, { once: true });
}
