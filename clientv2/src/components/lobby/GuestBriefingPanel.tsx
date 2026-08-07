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

const GuestBriefingPanel: React.FC<GuestBriefingPanelProps> = ({ lobby }) => {
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
      <p className="ps-brief-more">{t('briefing.openFullBriefing')}</p>

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
