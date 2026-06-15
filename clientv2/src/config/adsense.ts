/**
 * Google AdSense Configuration for Games
 *
 * SETUP: Same as main platform - update publisher ID after AdSense approval
 */

// Set to true once AdSense is approved
export const ADSENSE_ENABLED = false;

// Your AdSense Publisher ID
export const ADSENSE_PUBLISHER_ID = 'ca-pub-XXXXXXXXXXXXXXXX';

// Game-specific ad slots
export const AD_SLOTS = {
  GAME_RESULTS: '1234567896',      // Between-round results
  GAME_OVER: '1234567897',         // Game over screen
} as const;
