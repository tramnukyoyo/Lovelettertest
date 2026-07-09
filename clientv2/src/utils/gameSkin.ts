/**
 * Effective in-game card-back skin resolution.
 *
 * `gameSkin` is a per-game cosmetic slot decoupled from the lobby `cardStyle`:
 * '' (default) follows the equipped cardStyle, 'none' explicitly opts out of
 * any card-back skin, and the four named values are the same premium set as
 * cardStyle. Mirrors the fleet-wide gameSkin resolution used by other games
 * (see BingoBuddies PlayerList.tsx / BingoPlayingScene.tsx resolveGameSkin).
 */
export function resolveGameSkin(p?: { cardStyle?: string; gameSkin?: string } | null): string {
  if (!p) return '';
  return p.gameSkin ? (p.gameSkin === 'none' ? '' : p.gameSkin) : (p.cardStyle || '');
}
