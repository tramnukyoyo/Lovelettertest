/**
 * In-game Supabase auth — login WITHOUT leaving the game page.
 *
 * CANONICAL copy-paste source for all game clients (like the rest of this
 * client's platform integration). Pattern proven by HotPotato's level editor:
 * games are served same-origin under gamebuddies.io/<game>/, so a supabase-js
 * client created with the platform's storageKey ('gamebuddies-auth') SHARES
 * the platform session — logged in on gamebuddies.io means logged in here,
 * and a login here logs the user into the platform too. No second auth silo.
 *
 * Responsibilities:
 *   - Lazy client init from same-origin GET /api/supabase-config (URL + public
 *     anon key). Unreachable (standalone dev on :5193, Discord Activity) →
 *     status 'unavailable' and the UI falls back to platformAuth's redirect.
 *   - Auth state store (useSyncExternalStore, mirroring playerProfiles.ts):
 *     status + userId + public.users row (instant paint from the platform's
 *     'gb-cached-user' cache, then a fresh /api/users/:id fetch).
 *   - Email/password sign-in/up and Google/Discord OAuth via POPUP — exact
 *     port of the platform AuthModal flow (BroadcastChannel('gb-auth') +
 *     exchangeCodeForSession in this window; PKCE verifier lives in shared
 *     same-origin storage). Popup blocked → full-page redirect fallback with
 *     the existing gb_auth_return_room/name sessionStorage keys.
 *   - After sign-in: POST /api/auth/sync-user (creates/merges the users row,
 *     migrates guest progression), then gb:auth:upgrade over the game socket
 *     so the server re-validates the token and upgrades the room seat
 *     (userId/isGuest/premiumTier) live — see core/server.ts.
 *
 * The service is i18n-free: it returns error codes/messages; the modal maps
 * known codes to translated strings.
 */

import { useSyncExternalStore } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { isDiscordActivity } from './discordActivity';
import { getCurrentSession } from './gameBuddiesSession';
import socketService from './socketService';

// ---------------------------------------------------------------------------
// Types + store
// ---------------------------------------------------------------------------

/** Subset of the platform's public.users row the game cares about. */
export interface AuthUserRow {
  id: string;
  username?: string | null;
  display_name?: string | null;
  premium_tier?: string | null;
  premium_expires_at?: string | null;
  premium_trial_expires_at?: string | null;
  [key: string]: unknown;
}

export type AuthStatus =
  | 'unknown' // init not finished
  | 'unavailable' // no /api/supabase-config (standalone dev) or Discord Activity
  | 'guest' // available, no session
  | 'authed'; // live session

export interface AuthState {
  status: AuthStatus;
  userId: string | null;
  user: AuthUserRow | null;
  isPremium: boolean;
  /**
   * True after an explicit in-game logout. Lets headers show "logged out"
   * immediately even while the current room seat (server-side) still carries
   * the pre-logout identity — the seat is only downgraded on leave.
   */
  signedOutLocally: boolean;
}

// The explicit-logout marker must survive a reload (F5): without persistence
// the header falls back to the server-validated room seat (which keeps its
// identity until the player leaves) and shows "logged in" again.
const SIGNED_OUT_KEY = 'gb_signed_out_locally';
const readSignedOut = (): boolean => {
  try { return localStorage.getItem(SIGNED_OUT_KEY) === '1'; } catch { return false; }
};
const persistSignedOut = (v: boolean): void => {
  try {
    if (v) localStorage.setItem(SIGNED_OUT_KEY, '1');
    else localStorage.removeItem(SIGNED_OUT_KEY);
  } catch { /* ignore */ }
};

let state: AuthState = { status: 'unknown', userId: null, user: null, isPremium: false, signedOutLocally: readSignedOut() };
const listeners = new Set<() => void>();

function setState(next: Partial<AuthState>): void {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AuthState {
  return state;
}

/** React hook: live auth state (status/user row/premium). */
export function useAuthState(): AuthState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getAuthUserId(): string | null {
  return state.status === 'authed' ? state.userId : null;
}

/** Whether the in-game modal can work here (config reachable, not Discord). */
export function isInGameAuthAvailable(): boolean {
  return state.status === 'authed' || state.status === 'guest';
}

// Mirrors the platform's isPremium derivation (decorative — the server
// re-validates premium authoritatively for room seats).
function computeIsPremium(row: AuthUserRow | null): boolean {
  if (!row) return false;
  const tier = row.premium_tier;
  if (tier === 'lifetime') return true;
  if (tier && tier !== 'free') return true;
  const trial = row.premium_trial_expires_at ? new Date(row.premium_trial_expires_at) : null;
  return !!(trial && trial.getTime() > Date.now());
}

// ---------------------------------------------------------------------------
// Client init (HotPotato pattern: runtime config + lazy import + shared key)
// ---------------------------------------------------------------------------

const REMEMBER_ME_KEY = 'gamebuddies-remember-me'; // shared with the platform

function getRememberMePreference(): boolean {
  try {
    return localStorage.getItem(REMEMBER_ME_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setRememberMePreference(remember: boolean): void {
  try {
    localStorage.setItem(REMEMBER_ME_KEY, String(remember));
  } catch {
    /* storage unavailable */
  }
}

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

let client: SupabaseClient | null = null;
let clientUsesLocalStorage = true;
let config: SupabaseConfig | null = null;
let initPromise: Promise<void> | null = null;

async function fetchConfig(): Promise<SupabaseConfig | null> {
  try {
    const res = await fetch(`/api/supabase-config?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return null;
    const cfg = (await res.json()) as Partial<SupabaseConfig>;
    if (!cfg?.url || !cfg?.anonKey) return null;
    return { url: cfg.url, anonKey: cfg.anonKey };
  } catch {
    return null;
  }
}

async function createAuthClient(): Promise<SupabaseClient | null> {
  if (!config) return null;
  const rememberMe = getRememberMePreference();
  const { createClient } = await import('@supabase/supabase-js');
  clientUsesLocalStorage = rememberMe;
  return createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      // OAuth never lands on the game URL (popup → platform /auth/callback),
      // so URL detection stays off to avoid eating unrelated hash params.
      detectSessionInUrl: false,
      storage: rememberMe ? window.localStorage : window.sessionStorage,
      storageKey: 'gamebuddies-auth', // SHARED with the platform client
      flowType: 'pkce',
    },
  });
}

/**
 * Recreate the client when the remember-me choice changed (storage backend is
 * fixed at creation — same trick as the platform's reinitializeSupabaseClient).
 */
async function ensureClient(): Promise<SupabaseClient | null> {
  if (client && clientUsesLocalStorage === getRememberMePreference()) return client;
  client = await createAuthClient();
  return client;
}

/**
 * Idempotent app-start init. Cheap when auth is unavailable (one failed
 * config fetch); supabase-js itself only loads once config resolves.
 */
export function initSupabaseAuth(): void {
  if (initPromise) return;
  initPromise = (async () => {
    // Discord Activity is cross-origin (*.discordsays.com): no shared storage,
    // OAuth popups frame-blocked. Keep auth hidden there (existing behavior).
    if (isDiscordActivity()) {
      setState({ status: 'unavailable' });
      return;
    }
    config = await fetchConfig();
    if (!config) {
      setState({ status: 'unavailable' });
      return;
    }
    client = await createAuthClient();
    if (!client) {
      setState({ status: 'unavailable' });
      return;
    }

    // Instant paint from the platform's cached users row while the fresh
    // session check + fetch run.
    try {
      const cached = localStorage.getItem('gb-cached-user');
      if (cached) {
        const row = JSON.parse(cached) as AuthUserRow;
        if (row?.id) setState({ user: row, isPremium: computeIsPremium(row) });
      }
    } catch {
      /* corrupt cache — ignore */
    }

    const { data } = await client.auth.getSession();
    await applySession(data?.session ?? null);

    // Fires for this window's sign-in/out AND (via storage sync) for
    // platform-tab logins/logouts — the header updates by itself.
    client.auth.onAuthStateChange((_event: string, session: Session | null) => {
      void applySession(session);
    });
  })();
}

async function applySession(session: Session | null): Promise<void> {
  if (!session?.user?.id) {
    // Session gone. If we were authed before (e.g. logout in a platform tab
    // synced over), flag it so headers don't fall back to the stale room seat.
    const signedOut = state.status === 'authed' ? true : state.signedOutLocally;
    if (state.status === 'authed') persistSignedOut(true);
    setState({
      status: 'guest',
      userId: null,
      user: null,
      isPremium: false,
      signedOutLocally: signedOut,
    });
    return;
  }
  const userId = session.user.id;
  persistSignedOut(false);
  setState({ status: 'authed', userId, signedOutLocally: false });
  await refreshUserRow(userId, session.access_token);
}

async function refreshUserRow(userId: string, accessToken: string): Promise<void> {
  try {
    const res = await fetch(`/api/users/${userId}`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) return; // keep cached row — decorative data
    const data = (await res.json()) as { user?: AuthUserRow };
    if (data?.user?.id) {
      setState({ user: data.user, isPremium: computeIsPremium(data.user) });
      try {
        localStorage.setItem('gb-cached-user', JSON.stringify(data.user));
      } catch {
        /* storage unavailable */
      }
    }
  } catch {
    /* network — keep cached row */
  }
}

// ---------------------------------------------------------------------------
// Sign-in / sign-up (email + password)
// ---------------------------------------------------------------------------

export type AuthResult =
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; code: 'already-registered' }
  | { ok: false; code: 'pending-confirm' };

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const c = await ensureClient();
  if (!c) return { ok: false, error: 'auth unavailable' };
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  if (!data?.session) return { ok: false, error: 'no session' };
  await afterSignIn(data.session);
  return { ok: true };
}

export async function signUpWithPassword(email: string, password: string): Promise<AuthResult> {
  const c = await ensureClient();
  if (!c) return { ok: false, error: 'auth unavailable' };
  // Email-confirm links always land on the platform callback (absolute URL —
  // works identically from the proxied game path).
  const redirectUrl =
    window.location.hostname === 'localhost'
      ? `${window.location.origin}/auth/callback`
      : 'https://gamebuddies.io/auth/callback';
  const { data, error } = await c.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectUrl },
  });
  // Same duplicate-email detection as the platform AuthModal: explicit error
  // OR the anti-enumeration response (user with empty identities, no session).
  const alreadyRegisteredError = !!error && /already\s+(registered|exists)/i.test(error.message || '');
  const identities = (data?.user as { identities?: unknown[] } | undefined)?.identities;
  const antiEnumerationHit = !error && !!data?.user && Array.isArray(identities) && identities.length === 0;
  if (alreadyRegisteredError || antiEnumerationHit) return { ok: false, code: 'already-registered' };
  if (error) return { ok: false, error: error.message };
  if (!data.session) return { ok: false, code: 'pending-confirm' }; // confirm email first
  await afterSignIn(data.session);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// OAuth via popup (port of the platform AuthModal flow)
// ---------------------------------------------------------------------------

export type OAuthProvider = 'google' | 'discord';

export async function signInWithOAuthPopup(
  provider: OAuthProvider,
  opts: { roomCode?: string; playerName?: string } = {}
): Promise<AuthResult> {
  const c = await ensureClient();
  if (!c) return { ok: false, error: 'auth unavailable' };

  // Tells the platform's AuthCallback page (loaded in the popup) to extract
  // the OAuth code, broadcast it to this window, and close itself.
  try {
    localStorage.setItem('gb_auth_popup_mode', '1');
  } catch {
    /* storage unavailable */
  }

  // signInWithOAuth also writes the PKCE code_verifier to shared storage —
  // this window uses it for exchangeCodeForSession after the popup reports in.
  const { data, error } = await c.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: provider === 'discord' ? 'identify email' : undefined,
      skipBrowserRedirect: true,
    },
  });
  if (error || !data?.url) {
    try {
      localStorage.removeItem('gb_auth_popup_mode');
    } catch { /* ignore */ }
    return { ok: false, error: error?.message || 'oauth failed' };
  }

  const popup = window.open(
    data.url,
    'gb-auth-popup',
    'width=480,height=720,menubar=no,toolbar=no,location=yes,status=no'
  );
  if (!popup) {
    // Popup blocked → full-page redirect (the one flow that leaves the game).
    // The existing return keys bring the user back to this room after auth.
    try {
      localStorage.removeItem('gb_auth_popup_mode');
    } catch { /* ignore */ }
    try {
      if (opts.roomCode) sessionStorage.setItem('gb_auth_return_room', opts.roomCode);
      if (opts.playerName) sessionStorage.setItem('gb_auth_return_name', opts.playerName);
    } catch { /* ignore */ }
    window.location.href = data.url;
    return { ok: false, error: 'redirecting' };
  }

  return new Promise<AuthResult>((resolve) => {
    let settled = false;
    const channel = new BroadcastChannel('gb-auth');
    const cleanup = (): void => {
      clearInterval(poll);
      try {
        channel.close();
      } catch { /* ignore */ }
      try {
        localStorage.removeItem('gb_auth_popup_mode');
      } catch { /* ignore */ }
    };
    const poll = setInterval(() => {
      if (popup.closed && !settled) {
        settled = true;
        cleanup();
        resolve({ ok: false, error: 'popup closed' });
      }
    }, 500);

    channel.onmessage = async (evt: MessageEvent): Promise<void> => {
      const msg = evt.data as { type?: string; code?: string; error?: string } | null;
      if (!msg || settled) return;
      if (msg.type === 'gb-auth-error') {
        settled = true;
        cleanup();
        resolve({ ok: false, error: msg.error || 'oauth failed' });
        return;
      }
      if (msg.type !== 'gb-auth-code' || !msg.code) return;
      settled = true;
      cleanup();
      try {
        const { data: exch, error: exchErr } = await c.auth.exchangeCodeForSession(msg.code);
        // The popup may have auto-exchanged the code before closing ("code
        // already used") — multi-tab sync still lands the session in our
        // storage, so getSession() recovers it.
        let sess = exch?.session ?? null;
        if (!sess) {
          const { data: got } = await c.auth.getSession();
          sess = got?.session ?? null;
        }
        if (!sess) throw new Error(exchErr?.message || 'no session after exchange');
        await afterSignIn(sess);
        resolve({ ok: true });
      } catch (err) {
        resolve({ ok: false, error: (err as Error).message || 'oauth failed' });
      }
    };
  });
}

// ---------------------------------------------------------------------------
// Post-login: sync-user + live room-seat upgrade
// ---------------------------------------------------------------------------

async function afterSignIn(session: Session): Promise<void> {
  // Create/merge the public.users row + migrate guest progression — same
  // payload as the platform's upgradeFromGuest.
  try {
    const gbSession = getCurrentSession();
    const oldGuestUserId = ((): string | null => {
      try {
        return localStorage.getItem('gb_guestUserId');
      } catch {
        return null;
      }
    })();
    const supaUser = session.user as unknown as {
      id: string;
      email?: string;
      email_confirmed_at?: string;
      app_metadata?: { provider?: string };
      user_metadata?: { provider_id?: string; full_name?: string; name?: string };
    };
    const provider = supaUser.app_metadata?.provider || 'email';
    const isEmailAuth = provider === 'email';
    const res = await fetch('/api/auth/sync-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        supabase_user_id: supaUser.id,
        email: supaUser.email,
        email_confirmed_at: supaUser.email_confirmed_at,
        oauth_provider: isEmailAuth ? null : provider,
        oauth_id: isEmailAuth ? null : supaUser.user_metadata?.provider_id || supaUser.id,
        display_name:
          supaUser.user_metadata?.full_name ||
          supaUser.user_metadata?.name ||
          (supaUser.email ? supaUser.email.split('@')[0] : 'User'),
        old_guest_user_id: oldGuestUserId,
        room_code: gbSession?.roomCode ?? null,
        session_token: gbSession?.sessionToken ?? null,
        preferred_lobby_name: gbSession?.playerName ?? null,
      }),
    });
    if (res.ok) {
      try {
        localStorage.removeItem('gb_guestUserId'); // merged server-side
      } catch { /* ignore */ }
    }
  } catch {
    // Non-fatal (e.g. sync-user rate limit): the session is live regardless.
  }
  await applySession(session);
  maybeUpgradeRoomIdentity();
}

/**
 * If we're authed AND currently seated in a room, ask the game server to
 * re-validate our access token and upgrade the seat (userId/isGuest/premium)
 * — the server broadcasts fresh room state + gb:player:profile on success.
 * Safe to call any time; no-ops when not applicable.
 */
export function maybeUpgradeRoomIdentity(): void {
  void (async () => {
    if (state.status !== 'authed' || !client) return;
    const socket = socketService.getSocket();
    if (!socket?.connected) return;
    const { data } = await client.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return;
    socket.emit(
      'gb:auth:upgrade',
      { accessToken: token },
      (resp: { success: boolean; error?: string } | undefined) => {
        if (resp && !resp.success && resp.error !== 'not_in_room') {
          console.warn('[SupabaseAuth] room identity upgrade failed:', resp.error);
        }
      }
    );
  })();
}

// ---------------------------------------------------------------------------
// Sign-out
// ---------------------------------------------------------------------------

/**
 * Signs out of the game AND the platform in this browser (shared session).
 * scope 'local' = this browser only; other devices stay logged in. The
 * current room seat keeps its identity server-side until the player leaves.
 */
export async function signOutEverywhere(): Promise<void> {
  try {
    const c = await ensureClient();
    await c?.auth.signOut({ scope: 'local' });
  } catch {
    /* even if revocation fails, clear local state below */
  }
  try {
    localStorage.removeItem('gb-cached-user');
  } catch { /* ignore */ }
  persistSignedOut(true);
  setState({ status: 'guest', userId: null, user: null, isPremium: false, signedOutLocally: true });
}
