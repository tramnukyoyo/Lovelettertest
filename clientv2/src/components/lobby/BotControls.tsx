/**
 * BotControls
 *
 * Lobby component for adding/removing bot opponents.
 * Host only, online mode only (not pass-play).
 */

import React, { useCallback } from 'react';
import { Bot, Trash2, UserPlus } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import type { Player } from '../../types';
import { getTranslation, getCurrentLanguage } from '../../utils/gameTranslations';

interface BotControlsProps {
  roomCode: string;
  players: Player[];
  isHost: boolean;
  maxPlayers: number;
  socket: Socket;
}

const MAX_BOTS = 3;

const BotControls: React.FC<BotControlsProps> = ({
  roomCode,
  players,
  isHost,
  maxPlayers,
  socket,
}) => {
  const language = getCurrentLanguage();
  const t = (key: string) => getTranslation(key as keyof typeof import('../../utils/gameTranslations').translations.en, language);
  const botPlayers = players.filter(p => p.isBot);

  const handleAddBot = useCallback(() => {
    socket.emit('bot:add', { roomCode });
  }, [socket, roomCode]);

  const handleRemoveBot = useCallback((playerId: string) => {
    socket.emit('bot:remove', { roomCode, playerId });
  }, [socket, roomCode]);

  if (!isHost) return null;

  return (
    <div className="bot-controls-section">
      <button
        className="bot-add-btn"
        onClick={handleAddBot}
        disabled={botPlayers.length >= MAX_BOTS || players.length >= maxPlayers}
        type="button"
      >
        <UserPlus size={16} />
        {t('botControls.addBot')}
      </button>

      {botPlayers.length > 0 && (
        <div className="bot-player-list">
          {botPlayers.map(bot => (
            <div key={bot.id} className="bot-player-item">
              <Bot size={14} style={{ opacity: 0.7 }} />
              <span className="bot-player-name">{bot.name}</span>
              <button
                className="bot-remove-btn"
                onClick={() => bot.id && handleRemoveBot(bot.id)}
                title={t('botControls.removeBot')}
                type="button"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BotControls;
