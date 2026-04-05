/**
 * Error Reporter — Reports client-side errors to the game server via socket.
 *
 * Captures: uncaught errors, unhandled promise rejections, React boundary crashes.
 * Rate-limited to 5 errors per minute per client to avoid flooding.
 */

import socketService from './socketService';
import { GAME_META } from '../config/gameMeta';

const MAX_ERRORS_PER_MINUTE = 5;
let errorCount = 0;
let errorWindowStart = Date.now();

function canReport(): boolean {
  const now = Date.now();
  if (now - errorWindowStart > 60_000) {
    errorCount = 0;
    errorWindowStart = now;
  }
  if (errorCount >= MAX_ERRORS_PER_MINUTE) return false;
  errorCount++;
  return true;
}

function getContext(): Record<string, unknown> {
  const stored = socketService.getStoredReconnectionData?.() || {};
  return {
    game: GAME_META.name,
    namespace: GAME_META.namespace,
    roomCode: stored.roomCode || null,
    playerName: stored.playerName || null,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  };
}

export function reportError(
  message: string,
  stack?: string,
  severity: 'error' | 'warning' | 'critical' = 'error',
  extra?: Record<string, unknown>
): void {
  if (!canReport()) return;

  const payload = {
    message: message.slice(0, 2000),
    stack: stack?.slice(0, 3000),
    severity,
    context: { ...getContext(), ...extra },
  };

  // Send via socket if connected
  const socket = socketService.getSocket();
  if (socket?.connected) {
    socket.emit('client:error-report', payload);
  }
}

/** Initialize global error handlers. Call once from App.tsx. */
export function initErrorReporter(): void {
  window.addEventListener('error', (event) => {
    reportError(
      event.error?.message || event.message || 'Unknown error',
      event.error?.stack,
      'error',
      { filename: event.filename, lineno: event.lineno, colno: event.colno }
    );
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    reportError(
      `Unhandled rejection: ${reason?.message || String(reason)}`,
      reason?.stack,
      'error'
    );
  });
}
