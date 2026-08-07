/**
 * GuestBriefingPanel — the BRIEFING pane's guest half.
 *
 * Fleet lobby standard (docs/FLEET_LOBBY_STANDARD.md, rule 6): a non-host must
 * never face an empty briefing pane. Where other games mirror the host's chosen
 * settings, Prime Suspect's host panel deliberately exposes NO gameplay setting
 * (the hearts-gambit plugin registers no `settings:update` handler), so the
 * read-only summary is built from ROOM FACTS instead: the case being played,
 * the table size, and the token target that ends it.
 *
 * Everything here is derived from `lobby` — no socket events, no new state, no
 * controls. It updates live because the token target follows the seat count,
 * exactly like the server's own `getTokensToWin`.
 *
 * Copy is borrowed from the existing rules/explainer keys on purpose (see the
 * copy requests filed with this change); nothing new is invented locally.
 */

import React from 'react';
import type { Lobby } from '../../types';
import { GAME_META } from '../../config/gameMeta';
import { getTranslation, getCurrentLanguage } from '../../utils/gameTranslations';

interface GuestBriefingPanelProps {
  lobby: Lobby;
  /**
   * Host-only controls, filed UNDER the case facts.
   *
   * The folder used to open on ADD BOT and a "sign in to save your settings"
   * upsell, with the case itself pushed to the bottom (and, at 1366, off the
   * bottom). The briefing is the folder's subject, so it renders first and the
   * host's controls are a slot between the last briefing line and the wax
   * seal — the folder still CLOSES on its own designed edge.
   */
  footerSlot?: React.ReactNode;
}

/**
 * Client mirror of the server's token target (plugin.ts `getTokensToWin`,
 * also mirrored in VictoryScreen). Display only — the server stays the
 * authority; this never writes anything.
 */
function tokensToWin(playerCount: number): number {
  if (playerCount <= 2) return 7;
  if (playerCount === 3) return 5;
  return 4;
}

/**
 * The circled "?" of the scene header's help button, inline. The sentence
 * "Full briefing in the ? button" is the only navigational instruction on the
 * surface, and as a bare typewriter line it pointed at a control the eye had
 * to hunt for. Drawn (not an emoji, not a font glyph — owner rule 7) so the
 * sentence names an OBJECT that looks like the thing it names.
 */
const HelpChip: React.FC = () => (
  <svg
    className="ps-brief-more__chip"
    viewBox="0 0 16 16"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="8" cy="8" r="6.4" />
    <path d="M6.3 6.2a1.75 1.75 0 1 1 2.4 1.62c-.45.2-.7.6-.7 1.08v.35" />
    <path d="M8 11.5h.01" />
  </svg>
);

const GuestBriefingPanel: React.FC<GuestBriefingPanelProps> = ({ lobby, footerSlot }) => {
  const language = getCurrentLanguage();
  const t = (key: Parameters<typeof getTranslation>[0]) => getTranslation(key, language);

  // Seats that will actually be dealt in (the TV/spectator seats are displays).
  const seated = lobby.players.filter(p => !p.isBigScreen && !p.isSpectator && p.connected).length;
  const target = tokensToWin(Math.max(seated, GAME_META.minPlayers));

  return (
    <div className="ps-host-settings ps-brief">
      <h3 className="ps-settings-title">{t('briefing.title')}</h3>

      <dl className="ps-brief-rows">
        <div className="ps-brief-row">
          <dt className="ps-brief-label">{t('briefing.playersLabel')}</dt>
          <dd className="ps-brief-value">{GAME_META.minPlayers}–{GAME_META.maxPlayers}</dd>
        </div>
        <div className="ps-brief-row">
          <dt className="ps-brief-label">{t('briefing.tokensLabel')}</dt>
          <dd className="ps-brief-value">{target}</dd>
        </div>
      </dl>

      {/* How-to teaser — the three beats of a turn, in the explainer's own
          words. The full briefing stays in the ?-modal (one-viewport rule 7). */}
      <p className="ps-brief-teaser">{t('briefing.teaser')}</p>
      <ol className="ps-brief-steps">
        <li>{t('briefing.step1')}</li>
        <li>{t('briefing.step2')}</li>
        <li>{t('briefing.step3')}</li>
      </ol>
      <p className="ps-brief-more">
        <HelpChip />
        <span>{t('briefing.openFullBriefing')}</span>
      </p>

      {/* Host controls, filed under the case facts (see footerSlot). */}
      {footerSlot && <div className="ps-brief-controls">{footerSlot}</div>}

      {/* The folder CLOSES instead of trailing off into empty velvet: two ruled
          evidence lines and a wax CASE OPEN seal, the same dossier idiom the
          seat cards end on. Pure decoration (aria-hidden, text set in CSS like
          the CASE FILE folder tab), so it adds no translatable string. */}
      <div className="ps-brief-close" aria-hidden="true">
        <span className="ps-brief-close-rule" />
        <span className="ps-brief-close-rule" />
        <span className="ps-brief-seal" />
      </div>
    </div>
  );
};

export default GuestBriefingPanel;
