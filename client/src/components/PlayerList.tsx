import React, { useState, useEffect } from 'react';
import { UserMinus } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import type { Player } from '../types';
import { getTranslation, getCurrentLanguage } from '../utils/translations';

interface PlayerListProps {
  players: Player[];
  hostId: string;
  mySocketId: string;
  roomCode: string;
  socket: Socket;
  currentTurnPlayerId?: string | null;
  showSkipButton?: boolean;
  isSpectator?: boolean;
  viewingAsSocketId?: string | null;
  onPlayerClick?: (socketId: string) => void;
}

const FALLBACK_AVATAR_URL = 'https://dwrhhrhtsklskquipcci.supabase.co/storage/v1/object/public/game-thumbnails/Gabu.webp';

const renderAvatar = (player: Player) => {
  const avatarSrc = player.avatarUrl || FALLBACK_AVATAR_URL;

  return (
    <div className="player-avatar">
      <img
        src={avatarSrc}
        alt={player.name}
        onError={(e) => {
          // Only switch to fallback once to avoid infinite loop
          if (e.currentTarget.src !== FALLBACK_AVATAR_URL) {
            e.currentTarget.src = FALLBACK_AVATAR_URL;
          }
        }}
      />
    </div>
  );
};

const DisconnectedTimer = ({ disconnectedAt, t }: { disconnectedAt: number; t: (key: string) => string }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const update = () => {
      const seconds = Math.max(0, 30 - Math.floor((Date.now() - disconnectedAt) / 1000));
      setTimeLeft(seconds);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [disconnectedAt]);

  if (timeLeft <= 0) return <div className="player-score">{t('playerList.removing')}</div>;

  return (
    <div className="player-score">
      {t('playerList.removingIn').replace('{seconds}', String(timeLeft))}
    </div>
  );
};

const PlayerListComponent: React.FC<PlayerListProps> = ({
  players,
  hostId,
  mySocketId,
  roomCode,
  socket,
  currentTurnPlayerId,
  showSkipButton = false,
  isSpectator = false,
  viewingAsSocketId,
  onPlayerClick,
}) => {
  const me = players.find(p => p.socketId === mySocketId);
  const isHost = me?.isHost || false;
  const language = getCurrentLanguage();
  const t = (key: string) => getTranslation(key as keyof typeof import('../utils/translations').translations.en, language);

  const handleKickPlayer = (playerSocketId: string) => {
    if (!isHost) return;
    const target = players.find(p => p.socketId === playerSocketId);
    if (!target) return;

    if (window.confirm(t('playerList.confirmKick'))) {
      socket.emit('player:kick', { roomCode, playerId: target.id });
    }
  };

  const handleSkipTurn = () => {
    if (!isHost || !currentTurnPlayerId) return;

    if (window.confirm(t('playerList.confirmSkipTurn'))) {
      socket.emit('round:skip-turn', { roomCode });
    }
  };

  return (
    <div className="player-list-fixed">
      <div className="player-list-header">
        <h3>{t('playerList.players')} ({players.length})</h3>
        {isHost && showSkipButton && currentTurnPlayerId && (
          <button className="skip-turn-button" onClick={handleSkipTurn}>
            {t('playerList.skipTurn')}
          </button>
        )}
      </div>

      <div className="player-list-items">
        {players.map((player) => {
          const isMe = player.socketId === mySocketId;
          const isDisconnected = !player.connected;
          const isActive = currentTurnPlayerId === player.socketId;
          const isHostPlayer = player.isHost;

          return (
            <div
              key={player.id || player.socketId}
              className={`player-item ${isMe ? 'is-me' : ''} ${isActive ? 'is-active' : ''} ${isHostPlayer ? 'is-host' : ''} ${isDisconnected ? 'disconnected-player' : ''} ${isSpectator && !isMe ? 'spectator-player-clickable' : ''} ${viewingAsSocketId === player.socketId ? 'spectator-player-active' : ''}`}
              onClick={() => isSpectator && !isMe && onPlayerClick?.(player.socketId)}
            >
              {renderAvatar(player)}

              <div className="player-content">
                <div className="player-name-row">
                  <span className="player-name">{player.name}</span>
                  <div className="player-badges">
                    {isHostPlayer && <span className="badge-host">{t('playerList.host')}</span>}
                    {isMe && <span className="badge-you">{t('playerList.you')}</span>}
                    {isActive && <span className="badge-active">{t('playerList.active')}</span>}
                    {player.premiumTier === 'lifetime' && (
                      <span className="badge-premium lifetime" title={t('playerList.premium')}>{t('playerList.premium')}</span>
                    )}
                    {player.premiumTier === 'monthly' && (
                      <span className="badge-premium monthly" title={t('playerList.pro')}>{t('playerList.pro')}</span>
                    )}
                  </div>
                </div>

                {isDisconnected && player.disconnectedAt && (
                  <DisconnectedTimer disconnectedAt={player.disconnectedAt} t={t} />
                )}

                {isDisconnected && !player.disconnectedAt && <div className="player-score text-red-500">{t('playerList.disconnected')}</div>}

                {!isDisconnected && (
                  <div className="player-score">{t('playerList.tokens').replace('{tokens}', String((player as any).tokens || 0))}</div>
                )}
              </div>

              {isHost && !isMe && !isDisconnected && (
                <button
                  className="kick-button danger"
                  onClick={() => handleKickPlayer(player.socketId)}
                  title={t('playerList.kick')}
                  type="button"
                >
                  <UserMinus size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
const PlayerList = React.memo<PlayerListProps>(PlayerListComponent, (prevProps, nextProps) => {
  // Custom comparison - re-render only if these props change
  return (
    prevProps.players === nextProps.players &&
    prevProps.hostId === nextProps.hostId &&
    prevProps.mySocketId === nextProps.mySocketId &&
    prevProps.roomCode === nextProps.roomCode &&
    prevProps.currentTurnPlayerId === nextProps.currentTurnPlayerId &&
    prevProps.showSkipButton === nextProps.showSkipButton &&
    prevProps.isSpectator === nextProps.isSpectator &&
    prevProps.viewingAsSocketId === nextProps.viewingAsSocketId
  );
});

export default PlayerList;
