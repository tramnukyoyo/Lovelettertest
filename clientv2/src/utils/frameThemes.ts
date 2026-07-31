/**
 * Frame theme tokens — per-frame accent colors for game surfaces.
 *
 * Game-native surfaces that used to be tinted by the retired card styles
 * (revealed lies, boards, bars, …) now derive their look from the player's
 * equipped platform avatar frame. CSS surfaces consume the `.fr-theme-<id>`
 * token classes in styles/components/cosmetics.css (`--fr-accent`/`--fr-glow`);
 * canvas/3D surfaces read `accentHex` from this map (never parse CSS).
 *
 * Verbatim fleet copy — values mirror the frame ring colors in the platform's
 * cosmetics.css (Gamebuddies.Io); keep in sync when frames are added.
 */

export interface FrameTheme {
  /** CSS accent color of the frame ring. */
  accent: string;
  /** Same accent as a numeric hex for Phaser/three.js materials. */
  accentHex: number;
  /** Soft glow variant (accent at ~53% alpha). */
  glow: string;
  /** Secondary color for two-tone animated frames (undefined = single-tone). */
  accent2?: string;
}

export const FRAME_THEMES: Record<string, FrameTheme> = {
  frame_bronze:    { accent: '#cd7f32', accentHex: 0xcd7f32, glow: '#cd7f3288' },
  frame_silver:    { accent: '#c0c0c0', accentHex: 0xc0c0c0, glow: '#c0c0c088' },
  frame_gold:      { accent: '#ffd700', accentHex: 0xffd700, glow: '#ffd70088' },
  frame_sapphire:  { accent: '#1e88e5', accentHex: 0x1e88e5, glow: '#1e88e588' },
  frame_ruby:      { accent: '#e53935', accentHex: 0xe53935, glow: '#e5393588' },
  frame_emerald:   { accent: '#2ecc71', accentHex: 0x2ecc71, glow: '#2ecc7188' },
  frame_rosegold:  { accent: '#e8a89b', accentHex: 0xe8a89b, glow: '#e8a89b88' },
  frame_obsidian:  { accent: '#1c1c28', accentHex: 0x1c1c28, glow: '#9d4edd66', accent2: '#9d4edd' },
  frame_flame:     { accent: '#ff6b35', accentHex: 0xff6b35, glow: '#ff6b3588', accent2: '#ffe066' },
  frame_ice:       { accent: '#aee0ff', accentHex: 0xaee0ff, glow: '#aee0ff88', accent2: '#66c0ff' },
  frame_lightning: { accent: '#ffe066', accentHex: 0xffe066, glow: '#ffe06688', accent2: '#66e0ff' },
  frame_galaxy:    { accent: '#8a2be2', accentHex: 0x8a2be2, glow: '#8a2be288', accent2: '#00d9ff' },
  frame_prismatic: { accent: '#ffd700', accentHex: 0xffd700, glow: '#ffd70088', accent2: '#ff6ec7' },
  frame_diamond:   { accent: '#ffffff', accentHex: 0xffffff, glow: '#cfefff88' },
  frame_phoenix:   { accent: '#ffc04d', accentHex: 0xffc04d, glow: '#ff8a1e88', accent2: '#ff3d00' },
  frame_aurora:    { accent: '#7cffc4', accentHex: 0x7cffc4, glow: '#56e0a088', accent2: '#b388ff' },
};

/** Token class for a frame id (`fr-theme-frame_ruby`), '' when unframed/unknown. */
export function frameThemeClass(frameId: string | null | undefined): string {
  return frameId && FRAME_THEMES[frameId] ? `fr-theme-${frameId}` : '';
}
