/**
 * HostSettings - Host-only lobby configuration for Prime Suspect.
 *
 * Prime Suspect has no host-tunable game setting wired through the server's
 * socket layer: the hearts-gambit plugin registers NO `settings:update`
 * handler, so a `tokensToWin` slider here would be a dead control (the server
 * never reads it off a settings:update payload — it only honours a non-zero
 * `room.settings.gameSpecific.tokensToWin`, which is only ever 0/auto). So the
 * host panel just surfaces bot opponents + a short note. Mirrors Bluffalo's
 * HostSettings structure (host-only, single right-card panel).
 */

import React from 'react';
import type { Socket } from 'socket.io-client';
import type { Lobby } from '../../types';
import { GAME_META } from '../../config/gameMeta';
import { getTranslation, getCurrentLanguage } from '../../utils/gameTranslations';
import BotControls from './BotControls';

interface HostSettingsProps {
  lobby: Lobby;
  socket: Socket;
  isHost: boolean;
}

const HostSettings: React.FC<HostSettingsProps> = ({ lobby, socket, isHost }) => {
  const language = getCurrentLanguage();
  const t = (key: Parameters<typeof getTranslation>[0]) => getTranslation(key, language);

  if (!isHost) return null;

  return (
    <div className="ps-host-settings">
      <h3 className="ps-settings-title">{t('settings.title')}</h3>

      {/* Bots — only in online mode (not pass & play) */}
      {lobby.settings?.gameType !== 'pass-play' && (
        <div className="ps-setting-group">
          <BotControls
            roomCode={lobby.code}
            players={lobby.players}
            isHost={true}
            maxPlayers={lobby.settings?.maxPlayers || GAME_META.maxPlayers}
            socket={socket}
          />
        </div>
      )}
    </div>
  );
};

export default HostSettings;
