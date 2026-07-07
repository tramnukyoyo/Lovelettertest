/**
 * LegalFooter — minimal legal-compliance footer for the game client HOMEPAGE.
 *
 * German § 5 DDG requires the Impressum to be "leicht erkennbar, unmittelbar
 * erreichbar, ständig verfügbar" from every page, and DSGVO Art. 13 requires a
 * reachable privacy policy where personal data is collected. Game clients are
 * served same-origin under gamebuddies.io/<game> and can be landed on directly
 * (QR / invite link / typed URL), so they need their own reachable link to the
 * platform's Impressum / Datenschutz / Terms pages.
 *
 * Placement split (so the immersive lobby/fullscreen game stays uncluttered):
 *   - Homepage landing  → this visible footer (rendered at the bottom of HomePage).
 *   - Lobby + in-game/fullscreen → the same links live in the Settings ⚙ modal,
 *     reachable in 2 clicks from every screen WITHOUT leaving the room. The
 *     "2-Klick-Regel" (BGH) makes a menu-reachable Impressum sufficient, so a
 *     footer on every screen is not required.
 *
 * Absolute gamebuddies.io URLs + target="_blank" so the links resolve identically
 * whether the client is proxied under gamebuddies.io/<game>, hosted directly, or
 * running in dev — and never navigate away from an in-progress room.
 *
 * Deliberately self-contained (inline styles with theme-var fallbacks, hardcoded
 * labels, no CSS/i18n imports) so it can be copy-pasted verbatim into every game
 * client. This Lightwall copy is the canonical source; keep it in sync with the
 * Settings-modal legal links.
 */
import React from 'react';
import { t } from '../../utils/translations';

const LINKS: ReadonlyArray<{ href: string; labelKey: string }> = [
  { href: 'https://gamebuddies.io/impressum', labelKey: 'legal.impressum' },
  { href: 'https://gamebuddies.io/datenschutz', labelKey: 'legal.privacy' },
  { href: 'https://gamebuddies.io/terms', labelKey: 'legal.terms' },
];

const LegalFooter: React.FC = () => (
  <footer className="legal-footer">
    <span className="legal-footer__brand">© {new Date().getFullYear()} GameBuddies.io</span>
    {LINKS.map(({ href, labelKey }) => (
      <a key={href} className="legal-link" href={href} target="_blank" rel="noopener noreferrer">
        {t(labelKey)}
      </a>
    ))}
  </footer>
);

export default LegalFooter;
