/**
 * Google AdSense Configuration for Games
 *
 * SETUP: Same as main platform - update publisher ID after AdSense approval
 */

// Set to true once AdSense is approved
export const ADSENSE_ENABLED = false;

// Your AdSense Publisher ID
export const ADSENSE_PUBLISHER_ID = 'ca-pub-8974800579879060';

// Game-specific ad slots
export const AD_SLOTS = {
  GAME_RESULTS: '1234567896',      // Between-round results (deliberately unused — too short-lived)
  GAME_OVER: '1234567897',         // Game over screen (shared fleet-wide unit)
  BIGSCREEN_LOBBY: '1234567898',   // TV big-screen waiting lobby (room-premium gated)
} as const;
