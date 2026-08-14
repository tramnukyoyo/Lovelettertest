/**
 * Game-surface viewport hooks — the card-table layout's own thresholds.
 *
 * These are the pre-2026-08 `useIsMobile`/`useOrientation` implementations,
 * moved out of useIsMobile.ts UNCHANGED when the shell adopted the fleet
 * compact regime (767px/coarse-pointer matchMedia). The Hearts Gambit card
 * table keeps its historical semantics on purpose: HeartsGambitGame renders
 * `HeartsGambitGameMobile` and the desktop/mobile table + card-inspector rules
 * in styles/game/prime-suspect-ingame.css and prime-suspect-card-inspector.css
 * are calibrated against `width < 1024`. Do NOT swap these for the shell hooks
 * without re-auditing those rules — in-game behaviour must never change.
 */

import { useState, useEffect } from 'react';

/**
 * Mobile check for the CARD TABLE layout. Mobile is defined as viewport width
 * < 1024px (includes tablets). Byte-identical to the former useIsMobile so the
 * table + rail flip on the same pixel the game CSS is calibrated to.
 */
export const useGameIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    // Initial check
    checkIsMobile();

    // Listen for resize events
    window.addEventListener('resize', checkIsMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
};

/**
 * Screen orientation for the game surface (OrientationPrompt). Unchanged copy
 * of the former useOrientation.
 */
export const useGameOrientation = () => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const checkOrientation = () => {
      setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  return orientation;
};
