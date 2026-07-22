/**
 * Analytics Service — Lightweight PostHog wrapper for game clients.
 * Canonical version: 2026-07-22 (event audit bump).
 *
 * Reuses the same PostHog project as Gamebuddies.Io (same domain, same cookies).
 * Respects GDPR consent stored in localStorage['gb-cookie-consent'] by the main site.
 *
 * Usage:
 *   import { initAnalytics, trackEvent } from '../services/analyticsService';
 *   // Call initAnalytics() once in App.tsx useEffect
 */

import type { PostHog } from 'posthog-js';
import { GAME_META } from '../config/gameMeta';

const POSTHOG_KEY = 'phc_lXhLxEeir5ZB9MjrDuvKiZsj6A0VGvZIIgduZsL20ji';
const POSTHOG_HOST = 'https://eu.i.posthog.com';
const CONSENT_KEY = 'gb-cookie-consent';

// `game` property on every event. GAME_META.id is REQUIRED — display-name
// fallbacks split the same game across two breakdown values depending on
// which build is live ("thinkalike" vs "ThinkAlike", fleet audit 2026-07-22).
// Prod stays resilient (falls back) but dev fails loudly.
const GAME_SLUG: string = (() => {
  const meta = GAME_META as { id?: string; name: string };
  if (meta.id) return meta.id;
  if (import.meta.env.DEV) {
    throw new Error('[analytics] GAME_META.id is missing — set the canonical slug in config/gameMeta.ts');
  }
  return meta.name;
})();

// posthog-js is dynamic-imported so its ~50KB gz stays out of the eager
// bundle (it is only needed post-consent). Events fired before the module
// loads are dropped — same tradeoff the platform client ships. Type-only
// import above is erased at build time.
let posthogRef: PostHog | null = null;
let initialized = false;
let loading = false;

// Identify can be requested before PostHog is initialized (the session often
// resolves before consent/init). Stash the latest request and flush on init.
let pendingIdentify: { userId: string; props: Record<string, unknown> } | null = null;

function hasConsent(): boolean {
  return localStorage.getItem(CONSENT_KEY) === 'all';
}

function flushIdentify(): void {
  if (!initialized || !posthogRef || !pendingIdentify) return;
  const { userId, props } = pendingIdentify;
  pendingIdentify = null;
  posthogRef.identify(userId, props);
}

/**
 * The platform hands its PostHog distinct_id over in the game-launch URL
 * (`phid`, set by RoomLobby.withPlatformLang). Same-origin proxy serving
 * already shares the id via localStorage; this covers the cross-origin tail
 * (Discord Activity hosts, direct/QR entries, *.onrender.com) where posthog-js
 * would otherwise mint a fresh anonymous id and orphan the game session from
 * the platform person (identity audit 2026-07-22: ~29% of game persons were
 * unstitched). Persisted to sessionStorage so in-game reloads keep it.
 */
function platformDistinctId(): string | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('phid');
    if (fromUrl) {
      sessionStorage.setItem('gb_phid', fromUrl);
      return fromUrl;
    }
    return sessionStorage.getItem('gb_phid');
  } catch {
    return null;
  }
}

function doInit(): void {
  if (initialized || loading) return;
  if (!hasConsent()) return;

  loading = true;
  import('posthog-js')
    .then(({ default: posthog }) => {
      const phid = platformDistinctId();
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        persistence: 'localStorage+cookie',
        capture_pageview: false,
        capture_pageleave: false,
        // Dead clicks + heatmaps must be opted into explicitly here: the
        // project's remote config leaves dead clicks OFF, and only the platform
        // client enables them — in-game surfaces (e.g. the return button) need
        // the same interaction data (fleet rollout 2026-07-15).
        capture_dead_clicks: true,
        capture_heatmaps: true,
        person_profiles: 'identified_only',
        property_denylist: ['sessionToken', 'inviteToken', 'password', 'email', 'access_token', 'refresh_token'],
        // Only applies when no persisted id exists on this origin — a fresh
        // cross-origin visitor adopts the platform's chain instead of forking.
        ...(phid ? { bootstrap: { distinctID: phid } } : {}),
      });
      posthogRef = posthog;
      initialized = true;
      loading = false;
      flushIdentify();
    })
    .catch(() => {
      loading = false; // load failed (offline/adblock) — retry on next consent event
    });
}

/**
 * Stitch this game's PostHog events to the platform person. Games are frequently
 * served cross-origin (*.onrender.com, Discord *.discordsays.com) where the
 * shared .gamebuddies.io cookie doesn't reach, so posthog-js starts a fresh
 * anonymous distinct_id and game events are orphaned from the platform user.
 * Calling identify() with the platform userId (resolved from the session token)
 * reunites them. No-op for unresolved guests (no userId) — those are covered by
 * the `phid` bootstrap above. Safe to call before init — it's stashed and
 * flushed once consent/init completes.
 */
export function identifyGamePlayer(session: {
  userId?: string;
  playerId?: string;
  roomCode?: string;
  isHost?: boolean;
  premiumTier?: string;
}): void {
  if (!session?.userId) return;
  pendingIdentify = {
    userId: session.userId,
    props: {
      player_id: session.playerId,
      room_code: session.roomCode,
      is_host: session.isHost,
      premium_tier: session.premiumTier,
    },
  };
  if (initialized && hasConsent()) flushIdentify();
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
  posthogRef.capture(name, { game: GAME_SLUG, ...properties });
}

/** Track a game finishing (all rounds done). */
export function trackGameFinished(totalRounds: number, gameDurationSeconds: number, extra?: Record<string, unknown>): void {
  trackEvent('game_finished', { total_rounds: totalRounds, game_duration_seconds: gameDurationSeconds, ...extra });
}

/** Track a reconnection attempt. */
export function trackReconnect(success: boolean, method: string): void {
  trackEvent('reconnection_attempted', { success, method });
}

/** Track when the server sends an error to the client.
 *  Dedupes identical messages within 30s: retry/error loops otherwise flood
 *  PostHog with repeats that carry no new information — one TV left on a dead
 *  room emitted 6,152 "Room not found" events over 40h (fleet audit 2026-07-13).
 *  Carries the current phase so errors are locatable in the game flow. */
let _lastTrackedError = { msg: '', at: 0 };
const _errorCounts: Record<string, number> = {};
const ERROR_SESSION_CAP = 5;
export function trackGameError(errorMessage: string): void {
  const now = Date.now();
  if (errorMessage === _lastTrackedError.msg && now - _lastTrackedError.at < 30000) return;
  // Session cap: a client stuck in a retry loop (letter-rush "Room not found"
  // = 6.2k events from 20 users in 30d, audit 2026-07-22) re-emits the same
  // error for hours — the 30s dedupe alone still lets ~2/min through. After
  // the cap the signal is already unambiguous; more repeats are pure noise.
  const count = (_errorCounts[errorMessage] ?? 0) + 1;
  if (count > ERROR_SESSION_CAP) return;
  _errorCounts[errorMessage] = count;
  _lastTrackedError = { msg: errorMessage, at: now };
  trackEvent('game_error_shown', { error_message: errorMessage, phase: _phaseTracker.current ?? null, repeat_count: count });
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

/** Throttled blocked-interaction event: max 1 per control per 3s.
 *  Fired when a player clicks/taps a gated control (empty input, not their
 *  turn, cooldown) — natively `disabled` buttons swallow these clicks, so
 *  without this the friction is invisible to analytics (churn audit 2026-07-21). */
const _blockedAt: Record<string, number> = {};
export function trackBlockedClick(control: string, reason: string): void {
  const now = Date.now();
  if (now - (_blockedAt[control] ?? 0) < 3000) return;
  _blockedAt[control] = now;
  trackGameAction('blocked_click', { control, reason });
}

/** Explicit player-level quit signal ("I'm leaving, and THIS is where"):
 *  fired from the GameBuddies return button / in-game leave actions with the
 *  phase the player was in. Complements the server-side room-level
 *  game_session_ended (drop-off audit 2026-07-22). */
export function trackGameLeft(reason: 'return_button' | 'leave_button', extra?: Record<string, unknown>): void {
  trackEvent('game_left', {
    reason,
    phase: _phaseTracker.current ?? null,
    seconds_in_game: _phaseTracker.startTime
      ? Math.round((Date.now() - _phaseTracker.startTime) / 1000)
      : null,
    ...extra,
  });
}

// ── Universal phase tracker ────────────────────────────────────────
// Maintains a private singleton state. Call from your roomStateUpdated
// handler with the full state payload — it auto-detects the phase across
// the various shapes used by different games (data.gameData.phase,
// data.gameState.phase, data.state, data.phase) and emits PostHog events:
//   game_phase_entered  (every transition, with from/to)
//   game_started        (lobby → non-lobby)
//   game_finished       (entering finished/ended/game_over/game_end/finale)
const _phaseTracker: { current: string | undefined; startTime: number | null } = {
  current: undefined,
  startTime: null,
};

// Phase-name matching MUST be case-insensitive and include the aliases below —
// exact-match trackers silently dropped game_started/game_finished in fleet
// clients whose phases are uppercase ('LOBBY_WAITING'/'GAME_OVER') or unaliased
// ('gameover'): letter-rush shipped 5,304 game_phase_entered events in 30d with
// ZERO starts/finishes before this fix (fleet audit 2026-07-13).
// 'game_end' (ClueScale GAME_END) + 'finale' (Last Brain Standing) added
// 2026-07-22 — those games reported ZERO finishes for a month. When a game
// introduces a new terminal phase name, add it here AND in the gameserver's
// posthogCapture TERMINAL_PHASES (kept in sync manually).
const LOBBYISH_PHASES = new Set(["lobby", "lobby_waiting", "waiting"]);
const FINISHED_PHASES = new Set(["finished", "ended", "game_over", "gameover", "game_end", "finale"]);

export function trackPhaseFromRoomState(data: unknown): void {
  if (!data || typeof data !== "object") return;
  const d = data as Record<string, any>;
  const newPhase: string | undefined =
    d?.gameData?.phase ?? d?.gameState?.phase ?? d?.state ?? d?.phase;
  if (!newPhase) return;
  if (newPhase === _phaseTracker.current) return;
  const prev = _phaseTracker.current;
  const newNorm = String(newPhase).toLowerCase();
  const prevNorm = prev ? String(prev).toLowerCase() : undefined;
  trackEvent("game_phase_entered", { phase: newPhase, from: prev ?? null, room_code: d?.code });
  if (prevNorm && LOBBYISH_PHASES.has(prevNorm) && !LOBBYISH_PHASES.has(newNorm) && !FINISHED_PHASES.has(newNorm)) {
    _phaseTracker.startTime = Date.now();
    trackEvent("game_started", { room_code: d?.code });
  }
  if (FINISHED_PHASES.has(newNorm) && _phaseTracker.startTime) {
    const dur = Math.round((Date.now() - _phaseTracker.startTime) / 1000);
    trackGameFinished(1, dur, { room_code: d?.code });
    _phaseTracker.startTime = null;
  }
  _phaseTracker.current = newPhase;
}

/** Explicit finish hook for games whose room state never enters a terminal
 *  phase — e.g. Bad Actor returns straight to 'lobby' after the final reveal,
 *  so the tracker above can never fire game_finished. Call from the
 *  end-of-game screen. The armed startTime doubles as the double-fire guard
 *  (remounts no-op). */
export function trackGameFinishedNow(totalRounds: number, extra?: Record<string, unknown>): void {
  if (!_phaseTracker.startTime) return;
  const dur = Math.round((Date.now() - _phaseTracker.startTime) / 1000);
  _phaseTracker.startTime = null;
  trackGameFinished(totalRounds, dur, extra);
}
