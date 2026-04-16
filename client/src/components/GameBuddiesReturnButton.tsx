import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import { getTranslation, getCurrentLanguage } from '../utils/translations';

interface Player {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface GameBuddiesReturnButtonProps {
  roomCode: string;
  socket: Socket;
  isHost?: boolean;
  /** When true, emits create-lobby instead of a room return */
  isStandalone?: boolean;
  /** Pass through streamer mode so the new GB lobby preserves it */
  streamerMode?: boolean;
  variant?: 'button' | 'icon'; // 'button' for lobby, 'icon' for compact gameplay display
  players?: Player[];
}

const GameBuddiesReturnButton: React.FC<GameBuddiesReturnButtonProps> = ({
  roomCode,
  socket,
  isHost = false,
  isStandalone = false,
  streamerMode = false,
  variant = 'button',
  players: _players = [],
}) => {
  const language = getCurrentLanguage();
  const t = (key: string) => getTranslation(key as any, language);
  const [isReturning, setIsReturning] = useState(false);

  // Handle return redirect from server (for non-host players)
  useEffect(() => {
    const handleReturnRedirect = (data: { returnUrl: string }) => {
      if (!data.returnUrl) return;
      window.location.replace(data.returnUrl);
    };

    socket.on('gamebuddies:return-redirect', handleReturnRedirect);

    return () => {
      socket.off('gamebuddies:return-redirect', handleReturnRedirect);
    };
  }, [socket]);

  // Listen for lobby redirect (standalone → GB.io flow)
  useEffect(() => {
    const handleLobbyRedirect = (data: { redirectUrl: string }) => {
      if (!data.redirectUrl) return;
      window.location.replace(data.redirectUrl);
    };

    socket.on('gamebuddies:lobby-redirect', handleLobbyRedirect);

    return () => {
      socket.off('gamebuddies:lobby-redirect', handleLobbyRedirect);
    };
  }, [socket]);

  const handleReturn = () => {
    if (isReturning) return;
    setIsReturning(true);

    if (isStandalone) {
      socket.emit('gamebuddies:create-lobby', { roomCode, streamerMode });
      return;
    }

    socket.emit('gamebuddies:return', {
      roomCode,
      mode: isHost ? 'group' : 'individual',
      reason: 'user_initiated'
    });
  };

  const title = isStandalone
    ? t('lobby.createGBLobby')
    : t('lobby.returnToGB');

  const labelContent = isReturning ? (
    <span>{isStandalone ? t('lobby.opening') : t('lobby.returning')}</span>
  ) : (
    <span className="gb-return-label">
      <span className="gb-return-main">{t('lobby.returnAll')}</span>
      <span className="gb-return-sub">gamebuddies.io</span>
    </span>
  );

  // Icon variant for compact header display
  if (variant === 'icon') {
    return (
      <button
        onClick={handleReturn}
        disabled={isReturning}
        className="game-header-gb-btn"
        title={title}
      >
        <ArrowLeft size={16} />
        {labelContent}
      </button>
    );
  }

  // Button variant for lobby display
  return (
    <button
      onClick={handleReturn}
      disabled={isReturning}
      className="game-header-gb-btn"
      title={title}
    >
      <ArrowLeft size={16} />
      {labelContent}
    </button>
  );
};

export default GameBuddiesReturnButton;
