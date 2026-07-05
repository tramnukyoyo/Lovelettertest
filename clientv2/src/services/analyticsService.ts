/**
 * Analytics Service — Lightweight PostHog wrapper for game clients.
 *
 * Reuses the same PostHog project as Gamebuddies.Io (same domain, same cookies).
 * Respects GDPR consent stored in localStorage['gb-cookie-consent'] by the main site.
 *
 * Usage:
 *   import { initAnalytics, trackEvent, trackShare } from '../services/analyticsService';
 *   // Call initAnalytics() once in App.tsx useEffect
 *   // Call trackShare('whatsapp') in share handlers
 */

import type { PostHog } from 'posthog-js';
import { GAME_META } from '../config/gameMeta';

const POSTHOG_KEY = 'phc_lXhLxEeir5ZB9MjrDuvKiZsj6A0VGvZIIgduZsL20ji';
const POSTHOG_HOST = 'https://eu.i.posthog.com';
const CONSENT_KEY = 'gb-cookie-consent';

// posthog-js is dynamic-imported so its ~50KB gz stays out of the eager
// bundle (it is only needed post-consent). Events fired before the module
// loads are dropped — same tradeoff the platform client ships. Type-only
// import above is erased at build time.
let posthogRef: PostHog | null = null;
let initialized = false;
let loading = false;

function hasConsent(): boolean {
  return localStorage.getItem(CONSENT_KEY) === 'all';
}

function doInit(): void {
  if (initialized || loading) return;
  if (!hasConsent()) return;

  loading = true;
  import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        persistence: 'localStorage+cookie',
        capture_pageview: false,
        capture_pageleave: false,
        person_profiles: 'identified_only',
        property_denylist: ['sessionToken', 'inviteToken', 'password', 'email', 'access_token', 'refresh_token'],
      });
      posthogRef = posthog;
      initialized = true;
      loading = false;
    })
    .catch(() => {
      loading = false; // load failed (offline/adblock) — retry on next consent event
    });
}

/** Call once from App.tsx. Inits PostHog if consent exists, listens for future consent changes. */
export function initAnalytics(): void {
  doInit();

  window.addEventListener('gb-consent-changed', ((e: CustomEvent<string>) => {
    if (e.detail === 'all') {
      doInit();
    } else if (initialized && posthogRef) {
      posthogRef.opt_out_capturing();
    }
  }) as EventListener);
}

/** Fire a custom event to PostHog. No-op if not initialized or no consent. */
export function trackEvent(name: string, properties?: Record<string, unknown>): void {
  if (!initialized || !posthogRef || !hasConsent()) return;
  // Emit `game` as the slug (id) so dashboards can group cleanly. Fall back to
  // display name only if id was never declared on this game's GAME_META.
  posthogRef.capture(name, { game: (GAME_META as any).id || GAME_META.name, ...properties });
}

/** Convenience: track a share action. */
export function trackShare(method: string, extra?: Record<string, unknown>): void {
  trackEvent('share_clicked', { method, ...extra });
}

/** Track a game round completing. */
export function trackGameRound(roundNumber: number, durationSeconds: number, extra?: Record<string, unknown>): void {
  trackEvent('game_round_completed', { round_number: roundNumber, duration_seconds: durationSeconds, ...extra });
}

/** Track a game finishing (all rounds done). */
export function trackGameFinished(totalRounds: number, gameDurationSeconds: number, extra?: Record<string, unknown>): void {
  trackEvent('game_finished', { total_rounds: totalRounds, game_duration_seconds: gameDurationSeconds, ...extra });
}

/** Track a reconnection attempt. */
export function trackReconnect(success: boolean, method: string): void {
  trackEvent('reconnection_attempted', { success, method });
}

/** Track when the server sends an error to the client. */
export function trackGameError(errorMessage: string): void {
  trackEvent('game_error_shown', { error_message: errorMessage });
}

/** Track every phase transition. Call from a useEffect that watches phase. */
export function trackPhaseEntered(phase: string, extra?: Record<string, unknown>): void {
  trackEvent("game_phase_entered", { phase, ...extra });
}

/** Track game start signal (host pressed start, game began). */
export function trackGameStarted(extra?: Record<string, unknown>): void {
  trackEvent("game_started", { ...extra });
}

/** Track a generic in-game action (vote, draw, submit, etc.). */
export function trackGameAction(action: string, extra?: Record<string, unknown>): void {
  trackEvent("game_action", { action, ...extra });
}

// ── Universal phase tracker ────────────────────────────────────────
// Maintains a private singleton state. Call from your roomStateUpdated
// handler with the full state payload — it auto-detects the phase across
// the various shapes used by different games (data.gameData.phase,
// data.gameState.phase, data.state, data.phase) and emits PostHog events:
//   game_phase_entered  (every transition, with from/to)
//   game_started        (lobby → non-lobby)
//   game_finished       (entering finished/ended/game_over)
const _phaseTracker: { current: string | undefined; startTime: number | null } = {
  current: undefined,
  startTime: null,
};

export function trackPhaseFromRoomState(data: unknown): void {
  if (!data || typeof data !== "object") return;
  const d = data as Record<string, any>;
  const newPhase: string | undefined =
    d?.gameData?.phase ?? d?.gameState?.phase ?? d?.state ?? d?.phase;
  if (!newPhase) return;
  if (newPhase === _phaseTracker.current) return;
  const prev = _phaseTracker.current;
  trackEvent("game_phase_entered", { phase: newPhase, from: prev ?? null, room_code: d?.code });
  if (prev === "lobby" && newPhase !== "lobby") {
    _phaseTracker.startTime = Date.now();
    trackEvent("game_started", { room_code: d?.code });
  }
  if ((newPhase === "finished" || newPhase === "ended" || newPhase === "game_over") && _phaseTracker.startTime) {
    const dur = Math.round((Date.now() - _phaseTracker.startTime) / 1000);
    trackGameFinished(1, dur, { room_code: d?.code });
    _phaseTracker.startTime = null;
  }
  _phaseTracker.current = newPhase;
}
