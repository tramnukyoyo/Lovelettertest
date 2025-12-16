import React, { useState, useEffect } from 'react';
import { UserMinus } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import type { Player } from '../types';

interface PlayerListProps {
  players: Player[];
  hostId: string;
  mySocketId: string;
  roomCode: string;
  socket: Socket;
  currentTurnPlayerId?: string | null;
  showSkipButton?: boolean;
  showReadyStatus?: boolean;
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

const DisconnectedTimer = ({ disconnectedAt }: { disconnectedAt: number }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const update = () => {
      const seconds = Math.max(0, 60 - Math.floor((Date.now() - disconnectedAt) / 1000));
      setTimeLeft(seconds);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [disconnectedAt]);

  if (timeLeft <= 0) return <div className="player-score">Removing...</div>;

  return (
    <div className="player-score">
      Removing in {timeLeft}s
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
  showReadyStatus = true,
}) => {
  const isHost = hostId === mySocketId;

  const handleKickPlayer = (playerId: string) => {
    if (!isHost) return;

    if (window.confirm('Are you sure you want to kick this player?')) {
      socket.emit('player:kick', { roomCode, playerId });
    }
  };

  const handleSkipTurn = () => {
    if (!isHost || !currentTurnPlayerId) return;

    if (window.confirm('Are you sure you want to skip this player\'s turn?')) {
      socket.emit('round:skip-turn', { roomCode });
    }
  };

  return (
    <div className="player-list-fixed">
      <div className="player-list-header">
        <h3>Players ({players.length})</h3>
        {isHost && showSkipButton && currentTurnPlayerId && (
          <button className="skip-turn-button" onClick={handleSkipTurn}>
            Skip Turn
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
              className={`player-item ${isMe ? 'is-me' : ''} ${isActive ? 'is-active' : ''} ${isHostPlayer ? 'is-host' : ''}`}
            >
              {renderAvatar(player)}

              <div className="player-content">
                <div className="player-name-row">
                  <span className="player-name">{player.name}</span>
                  <div className="player-badges">
                    {isHostPlayer && <span className="badge-host">HOST</span>}
                    {isMe && <span className="badge-you">YOU</span>}
                    {isActive && <span className="badge-active">ACTIVE</span>}
                    {player.premiumTier === 'lifetime' && (
                      <span className="badge-premium lifetime" title="Lifetime Premium">PREMIUM</span>
                    )}
                    {player.premiumTier === 'monthly' && (
                      <span className="badge-premium monthly" title="Pro Member">PRO</span>
                    )}
                    {/* Ready status - ThinkAlike specific feature */}
                    {showReadyStatus && !isHostPlayer && (
                      player.isReady ? (
                        <span className="badge-ready">READY</span>
                      ) : (
                        <span className="badge-not-ready">NOT READY</span>
                      )
                    )}
                  </div>
                </div>

                {/* isDisconnected && player.disconnectedAt && (
                  <DisconnectedTimer disconnectedAt={player.disconnectedAt} />
                ) */}

                {isDisconnected && <div className="player-score text-red-500">Disconnected</div>}

                {!isDisconnected && (
                  <div className="player-score">Tokens: {(player as any).tokens || 0}</div>
                )}
              </div>

              {isHost && !isMe && !isDisconnected && (
                <button
                  className="kick-button danger"
                  onClick={() => handleKickPlayer(player.socketId)}
                  title="Kick"
                  type="button"
                >
                  <UserMinus className="w-4 h-4" />
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
    prevProps.showReadyStatus === nextProps.showReadyStatus
  );
});

export default PlayerList;
