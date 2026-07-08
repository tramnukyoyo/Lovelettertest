/**
 * Platform login/signup via REDIRECT — the FALLBACK auth path.
 *
 * The primary path is now the in-game modal (services/supabaseAuth.ts +
 * GameAuthModal), which authenticates against the SHARED platform Supabase
 * session without leaving the game. Headers only fall back to these redirects
 * when in-game auth is unavailable (isInGameAuthAvailable() false — e.g.
 * standalone dev where /api/supabase-config is unreachable).
 *
 * How the redirect works: games are served same-origin under
 * gamebuddies.io/<game>/, so sessionStorage is SHARED with the platform. We set
 * the same return keys the platform's own login prompts use
 * (gb_auth_return_room / gb_auth_return_name), then navigate to /login. After
 * the user authenticates, LoginPage/AuthCallback read those keys and send them
 * to /?join=ROOM&name=NAME — back into their room, now signed in.
 */
import { isDiscordActivity } from './discordActivity';

/**
 * Login is only viable on the normal same-origin web (gamebuddies.io proxy).
 * Inside a Discord Activity the origin is *.discordsays.com and OAuth provider
 * redirects are frame-src blocked, so callers hide the entry point there.
 */
export function canPlatformLogin(): boolean {
  return !isDiscordActivity();
}

export function redirectToPlatformLogin(opts: { roomCode?: string; playerName?: string; signup?: boolean } = {}): void {
  try {
    if (opts.roomCode) sessionStorage.setItem('gb_auth_return_room', opts.roomCode);
    if (opts.playerName) sessionStorage.setItem('gb_auth_return_name', opts.playerName);
  } catch {
    /* sessionStorage unavailable — login still works, just without auto-return */
  }
  // Root-relative, same-origin top-level nav under the gamebuddies.io proxy.
  window.location.href = opts.signup ? '/login?mode=signup' : '/login';
}

/**
 * Sign out via the platform. Games have no Supabase client, so we navigate to
 * the platform's same-origin /logout route which performs the real signOut()
 * and lands the user on the homepage.
 */
export function redirectToPlatformLogout(): void {
  window.location.href = '/logout';
}
