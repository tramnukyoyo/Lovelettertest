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
  const [showPortal, setShowPortal] = useState(false);
  const [isGroupReturn, setIsGroupReturn] = useState(false);
  const [returnUrl, setReturnUrl] = useState('https://gamebuddies.io');
  const [returnPlayerName, setReturnPlayerName] = useState('');

  // Handle return redirect from server (for non-host players)
  useEffect(() => {
    const handleReturnRedirect = (data: { returnUrl: string; playerNames?: Record<string, string> }) => {
      console.log('[GameBuddies] Received return-redirect:', data);
      setReturnUrl(data.returnUrl);
      setIsGroupReturn(true);
      const myName = data.playerNames?.[socket?.id || ''] || '';
      if (myName) setReturnPlayerName(myName);
      setShowPortal(true);
    };

    socket.on('gamebuddies:return-redirect', handleReturnRedirect);

    return () => {
      socket.off('gamebuddies:return-redirect', handleReturnRedirect);
    };
  }, [socket]);

  // Listen for lobby redirect (standalone → GB.io flow)
  useEffect(() => {
    const handleLobbyRedirect = (data: { redirectUrl: string }) => {
      console.log('[GameBuddies] Received lobby-redirect:', data);
      setReturnUrl(data.redirectUrl);
      setIsGroupReturn(false);
      setShowPortal(true);
    };

    socket.on('gamebuddies:lobby-redirect', handleLobbyRedirect);

    return () => {
      socket.off('gamebuddies:lobby-redirect', handleLobbyRedirect);
    };
  }, [socket]);

  useEffect(() => {
    if (showPortal) handlePortalComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPortal]);

  const handlePortalComplete = () => {
    // Set returning flag for WelcomeBackOverlay
    sessionStorage.setItem('gamebuddies_returning', JSON.stringify({
      fromGame: true,
      roomCode,
      playerName: sessionStorage.getItem('gamebuddies_playerName') || returnPlayerName || '',
      isGroupReturn,
      timestamp: Date.now(),
    }));

    // Append ?returning=true for cross-domain detection (sessionStorage doesn't cross domains)
    try {
      const url = new URL(returnUrl);
      url.searchParams.set('returning', 'true');
      const pName = sessionStorage.getItem('gamebuddies_playerName') || returnPlayerName || '';
      if (pName) url.searchParams.set('returningPlayer', pName);
      console.log('[GameBuddies] Redirecting with returning=true:', url.toString());
      window.location.href = url.toString();
    } catch {
      window.location.href = returnUrl;
    }
  };

  const handleReturn = () => {
    if (isReturning) return;

    if (isStandalone) {
      console.log('[GameBuddies] Standalone mode: creating GB lobby');
      socket.emit('gamebuddies:create-lobby', { roomCode, streamerMode });
      return;
    }

    console.log('[GameBuddies] Return clicked', { isHost });
    setIsReturning(true);

    // Get return URL from session
    const storedReturnUrl = sessionStorage.getItem('gamebuddies_returnUrl') ||
      `https://gamebuddies.io/lobby/${roomCode}`;
    setReturnUrl(storedReturnUrl);

    if (isHost) {
      setIsGroupReturn(true);
      socket.emit('gamebuddies:return', {
        roomCode,
        mode: 'group',
        reason: 'Host initiated return'
      });
    } else {
      setIsGroupReturn(false);
      socket.emit('gamebuddies:return', {
        roomCode,
        mode: 'individual',
        reason: 'Player returning to lobby'
      });
    }

    setShowPortal(true);
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
