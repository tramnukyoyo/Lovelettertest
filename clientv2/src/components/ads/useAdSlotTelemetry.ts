import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { trackEvent } from '../../services/analyticsService';

/** Why a slot would not have served a real ad, or null if it would have. */
export type AdBlockedBy = 'ads_disabled' | 'premium' | 'adblock' | 'frequency_cap' | null;

interface Options {
  /** The slot's DOM anchor. GameAdRectangle always renders one, even when empty. */
  ref: RefObject<HTMLElement | null>;
  /** Slot name — the placement, e.g. 'game_over' or 'bigscreen_lobby'. */
  slot: string;
  wouldServe: boolean;
  blockedBy: AdBlockedBy;
  enabled: boolean;
}

/**
 * Report one `ad_slot_shown` per slot instance, the first time it enters the viewport.
 *
 * Threshold is 0, not 0.5, on purpose: while ads are off the anchor is zero-area, and
 * a zero-area target can never satisfy a 0.5 ratio — a stricter threshold would record
 * nothing on exactly the slots we need to size. `slot_h` distinguishes a collapsed
 * anchor from a real reserved slot, so this can be tightened to true 50 %-viewability
 * once ads actually render.
 *
 * `game` is attached automatically by the analytics service.
 */
export function useAdSlotTelemetry({ ref, slot, wouldServe, blockedBy, enabled }: Options): void {
  const fired = useRef(false);

  useEffect(() => {
    if (!enabled || fired.current) return;
    const el = ref.current;
    if (!el) return;

    const fire = () => {
      if (fired.current) return;
      fired.current = true;
      trackEvent('ad_slot_shown', {
        slot,
        ad_type: 'rectangle',
        would_serve: wouldServe,
        blocked_by: blockedBy,
        slot_h: el.offsetHeight,
        viewport_w: window.innerWidth,
      });
    };

    if (typeof IntersectionObserver === 'undefined') {
      fire();
      return;
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          fire();
          observer.disconnect();
        }
      },
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, slot, wouldServe, blockedBy, ref]);
}

export default useAdSlotTelemetry;
