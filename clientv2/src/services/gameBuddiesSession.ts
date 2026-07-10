/**
 * GameBuddies Session Management
 * Handles session detection, storage, and resolution from URL params
 */

import { isDiscordActivity } from './discordActivity';
import { setCurrentLanguage, type Language } from '../utils/translations';

export type GameBuddiesSession = {
  roomCode: string;
  playerName?: string;
  playerId?: string;
  userId?: string;
  isHost: boolean;
  expectedPlayers?: number;
  returnUrl: string;
  sessionToken?: string;
  source: 'gamebuddies';
  isStreamerMode?: boolean;
  hideRoomCode?: boolean;
  pendingResolution?: boolean;
  premiumTier?: 'free' | 'premium' | 'pro';
  avatarUrl?: string;
  /** Platform-chosen UI language (en|de|es|pt-BR|pt-PT) */
  locale?: string;
};

const SUPPORTED_LANGUAGES: Language[] = ['en', 'de', 'es', 'pt-BR', 'pt-PT'];

/**
 * Initialize the game's i18n from the platform locale. On a platform launch
 * the lobby language always wins (a stale in-game pick must not shadow it);
 * unsupported locales fall back to English. Without a platform locale
 * (standalone play), the stored choice / browser detection applies.
 */
export function applySessionLocale(locale?: string): void {
  if (!locale) return;
  const lang = (SUPPORTED_LANGUAGES as string[]).includes(locale) ? locale : 'en';
  setCurrentLanguage(lang as Language);
  console.log(`[GameBuddies] i18n initialized from platform locale: ${locale} -> ${lang}`);
}

const SESSION_KEY = 'gamebuddies:session';

/**
 * Security: Clear sensitive URL parameters to prevent leakage via referrer headers and browser history
 */
function cleanSensitiveUrlParams(): void {
  const cleanUrl = new URL(window.location.href);
  const sensitiveParams = ['session', 'token', 'sessionToken'];
  let hasChanges = false;

  for (const param of sensitiveParams) {
    if (cleanUrl.searchParams.has(param)) {
      cleanUrl.searchParams.delete(param);
      hasChanges = true;
    }
  }

  if (hasChanges) {
    window.history.replaceState({}, '', cleanUrl.toString());
  }
}

/**
 * Parse GameBuddies session from URL parameters
 */
export function parseGameBuddiesSession(): GameBuddiesSession | null {
  const params = new URLSearchParams(window.location.search);

  const sessionToken = params.get('session');
  const players = params.get('players');
  const playerName = params.get('name');
  const playerId = params.get('playerId');
  const role = params.get('role');

  // Detect session token URLs (secure GameBuddies mode)
  if (sessionToken) {
    const existingSession = loadSession();

    if (existingSession && existingSession.sessionToken === sessionToken) {
      return null; // Let getCurrentSession fall through to loadSession
    }


    const urlLang = params.get('lang') || undefined;
    applySessionLocale(urlLang);

    const pendingSession = {
      pendingResolution: true,
      sessionToken,
      playerName: playerName || undefined,
      playerId: playerId || undefined,
      isHost: role === 'gm' || role === 'host',
      expectedPlayers: parseInt(players || '0') || 0,
      source: 'gamebuddies' as const,
      isStreamerMode: params.get('streamerMode') === 'true',
      roomCode: '',
      returnUrl: 'https://gamebuddies.io',
      locale: urlLang,
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(pendingSession));

    // Security: Clear sensitive params from URL immediately to prevent leakage via referrer headers
    cleanSensitiveUrlParams();

    return null;
  }

  // Original GameBuddies mode (with roomcode in URL)
  const roomCode = params.get('room') || params.get('gbRoomCode');
  const isHost = role === 'host' || role === 'gm' || params.get('isHost') === 'true';
  const expectedPlayers = parseInt(params.get('players') || '0');
  const returnUrl = params.get('returnUrl');
  const avatarUrl = params.get('avatar') || params.get('avatarUrl') || undefined;
  const isStreamerMode = params.get('streamerMode') === 'true';

  const isGameBuddiesSession = !!(roomCode && (playerName || playerId || isHost));

  if (!isGameBuddiesSession) {
    return null;
  }

  const legacyLang = params.get('lang') || undefined;
  applySessionLocale(legacyLang);

  return {
    roomCode: roomCode!,
    playerName: playerName || undefined,
    playerId: playerId || undefined,
    isHost,
    expectedPlayers,
    returnUrl: returnUrl || `https://gamebuddies.io/lobby/${roomCode}`,
    sessionToken: sessionToken || undefined,
    source: 'gamebuddies',
    isStreamerMode,
    hideRoomCode: isStreamerMode,
    avatarUrl,
    locale: legacyLang,
  };
}

/**
 * Store session in sessionStorage
 */
export function storeSession(session: GameBuddiesSession | null) {
  if (!session) {
    clearSession();
    return;
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/**
 * Load session from sessionStorage
 */
export function loadSession(): GameBuddiesSession | null {
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error('[GameBuddies] Failed to parse session:', e);
    return null;
  }
}

/**
 * Clear session from sessionStorage
 */
export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

/**
 * Get current session (from URL or storage)
 */
export function getCurrentSession(): GameBuddiesSession | null {

  const urlSession = parseGameBuddiesSession();

  if (urlSession) {
    storeSession(urlSession);
    return urlSession;
  }

  const storedSession = loadSession();

  return storedSession;
}

/**
 * Resolve session token to get actual room code from GameBuddies API
 */
export async function resolveSessionToken(sessionToken: string): Promise<{
  roomCode: string;
  gameType: string;
  streamerMode: boolean;
  playerId?: string;
  userId?: string;
  playerName?: string;
  isHost?: boolean;
  premiumTier?: string;
  avatarUrl?: string;
  locale?: string;
} | null> {
  // Inside a Discord Activity the origin is *.discordsays.com and absolute
  // gamebuddies.io fetches are CSP-blocked. Use same-origin candidates that route
  // through Discord's URL mappings (the accepted form — bare `/api/...` via the root
  // mapping vs explicit `/.proxy/api/...` — varies, so try each). Normal web is served
  // FROM gamebuddies.io so the single absolute candidate is correct there.
  const inDiscord = isDiscordActivity();
  const candidates = inDiscord
    ? [
        `/api/game-sessions/${sessionToken}`,
        `/.proxy/api/game-sessions/${sessionToken}`,
      ]
    : [`https://gamebuddies.io/api/game-sessions/${sessionToken}`];

  let data: { success?: boolean; session?: any } | null = null;
  for (const url of candidates) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        mode: inDiscord ? 'same-origin' : 'cors',
        credentials: 'include',
      });
      if (!response.ok) {
        console.warn(`[GameBuddies] session resolve ${url} → HTTP ${response.status}, trying next`);
        continue;
      }
      data = await response.json();
      break;
    } catch (error) {
      console.warn(`[GameBuddies] session resolve ${url} failed (CSP/network), trying next:`, error);
      continue;
    }
  }

  if (!data) {
    console.error('[GameBuddies] Failed to resolve session token (all candidates exhausted)');
    return null;
  }

  if (data.success && data.session) {
    const session = data.session;
    return {
      roomCode: session.roomCode,
      gameType: session.gameType,
      streamerMode: session.streamerMode ?? false,
      playerId: session.playerId,
      userId: session.userId,
      playerName: session.playerName,
      isHost: session.isHost,
      premiumTier: session.premiumTier,
      avatarUrl: session.avatarUrl,
      locale: session.locale,
    };
  }

  console.error('[GameBuddies] Session resolution failed:', data);
  return null;
}

/**
 * Resolve pending session asynchronously
 */
export async function resolvePendingSession(): Promise<GameBuddiesSession | null> {
  const stored = sessionStorage.getItem(SESSION_KEY);

  if (!stored) {
    return null;
  }

  try {
    const pending = JSON.parse(stored);

    if (!pending.pendingResolution || !pending.sessionToken) {
      return pending;
    }


    const resolved = await resolveSessionToken(pending.sessionToken);

    if (!resolved) {
      console.error('[GameBuddies] Failed to resolve session token');
      clearSession();
      return null;
    }

    const finalSession: GameBuddiesSession = {
      roomCode: resolved.roomCode,
      playerName: resolved.playerName || pending.playerName,
      playerId: resolved.playerId || pending.playerId,
      userId: resolved.userId,
      isHost: resolved.isHost ?? pending.isHost,
      expectedPlayers: pending.expectedPlayers,
      returnUrl: `https://gamebuddies.io/lobby/${resolved.roomCode}`,
      sessionToken: pending.sessionToken,
      source: 'gamebuddies',
      isStreamerMode: resolved.streamerMode ?? pending.isStreamerMode ?? false,
      hideRoomCode: resolved.streamerMode ?? pending.isStreamerMode ?? false,
      premiumTier: (resolved.premiumTier as 'free' | 'premium' | 'pro') || 'free',
      avatarUrl: resolved.avatarUrl,
      locale: resolved.locale || pending.locale,
    };

    applySessionLocale(finalSession.locale);

    storeSession(finalSession);
    return finalSession;
  } catch (error) {
    console.error('[GameBuddies] Failed to resolve pending session:', error);
    clearSession();
    return null;
  }
}
