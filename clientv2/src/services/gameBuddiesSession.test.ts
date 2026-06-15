import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseGameBuddiesSession,
  storeSession,
  loadSession,
  clearSession,
  getCurrentSession,
  type GameBuddiesSession,
} from './gameBuddiesSession';

// --- helpers to stub browser globals ---

function makeSessionStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k]; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((_i: number) => null),
  };
}

function stubWindow(url: string) {
  const parsed = new URL(url);
  const storage = makeSessionStorage();
  vi.stubGlobal('window', {
    location: {
      href: parsed.href,
      search: parsed.search,
      origin: parsed.origin,
      pathname: parsed.pathname,
    },
    history: { replaceState: vi.fn() },
    sessionStorage: storage,
  });
  // Also stub top-level sessionStorage and history for direct access
  vi.stubGlobal('sessionStorage', storage);
  vi.stubGlobal('history', { replaceState: vi.fn() });
}

beforeEach(() => {
  stubWindow('http://localhost:5173/');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// -------------------------------------------------------
// parseGameBuddiesSession
// -------------------------------------------------------
describe('parseGameBuddiesSession', () => {
  it('returns a session when room + name params are present', () => {
    stubWindow('http://localhost:5173/?room=ABC123&name=Alice&role=host');
    const session = parseGameBuddiesSession();
    expect(session).not.toBeNull();
    expect(session!.roomCode).toBe('ABC123');
    expect(session!.playerName).toBe('Alice');
    expect(session!.isHost).toBe(true);
    expect(session!.source).toBe('gamebuddies');
  });

  it('creates a pending session for session-token URLs and returns null', () => {
    stubWindow('http://localhost:5173/?session=tok_abc123&name=Bob&role=gm');
    const result = parseGameBuddiesSession();
    // The function stores a pending session and returns null
    expect(result).toBeNull();
    // Pending session should have been stored
    const stored = JSON.parse(sessionStorage.getItem('gamebuddies:session')!);
    expect(stored.pendingResolution).toBe(true);
    expect(stored.sessionToken).toBe('tok_abc123');
    expect(stored.playerName).toBe('Bob');
    expect(stored.isHost).toBe(true);
  });

  it('returns null when no relevant params are present', () => {
    stubWindow('http://localhost:5173/');
    const result = parseGameBuddiesSession();
    expect(result).toBeNull();
  });

  it('detects host from role=gm', () => {
    stubWindow('http://localhost:5173/?room=R1&name=Host&role=gm');
    const session = parseGameBuddiesSession();
    expect(session!.isHost).toBe(true);
  });

  it('detects host from role=host', () => {
    stubWindow('http://localhost:5173/?room=R2&name=Host2&role=host');
    const session = parseGameBuddiesSession();
    expect(session!.isHost).toBe(true);
  });

  it('detects non-host when role is absent', () => {
    stubWindow('http://localhost:5173/?room=R3&name=Player');
    const session = parseGameBuddiesSession();
    expect(session!.isHost).toBe(false);
  });

  it('picks up gbRoomCode as an alias for room', () => {
    stubWindow('http://localhost:5173/?gbRoomCode=GB99&name=Tester');
    const session = parseGameBuddiesSession();
    expect(session).not.toBeNull();
    expect(session!.roomCode).toBe('GB99');
  });

  it('builds default returnUrl from roomCode when not provided', () => {
    stubWindow('http://localhost:5173/?room=XYZ&name=P');
    const session = parseGameBuddiesSession();
    expect(session!.returnUrl).toBe('https://gamebuddies.io/lobby/XYZ');
  });
});

// -------------------------------------------------------
// storeSession / loadSession roundtrip
// -------------------------------------------------------
describe('storeSession / loadSession', () => {
  it('roundtrips a session through storage', () => {
    const session: GameBuddiesSession = {
      roomCode: 'ROOM1',
      playerName: 'Alice',
      isHost: false,
      returnUrl: 'https://gamebuddies.io/lobby/ROOM1',
      source: 'gamebuddies',
    };
    storeSession(session);
    const loaded = loadSession();
    expect(loaded).toEqual(session);
  });

  it('storeSession(null) clears the session', () => {
    const session: GameBuddiesSession = {
      roomCode: 'R',
      isHost: false,
      returnUrl: '',
      source: 'gamebuddies',
    };
    storeSession(session);
    expect(loadSession()).not.toBeNull();

    storeSession(null);
    expect(loadSession()).toBeNull();
  });
});

// -------------------------------------------------------
// loadSession edge cases
// -------------------------------------------------------
describe('loadSession', () => {
  it('returns null when storage is empty', () => {
    expect(loadSession()).toBeNull();
  });

  it('returns null for corrupt JSON', () => {
    sessionStorage.setItem('gamebuddies:session', '{not valid json!!!');
    expect(loadSession()).toBeNull();
  });
});

// -------------------------------------------------------
// clearSession
// -------------------------------------------------------
describe('clearSession', () => {
  it('removes the session from storage', () => {
    const session: GameBuddiesSession = {
      roomCode: 'R',
      isHost: false,
      returnUrl: '',
      source: 'gamebuddies',
    };
    storeSession(session);
    clearSession();
    expect(loadSession()).toBeNull();
  });
});

// -------------------------------------------------------
// getCurrentSession
// -------------------------------------------------------
describe('getCurrentSession', () => {
  it('prefers URL session over stored session', () => {
    // Pre-store a session
    const old: GameBuddiesSession = {
      roomCode: 'OLD',
      playerName: 'OldPlayer',
      isHost: false,
      returnUrl: '',
      source: 'gamebuddies',
    };
    storeSession(old);

    // Set URL with a new room
    stubWindow('http://localhost:5173/?room=NEW&name=NewPlayer');
    // Re-store the old session in the new storage instance
    storeSession(old);
    const session = getCurrentSession();
    expect(session).not.toBeNull();
    expect(session!.roomCode).toBe('NEW');
    expect(session!.playerName).toBe('NewPlayer');
  });

  it('falls back to stored session when URL has no params', () => {
    const stored: GameBuddiesSession = {
      roomCode: 'STORED',
      playerName: 'StoredPlayer',
      isHost: true,
      returnUrl: '',
      source: 'gamebuddies',
    };
    storeSession(stored);
    const session = getCurrentSession();
    expect(session).toEqual(stored);
  });

  it('returns null when no URL params and no stored session', () => {
    stubWindow('http://localhost:5173/');
    expect(getCurrentSession()).toBeNull();
  });
});
