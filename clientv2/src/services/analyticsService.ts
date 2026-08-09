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

/**
 * The platform relays its consent decision in the game-launch URL (`consent`,
 * set by RoomLobby.withPlatformLang). localStorage is origin-scoped, so a player
 * who accepted on gamebuddies.io and then landed on a cross-origin game host
 * (Discord Activity, *.onrender.com, direct/QR) read an empty store and their
 * granted consent was silently discarded - analytics stayed dark for them even
 * though they had opted in (consent audit 2026-07-28). Same relay mechanism as
 * `phid` below; persisted to sessionStorage so in-game reloads keep it.
 *
 * This only ever HONOURS a decision the user already made on the platform. A
 * game client never asks for consent and never grants it on the user's behalf:
 * 'essential' is stored just as faithfully as 'all', and an absent param leaves
 * the previous (default-deny) behaviour untouched.
 */
function platformConsent(): string | null {
  try {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get('consent');
    if (fromUrl === 'all' || fromUrl === 'essential') {
      sessionStorage.setItem('gb_consent', fromUrl);
      // Strip it from the visible URL immediately. A consent decision must not
      // survive a copy-pasted link and pre-grant consent for whoever opens it
      // next — it belongs to the person who made it, for this session only.
      url.searchParams.delete('consent');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
      return fromUrl;
    }
    return sessionStorage.getItem('gb_consent');
  } catch {
    return null;
  }
}

function hasConsent(): boolean {
  try {
    if (localStorage.getItem(CONSENT_KEY) === 'all') return true;
  } catch {
    /* localStorage unavailable (private mode / blocked) - fall through */
  }
  return platformConsent() === 'all';
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
        capture_pageview: true,
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
export function trackGameFinished(totalRounds: number, gameDurationSeconds: number | null, extra?: Record<string, unknown>): void {
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

// startTime lives in sessionStorage as well as memory. It is set only on the
// lobby->playing transition, so a reload, a remount, or joining mid-game left it
// null — and both finish paths below used to treat "no start time" as "do not
// report", silently dropping the finish. Measured 2026-07-26: schooled logged 22
// game_over phases but only 11 game_finished, cluescale 32 GAME_END but only 6.
// Persisting survives the reload; reporting a null duration (below) survives the
// rest. A missing duration is a gap in one field — a missing event is a gap in
// the funnel.
// Suffixed per game: every client is served same-origin under
// gamebuddies.io/<slug>/, so an unsuffixed key is SHARED across all of them.
// A startTime armed in one game then leaked into the next game opened in the
// same tab, and finishedFor (keyed on room code alone) could swallow a second
// game's finish. GAME_SLUG is already the `game` dimension on every event.
const PHASE_STORE_KEY = `gb-phase-tracker:${GAME_SLUG}`;
type PhaseStore = { startTime: number | null; finishedFor: string | null; startedFor: string | null };

function readPhaseStore(): PhaseStore {
  try {
    const raw = sessionStorage.getItem(PHASE_STORE_KEY);
    if (raw) return JSON.parse(raw) as PhaseStore;
  } catch { /* private mode / quota — fall through to memory */ }
  return { startTime: _phaseTracker.startTime, finishedFor: null, startedFor: null };
}

function writePhaseStore(store: PhaseStore): void {
  _phaseTracker.startTime = store.startTime;
  try {
    sessionStorage.setItem(PHASE_STORE_KEY, JSON.stringify(store));
  } catch { /* memory copy above is the fallback */ }
}

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
// Two sets, mirroring the split the gameserver documents in
// core/services/terminalPhases.ts. 'finale' is DDF's FINAL ROUND — still being
// played. It must suppress a spurious game_started (entering it is not starting
// a new game) but must NOT fire game_finished. Verified 2026-07-29: DDF's
// game_finished landed 2ms after entry into finale, so its "3.8% completion
// rate" was measuring reaching the finale, not finishing the game.
const NON_START_PHASES = new Set(["finished", "ended", "game_over", "gameover", "game_end", "finale"]);
const FINISHED_PHASES = new Set(["finished", "ended", "game_over", "gameover", "game_end"]);

export function trackPhaseFromRoomState(data: unknown): void {
  if (!data || typeof data !== "object") return;
  const d = data as Record<string, any>;
  const newPhase: string | undefined =
    d?.gameData?.phase ?? d?.gameState?.phase ?? d?.state ?? d?.phase;
  if (!newPhase) return;
  if (newPhase === _phaseTracker.current) return;
  const prev = _phaseTracker.current;
  const newNorm = String(newPhase).toLowerCase();
  trackEvent("game_phase_entered", { phase: newPhase, from: prev ?? null, room_code: d?.code });
  const roomKey = String(d?.code ?? "_");
  // Returning to a lobby clears the start guard, so a rematch in the same room
  // still counts as a new game.
  if (LOBBYISH_PHASES.has(newNorm)) {
    const s = readPhaseStore();
    if (s.startedFor !== null) writePhaseStore({ ...s, startedFor: null });
  }
  // Guarded on the room code in sessionStorage rather than on the in-memory
  // previous phase. _phaseTracker.current does not survive a reload, so a
  // refresh or a mid-game join left prevNorm undefined and skipped this branch
  // entirely: prime-suspect logged 110 entries into PLAYING against 40
  // game_started. It also left startTime unarmed, which is why so many finishes
  // report a null duration.
  if (!LOBBYISH_PHASES.has(newNorm) && !NON_START_PHASES.has(newNorm)) {
    const s = readPhaseStore();
    if (s.startedFor !== roomKey) {
      writePhaseStore({ startTime: Date.now(), finishedFor: null, startedFor: roomKey });
      trackEvent("game_started", { room_code: d?.code });
    }
  }
  if (FINISHED_PHASES.has(newNorm)) {
    const store = readPhaseStore();
    const key = String(d?.code ?? "_");
    // The armed startTime used to double as the double-fire guard. Now that a
    // finish reports with or without it, the guard has to be explicit.
    if (store.finishedFor !== key) {
      const dur = store.startTime ? Math.round((Date.now() - store.startTime) / 1000) : null;
      trackGameFinished(1, dur, { room_code: d?.code });
      writePhaseStore({ startTime: null, finishedFor: key, startedFor: store.startedFor });
    }
  }
  _phaseTracker.current = newPhase;
}

/** Explicit finish hook for games whose room state never enters a terminal
 *  phase — e.g. Bad Actor returns straight to 'lobby' after the final reveal,
 *  so the tracker above can never fire game_finished. Call from the
 *  end-of-game screen. The armed startTime doubles as the double-fire guard
 *  (remounts no-op). */
export function trackGameFinishedNow(totalRounds: number, extra?: Record<string, unknown>): void {
  const store = readPhaseStore();
  const key = String((extra as { room_code?: unknown } | undefined)?.room_code ?? "_");
  if (store.finishedFor === key) return; // remount / re-render — already reported
  const dur = store.startTime ? Math.round((Date.now() - store.startTime) / 1000) : null;
  writePhaseStore({ startTime: null, finishedFor: key, startedFor: store.startedFor });
  trackGameFinished(totalRounds, dur, extra);
}
