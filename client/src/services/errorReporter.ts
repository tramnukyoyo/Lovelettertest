/**
 * Error Reporter — Reports client-side errors to the game server via socket.
 *
 * Captures: uncaught errors, unhandled promise rejections, React boundary crashes.
 * Rate-limited to 5 errors per minute per client to avoid flooding.
 *
 * Filter pipeline mirrors Gamebuddies.Io's `utils/errorReporter.ts` so the
 * platform and the per-game reporters drop the same noise (bots, third-party
 * proxies, browser extensions, CORS-redacted "Script error.", stale chunks).
 */

import socketService from './socketService';
import { GAME_META } from '../config/gameMeta';

const MAX_ERRORS_PER_MINUTE = 5;
let errorCount = 0;
let errorWindowStart = Date.now();

const BOT_UA = /bot|crawler|spider|crawling|yandex|googlebot|bingbot|duckduckbot|slurp|baiduspider|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|headlesschrome|prerender|lighthouse|pingdom|uptimerobot/i;
const isBot = typeof navigator !== 'undefined' && BOT_UA.test(navigator.userAgent || '');

const BENIGN_PATTERNS: RegExp[] = [
  /ResizeObserver loop completed with undelivered notifications/i,
  /ResizeObserver loop limit exceeded/i,
  /(?:ReferenceError:\s*)?Cannot access '[A-Za-z_$][\w$]*' before initialization/,
  /^(?:ReferenceError:\s*)?[a-z] is not defined$/i,
  // Cross-origin script errors. Browser strips all detail (no stack, no
  // filename, no line) for security; "Script error." is the literal
  // CORS-redacted message and there's nothing to act on. Common in Facebook /
  // Instagram in-app browsers (FBAN/EMA UA strings).
  /^Script error\.?$/i,
  /Called on script loaded before session recording is available/i,
  // Browser extensions / in-app webviews probing window for vendor globals.
  // None of these are our code: drop without writing to game_client_errors.
  /\b__firefox__\b/i,
  /\bzaloJSV2\b/i,
  /\bSCDynimacBridge\b/i,
  /window\.ethereum\b/i,
  /Internal JSON-RPC error/i,
  // Removed-feature ghost identifiers we still see referenced from stale CDN
  // bundles. Add new entries here when an old global keeps showing up after
  // its source has been deleted; do NOT add real bugs.
  /(?:ReferenceError:\s*)?(showAvatarTab|onConnect)\s+is not defined/,
  // Android WebView (Chrome Custom Tabs / Facebook in-app browser) — when the
  // host activity is destroyed mid-page-life, JS bridge calls return "Java
  // object is gone". Not actionable.
  /Java object is gone/i,
];

// User-facing UX validations the player already saw in the UI as a toast.
// These are NOT bugs — the server is correctly rejecting an action. Drop them
// from the error pipeline entirely so the dashboard shows real signal only.
//
// To add: confirm the message is purely informational (no server crash, no
// state corruption) before listing it. Real bugs masquerading as validations
// (e.g. a "Failed to mark item" that wraps a `setting 'score'` crash) MUST
// stay reported.
const BENIGN_VALIDATION_PATTERNS: RegExp[] = [
  /Pick at least one emoji before confirming/i,
  /Can only update settings in lobby/i,
  /Need exactly 2 active players to start/i,
  /This mode requires at least \d+ players?/i,
  /Game room not found/i,
  /Can only start next round from results phase/i,
  /Game is not in progress/i,
  /Prompt must be at least \d+ characters?/i,
  /Prompt cannot exceed \d+ characters?/i,
  /Player name already exists/i,
  /Only the host can start the game/i,
  /Invalid language\. Must be /i,
  /Not your turn to draw/i,
  /Cannot start next round at this time/i,
  /Can only advance from reveal phase/i,
  // User-environment WebRTC failures: denied permission, no device, device
  // busy. Not bugs we can fix — the user picks a different device or grants
  // permission and the next call succeeds.
  /Failed to start the audio device/i,
  /Permission denied by system/i,
  /The request is not allowed by the user agent/i,
  /Permission dismissed/i,
  /NotAllowedError: Permission denied/i,
  /NotFoundError: Requested device not found/i,
  /NotReadableError:/i,
  // WebRTC peer-connection lifecycle: stream/transport gone because the peer
  // already left. Browser-thrown after the user-visible "X disconnected"
  // toast, no recovery action needed.
  /^Unhandled rejection:\s*Stream closed/i,
  /^Stream closed$/i,
  /InvalidStateError:.*RTCPeerConnection/i,
  /InvalidStateError:.*sender's transport/i,
  /Connection is closed\.?/i,
  // View-Transitions API races: the engine aborts the previous transition
  // when a new one is queued. Cosmetic, not a bug.
  /Transition was skipped/i,
  /Transition was aborted because of invalid state/i,
  // React reconciler removeChild / insertBefore races caused by browser
  // extensions or Google Translate mutating the DOM mid-render. Caught by
  // route-level ErrorBoundary which auto-recovers; no DB row needed.
  /Failed to execute '(removeChild|insertBefore)' on 'Node'/i,
  /NotFoundError:\s*The object can not be found here/i,
  /Minified React error #30[16]/,
  // Browser-environment fetch failures: user offline, hard tab close mid-
  // request, ad-blocker eating /api/track. Different from app-internal
  // fetch errors which still ride through with stack info.
  /^(?:\[CLIENT\]\s*)?Unhandled rejection:\s*Failed to fetch$/i,
  /^(?:\[CLIENT\]\s*)?Unhandled rejection:\s*Load failed$/i,
  // More UX validations seen in the wild that deserve to be info, not error.
  /Can only end voting during voting phase/i,
  /Word cannot be empty/i,
  // Phase / permission rejections — server correctly refuses an action because
  // the game isn't in the right state, or the requester isn't the right role.
  // Player saw a toast, no DB row needed.
  /Cannot change language during game/i,
  /Can only skip word during word round/i,
  /Cannot kick the host/i,
  /Only host can (kick players|update settings|start the game)/i,
  /Only gamemaster can /i,
  /Can only force voting during word or question round/i,
  /Can only change settings in lobby/i,
  /Game already started/i,
  /Not in (rating|prompt submission|review) phase/i,
];

function isStaleChunkError(message: string): boolean {
  if (!message) return false;
  return /Failed to fetch dynamically imported module/i.test(message)
    || /error loading dynamically imported module/i.test(message)
    || /Importing a module script failed/i.test(message)
    || /Unable to preload CSS/i.test(message)
    || /ChunkLoadError/i.test(message)
    || /is not a valid JavaScript MIME type/i.test(message)
    || /Expected a JavaScript(-or-Wasm)? module script/i.test(message);
}

function isBenignError(message: string): boolean {
  if (!message) return false;
  return BENIGN_PATTERNS.some(re => re.test(message));
}

function isBenignValidation(message: string): boolean {
  if (!message) return false;
  return BENIGN_VALIDATION_PATTERNS.some(re => re.test(message));
}

const EXTENSION_SCHEME_RE = /(chrome-extension|moz-extension|safari-extension|safari-web-extension|webkit-masked-url):\/\//;

function isPureExtensionStack(stack?: string): boolean {
  if (!stack) return false;
  const frames = stack.split('\n').filter(l => /https?:\/\/|:\/\//.test(l));
  if (frames.length === 0) return false;
  const hasExt = frames.some(f => EXTENSION_SCHEME_RE.test(f));
  if (!hasExt) return false;
  const hasOurOrigin = frames.some(f => f.includes(window.location.host));
  return !hasOurOrigin;
}

// Drop reports whose stack frames are entirely on a non-gamebuddies origin.
// Catches school content-filter proxies (e.g. cdn.cloudflare.net/portal/k12)
// that proxy the URL bar to gamebuddies.io but rewrite our JS through their CDN.
function isPureThirdPartyStack(stack?: string): boolean {
  if (!stack) return false;
  const httpFrames = stack
    .split('\n')
    .map(l => l.trim())
    .filter(l => /https?:\/\//i.test(l));
  if (httpFrames.length === 0) return false;
  const hasOurOrigin = httpFrames.some(f =>
    f.includes('gamebuddies.io') ||
    f.includes(window.location.host)
  );
  return !hasOurOrigin;
}

// Strip the wrapping prefixes the server-side console interceptor and our own
// initErrorReporter handlers attach. Without this, anchored patterns like
// /^Script error\.?$/ never match because the actual message reaching us is
// "[CLIENT] Script error." or "Unhandled rejection: Script error.".
function unwrapMessage(message: string): string {
  let m = message ?? '';
  m = m.replace(/^\[CLIENT\]\s*/i, '');
  m = m.replace(/^\[CONSOLE\]\s*/i, '');
  m = m.replace(/^\[FATAL\]\s*/i, '');
  m = m.replace(/^\[WARN\]\s*/i, '');
  m = m.replace(/^Unhandled rejection:\s*/i, '');
  return m;
}

function shouldDrop(message: string, stack?: string): boolean {
  if (isBot) return true;
  const unwrapped = unwrapMessage(message);
  if (isStaleChunkError(message) || isStaleChunkError(unwrapped)) return true;
  if (isBenignError(message) || isBenignError(unwrapped)) return true;
  if (isBenignValidation(message) || isBenignValidation(unwrapped)) return true;
  if (isPureExtensionStack(stack)) return true;
  if (isPureThirdPartyStack(stack)) return true;
  // Only canonical prod hostnames write to the shared error table.
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  if (host && host !== 'gamebuddies.io' && host !== 'www.gamebuddies.io') return true;
  return false;
}

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
  if (shouldDrop(message, stack)) return;
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

// When a Promise is rejected with a non-Error value (e.g. `Promise.reject('foo')`,
// or any vendor SDK that uses string reasons), there is no `.stack` property
// and Supabase ends up with a `error_stack: NULL` row that's impossible to
// localize. Synthesizing a stack at the listener gives us at least the
// listener-frame breadcrumb, enough to know which entry-point fired.
function synthesizeStack(label: string): string | undefined {
  try {
    return (new Error(label)).stack;
  } catch {
    return undefined;
  }
}

/** Initialize global error handlers. Call once from App.tsx. */
export function initErrorReporter(): void {
  window.addEventListener('error', (event) => {
    reportError(
      event.error?.message || event.message || 'Unknown error',
      event.error?.stack || synthesizeStack('synthetic-error-handler'),
      'error',
      { filename: event.filename, lineno: event.lineno, colno: event.colno }
    );
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    reportError(
      `Unhandled rejection: ${reason?.message || String(reason)}`,
      reason?.stack || synthesizeStack('synthetic-unhandledrejection'),
      'error'
    );
  });
}
