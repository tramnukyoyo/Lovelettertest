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

interface BotControlsProps {
  roomCode: string;
  players: Player[];
  isHost: boolean;
  maxPlayers: number;
  socket: Socket;
}

const BotControls: React.FC<BotControlsProps> = ({
  roomCode,
  players,
  isHost,
  maxPlayers,
  socket,
}) => {
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
        disabled={players.length >= maxPlayers}
        type="button"
      >
        <UserPlus className="w-4 h-4" />
        Add Bot
      </button>

      {botPlayers.length > 0 && (
        <div className="bot-player-list">
          {botPlayers.map(bot => (
            <div key={bot.id} className="bot-player-item">
              <Bot className="w-3.5 h-3.5" style={{ opacity: 0.7 }} />
              <span className="bot-player-name">{bot.name}</span>
              <button
                className="bot-remove-btn"
                onClick={() => bot.id && handleRemoveBot(bot.id)}
                title="Remove bot"
                type="button"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BotControls;
