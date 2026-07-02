/**
 * Platform cosmetics helpers.
 *
 * The cosmetics catalog is owned by the platform
 * (Gamebuddies.Io/shared/constants/cosmetics.ts). Games only receive equipped
 * item IDs (e.g. `flair_rainbow`, `frame_gold`, `banner_dawn`) and render them
 * with the CSS classes in styles/components/cosmetics.css (copied from the
 * platform's cosmetics.css — keep in sync when the catalog grows).
 *
 * Catalog convention: cssClass = item id with underscores turned into dashes
 * (`flair_premium_aura` → `flair-premium-aura`), which holds for every item.
 */

export function cosmeticClass(itemId: string | null | undefined): string {
  if (!itemId) return '';
  if (!/^(flair|frame|banner)_[a-z0-9_]+$/.test(itemId)) return '';
  return itemId.replace(/_/g, '-');
}
