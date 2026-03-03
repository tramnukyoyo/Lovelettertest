import React, { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import { getTranslation, getCurrentLanguage } from '../utils/translations';
import PortalCloseOverlay from './PortalCloseOverlay';

interface Player {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface GameBuddiesReturnButtonProps {
  roomCode: string;
  socket: Socket;
  isHost?: boolean;
  /** When true, shows "GB Lobby" instead of "Return" and emits create-lobby event */
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

  // Handle return redirect from server (for non-host players)
  useEffect(() => {
    const handleReturnRedirect = (data: { returnUrl: string }) => {
      console.log('[GameBuddies] Received return-redirect:', data);
      setReturnUrl(data.returnUrl);
      setIsGroupReturn(true);
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

  const handlePortalComplete = () => {
    // Set returning flag for WelcomeBackOverlay
    sessionStorage.setItem('gamebuddies_returning', JSON.stringify({
      fromGame: true,
      roomCode,
      playerName: sessionStorage.getItem('gamebuddies_playerName') || '',
      isGroupReturn,
      timestamp: Date.now(),
    }));

    // Append ?returning=true for cross-domain detection (sessionStorage doesn't cross domains)
    try {
      const url = new URL(returnUrl);
      url.searchParams.set('returning', 'true');
      const pName = sessionStorage.getItem('gamebuddies_playerName') || '';
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

  // Icon variant for compact header display
  if (variant === 'icon') {
    return (
      <>
        <PortalCloseOverlay
          isVisible={showPortal}
          isGroupReturn={isGroupReturn}
          players={[]}
          onComplete={handlePortalComplete}
          duration={3000}
          logoUrl="https://dwrhhrhtsklskquipcci.supabase.co/storage/v1/object/public/game-thumbnails/primesuspect.webp"
        />
        <button
          onClick={handleReturn}
          disabled={isReturning}
          className="game-header-gb-btn"
          title={isStandalone ? 'Create a GameBuddies.io lobby' : isHost ? t('return.returnAllPlayersTitle') : t('return.returnToGameBuddies')}
        >
          {isStandalone ? <ExternalLink className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>
            {isReturning
              ? t('return.returning')
              : isStandalone
                ? 'GB Lobby'
                : isHost
                  ? t('return.returnAll') || 'Return All'
                  : 'GameBuddies.io'}
          </span>
        </button>
      </>
    );
  }

  // Button variant for lobby display
  return (
    <>
      <PortalCloseOverlay
        isVisible={showPortal}
        isGroupReturn={isGroupReturn}
        players={[]}
        onComplete={handlePortalComplete}
        duration={3000}
        logoUrl="https://dwrhhrhtsklskquipcci.supabase.co/storage/v1/object/public/game-thumbnails/primesuspect.webp"
      />
      <button
        onClick={handleReturn}
        disabled={isReturning}
        className="game-header-gb-btn"
        title={isStandalone ? 'Create a GameBuddies.io lobby' : isHost ? t('return.returnAllPlayersTitle') : t('return.returnToGameBuddies')}
      >
        {isStandalone ? <ExternalLink className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        <span>
          {isReturning
            ? t('return.returning')
            : isStandalone
              ? 'GB Lobby'
              : isHost
                ? t('return.returnAllPlayers')
                : t('return.returnToGameBuddies')}
        </span>
      </button>
    </>
  );
};

export default GameBuddiesReturnButton;
