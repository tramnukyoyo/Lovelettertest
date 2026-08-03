/**
 * Premium upsell bridge (premium growth P1-A, 2026-07-16) — copied from the
 * canonical fleet source (Lightwall client). Connects in-game locked-premium
 * moments to the platform premium page without disturbing the live room:
 *
 *  - openPremium(src): opens gamebuddies.io/premium in a NEW TAB. Games run
 *    same-origin under the platform proxy and as top-level navigations, so a
 *    new tab leaves the room tab, socket, and game state untouched — that IS
 *    the return-to-room story. No postMessage bridge needed.
 *  - isNativeWrapper(): same-origin proxy means the platform's persisted
 *    native-app flag (localStorage 'gb_nativeApp' = 'android'|'ios', written
 *    by Gamebuddies.Io utils/nativeApp.ts) is readable here. Inside a store
 *    wrapper the chip deep-links to the GP-trial anchor only (earned-currency
 *    redemption — the premium page hides money pricing in native itself).
 *  - trackPremiumLocked / trackUpsellClicked: PostHog events (analyticsService
 *    auto-injects `game`), powering the premium_feature_locked funnel.
 *
 * When copying to another game client: change PAGE_SRC to that game's public
 * id and keep event names identical.
 */
import { trackEvent } from './analyticsService';

const PAGE_SRC = 'game_primesuspect';

const PLATFORM_BASE =
  (import.meta.env.VITE_GAMEBUDDIES_API_BASE as string | undefined) || 'https://gamebuddies.io';

export function isNativeWrapper(): boolean {
  try {
    const stored = localStorage.getItem('gb_nativeApp');
    return stored === 'android' || stored === 'ios';
  } catch {
    return false;
  }
}

/** Fire when a free player taps a locked premium option.
 *  MUST be called from a click/tap handler only — never from a useEffect. A
 *  mount-fired call turns an impression into fake intent, and three clients
 *  doing that made the platform's biggest "paywall" numbers pure noise. */
export function trackPremiumLocked(surface: string, item: string): void {
  trackEvent('premium_feature_locked', { surface, item });
}

/** Fire when a free player merely SEES a locked premium surface (mount-based
 *  impression). Deliberately a separate event from trackPremiumLocked: both
 *  are useful, but mixing them makes the funnel unreadable — impressions size
 *  the top of the desire funnel, locks measure actual intent. Same
 *  {surface, item} shape so the two slice identically in PostHog. */
export function trackPremiumGateShown(surface: string, item: string): void {
  trackEvent('premium_gate_shown', { surface, item });
}

/** Open the platform premium page in a new tab (room stays alive). */
export function openPremium(surface: string): void {
  trackEvent('premium_upsell_clicked', { surface });
  const hash = isNativeWrapper() ? '#trial' : '';
  window.open(`${PLATFORM_BASE}/premium?src=${PAGE_SRC}${hash}`, '_blank', 'noopener');
}
