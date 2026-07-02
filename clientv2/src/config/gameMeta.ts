/**
 * Game Metadata - Bluffalo
 */

export const GAME_META = {
  // Game identifier (matches namespace minus slash)
  id: 'prime-suspect',

  // Game name (displayed in header)
  name: 'Prime Suspect',

  // Split name for styled display (note the leading space on the accent so the
  // two halves render as "Prime Suspect" with the accent colour on "Suspect").
  namePrefix: 'Prime',
  nameAccent: ' Suspect',

  // Short description
  tagline: 'Risk, deduction, and luck. Solve the murder mystery!',

  // Full description
  description: 'Murder mystery card game - The host was murdered in a locked mansion. Unmask the killer!',

  // Mascot image alt text
  mascotAlt: 'Prime Suspect Mascot',

  // Game namespace (must match server plugin and vite.config.ts base)
  namespace: '/primesuspect',

  // Min/max players
  minPlayers: 2,
  maxPlayers: 4,

  // Game category (shown on homepage)
  category: 'Social Deduction',

  // Pass & Play support
  supportsPassPlay: true,
  passPlayMinPlayers: 2,
  passPlayHostPlays: true,
};
