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
  isStreamerMode?: boolean; // New: indicates if this is streamer mode
  hideRoomCode?: boolean; // New: indicates if room code should be hidden
  pendingResolution?: boolean; // New: indicates if session needs async resolution
  premiumTier?: 'free' | 'monthly' | 'lifetime'; // Premium status from GameBuddies
  avatarUrl?: string;
};

const SESSION_KEY = 'gamebuddies:session';

/**
 * Parse GameBuddies session from URL parameters
 */
export function parseGameBuddiesSession(): GameBuddiesSession | null {
  const params = new URLSearchParams(window.location.search);

  // Check for streamer mode (no roomcode in URL)
  const sessionToken = params.get('session');
  const players = params.get('players');
  const playerName = params.get('name');
  const playerId = params.get('playerId');
  const role = params.get('role');

  // Detect any URL with session token as GameBuddies session
  // The new secure format only passes ?session=XXX&role=gm (no players param)
  if (sessionToken) {
    // Check if we already have a session (pending or resolved) in storage for this token
    const existingSession = loadSession();
    console.log('[parseGameBuddiesSession] Existing session in storage:', existingSession ? JSON.stringify(existingSession, null, 2) : 'null');

    if (existingSession && existingSession.sessionToken === sessionToken) {
      // Already have a session for this token (could be pending or resolved), don't overwrite
      console.log('[parseGameBuddiesSession] Found existing session for this token, NOT overwriting');
      return null; // Let getCurrentSession fall through to loadSession
    }

    console.log('[parseGameBuddiesSession] No existing session OR different token - creating new pending session');

    // For session token URLs, we need to resolve the token to get player data
    // Don't return a session immediately - it needs to be resolved asynchronously
    const pendingSession = {
      pendingResolution: true,
      sessionToken,
      playerName: playerName || undefined,
      playerId: playerId || undefined,
      isHost: role === 'gm' || role === 'host',
      expectedPlayers: parseInt(players || '0') || 0,
      source: 'gamebuddies' as const,
      // Check URL params for streamer mode hint, but allow API to override
      isStreamerMode: params.get('streamerMode') === 'true',
      roomCode: '', // Required field - will be filled after resolution
      returnUrl: 'https://gamebuddies.io', // Required field - fallback URL
    };

    // Store the pending session for async resolution
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(pendingSession));
    return null; // Return null to trigger async resolution
  }

  // Original GameBuddies mode (with roomcode in URL)
  const roomCode = params.get('room') || params.get('gbRoomCode');

  // Optional parameters
  const isHost = role === 'host' || role === 'gm' || params.get('isHost') === 'true';
  const expectedPlayers = parseInt(params.get('players') || '0');
  const returnUrl = params.get('returnUrl');
  const avatarUrl = params.get('avatar') || params.get('avatarUrl') || params.get('avatar_url') || undefined;

  // Streamer mode detection from URL
  const isStreamerMode = params.get('streamerMode') === 'true';

  // Detect if launched from GameBuddies
  const isGameBuddiesSession = !!(roomCode && (playerName || playerId || isHost));

  if (!isGameBuddiesSession) {
    return null;
  }

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

  return loadSession();
}

/**
 * Resolve session token to get actual room code from GameBuddies API (direct call)
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
  avatarStyle?: string;
  avatarSeed?: string;
  avatarOptions?: any;
} | null> {
  try {
    console.log(`[GameBuddies Client] Resolving session token: ${sessionToken.substring(0, 8)}...`);
    console.log(`[GameBuddies Client] Current window.location.origin: ${window.location.origin}`);
    console.log(`[GameBuddies Client] Current window.location.href: ${window.location.href}`);

    // Call GameBuddies API directly instead of going through ClueScale server proxy
    // This reduces latency and removes unnecessary proxy hop
    // GameBuddies has CORS configured to allow all .onrender.com domains
    const baseUrl = 'https://gamebuddies.io';
    console.log(`[GameBuddies Client] Using GameBuddies API directly: ${baseUrl}`);

    const fullUrl = `${baseUrl}/api/game-sessions/${sessionToken}`;
    console.log(`[GameBuddies Client] Fetching URL: ${fullUrl}`);

    // Add detailed debugging about the fetch request
    console.log(`[GameBuddies Client] Request details:`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      mode: 'cors',
      credentials: 'include'
    });

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      mode: 'cors',
      credentials: 'include' // Changed from 'same-origin' to support cross-origin requests
    });

    console.log(`[GameBuddies Client] Response status: ${response.status} ${response.statusText}`);
    console.log(`[GameBuddies Client] Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error('[GameBuddies] Failed to resolve session token:', response.status, response.statusText);
      console.error('[GameBuddies] Response URL:', response.url);

      // Try to read the error body for more info
      try {
        const errorText = await response.text();
        console.error('[GameBuddies] Error response body:', errorText);
      } catch (e) {
        console.error('[GameBuddies] Could not read error response body:', e);
      }

      return null;
    }

    const data = await response.json();
    console.log(`[GameBuddies Client] Response data:`, data);

    if (data.success && data.session) {
      const session = data.session;
      console.log(`[GameBuddies Client] Session resolved successfully: ${sessionToken.substring(0, 8)}... -> Room: ${session.roomCode}`);
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
        avatarStyle: session.avatarStyle,
        avatarSeed: session.avatarSeed,
        avatarOptions: session.avatarOptions,
      };
    } else {
      console.error('[GameBuddies Client] Session resolution failed:', data);
      return null;
    }
  } catch (error) {
    console.error('[GameBuddies Client] Error resolving session token:', error);
    if (error instanceof Error) {
      console.error('[GameBuddies Client] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    } else {
      console.error('[GameBuddies Client] Unknown error type:', typeof error);
    }
    return null;
  }
}

/**
 * Resolve pending session asynchronously
 */
export async function resolvePendingSession(): Promise<GameBuddiesSession | null> {
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (!stored) return null;

  try {
    const pending = JSON.parse(stored);

    if (!pending.pendingResolution || !pending.sessionToken) {
      return pending; // Return normal sessions as-is
    }

    console.log('[GameBuddies] Resolving pending session token:', pending.sessionToken.substring(0, 8) + '...');

    const resolved = await resolveSessionToken(pending.sessionToken);
    if (!resolved) {
      console.error('[GameBuddies] Failed to resolve session token');
      clearSession();
      return null;
    }

    console.log('[GameBuddies] Session resolved to room code:', resolved.roomCode);
    console.log('[GameBuddies] Session player info:', {
      playerId: resolved.playerId,
      playerName: resolved.playerName,
      isHost: resolved.isHost,
      premiumTier: resolved.premiumTier,
      streamerMode: resolved.streamerMode,
    });

    // Build the final session object - use API response data which has player info
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
      isStreamerMode: resolved.streamerMode ?? false,
      hideRoomCode: resolved.streamerMode ?? false,
      premiumTier: (resolved.premiumTier as 'free' | 'monthly' | 'lifetime') || 'free',
      avatarUrl: resolved.avatarUrl,
    };

    console.log('💎 [PREMIUM DEBUG] ThinkAlike session resolved - premiumTier:', resolved.premiumTier, 'finalSession.premiumTier:', finalSession.premiumTier);

    // Store the resolved session
    storeSession(finalSession);
    return finalSession;
  } catch (error) {
    console.error('[GameBuddies] Failed to resolve pending session:', error);
    clearSession();
    return null;
  }
}