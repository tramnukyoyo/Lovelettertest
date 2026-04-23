/**
 * usePhaseWatchdog — detects "stuck state" where an awaited server transition never arrives.
 *
 * Reacts to two booleans:
 *   - `armWhen`   — flips `true` the moment we *start* waiting for a state change.
 *   - `resolvedWhen` — flips `true` the moment the awaited state has landed.
 *
 * Arms a timer on `armWhen: false → true`. Clears it on `resolvedWhen: true` OR
 * when `armWhen` goes back to `false`. If the timer fires first, emits
 * `game:report-error` to the server (which writes to `public.game_client_errors`)
 * and optionally calls `onTimeout` so the UI can surface a recovery affordance.
 *
 * This exists because the Hot Potato `start:game` race on 2026-04-18 was invisible
 * to our error pipeline — the client just hung on a blank arena with no thrown
 * exception. With this hook armed on every handoff, that class of silent bug
 * shows up in Supabase within `timeoutMs` of the first affected player.
 *
 * Usage:
 *   usePhaseWatchdog({
 *     game: 'hotpotato',
 *     roomCode: lobby.code,
 *     event: 'lobby-to-playing',
 *     armWhen: lobby.state === 'playing',
 *     resolvedWhen: colyseusPhase === 'countdown' || colyseusPhase === 'playing',
 *     timeoutMs: 10_000,
 *     context: () => ({ socketIsHost, colyseusIsHost, colyseusPhase }),
 *     onTimeout: () => setShowReconnect(true),
 *   });
 */

import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';

export interface PhaseWatchdogParams {
  /** Game id (matches the server plugin's `id`, e.g. 'hotpotato'). */
  game: string;
  /** Room code for correlating the report with `room_events`. */
  roomCode?: string;
  /** A short machine-readable name for the transition being watched. */
  event: string;
  /** Watchdog arms when this becomes true. */
  armWhen: boolean;
  /** Watchdog disarms (success) when this becomes true. */
  resolvedWhen: boolean;
  /** Milliseconds allowed between arm and resolve. Default 10_000. */
  timeoutMs?: number;
  /** Extra diagnostic context gathered at timeout time. */
  context?: () => Record<string, unknown>;
  /** Optional callback so the game can surface a "reconnecting…" UI / retry button. */
  onTimeout?: () => void;
  /**
   * Socket to use for reporting. If omitted, tries `window.__socket` (set by socketService)
   * and falls back to console.warn only. Pass explicitly if your app exposes it differently.
   */
  socket?: Socket | null;
  /** Severity for the Supabase row. Default 'error' — stuck-state is a real failure. */
  severity?: 'warning' | 'error' | 'critical';
}

export function usePhaseWatchdog(params: PhaseWatchdogParams): void {
  const {
    game, roomCode, event, armWhen, resolvedWhen,
    timeoutMs = 10_000, context, onTimeout, socket, severity = 'error',
  } = params;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!armWhen) {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      firedRef.current = false;
      return;
    }

    if (resolvedWhen) {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      firedRef.current = false;
      return;
    }

    if (timerRef.current || firedRef.current) return;

    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      timerRef.current = null;

      const ctx = {
        ...(context ? context() : {}),
        timeoutMs,
        armedAt: Date.now() - timeoutMs,
        firedAt: Date.now(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : null,
        url: typeof window !== 'undefined' ? window.location.pathname : null,
      };

      const errorMessage = `[stuck-state] ${event}: awaited transition did not arrive within ${timeoutMs}ms`;

      console.warn(`[usePhaseWatchdog] ${errorMessage}`, ctx);

      const sock = socket ?? (typeof window !== 'undefined' ? (window as any).__socket as Socket | undefined : undefined) ?? null;
      if (sock?.connected) {
        sock.emit('game:report-error', {
          gameName: game,
          roomCode,
          errorMessage,
          errorContext: JSON.stringify(ctx),
          severity,
        });
      }

      try { onTimeout?.(); } catch (err) { console.error('[usePhaseWatchdog] onTimeout threw:', err); }
    }, timeoutMs);

    return () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };
  }, [armWhen, resolvedWhen, timeoutMs, event, game, roomCode, severity]);
}
