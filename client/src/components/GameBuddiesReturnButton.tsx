import React, { useEffect, useState } from 'react';
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

    window.location.href = returnUrl;
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

  console.log('[GB-DEBUG] PrimeSuspect GameBuddiesReturnButton rendered', { roomCode, isHost, variant });

  // Icon variant for compact gameplay display (beside lives)
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
          title={t('return.returnAllPlayersTitle')}
          className="game-header-back-btn"
          style={{
            background: isReturning
              ? 'rgba(100, 100, 100, 0.2)'
              : 'rgba(92, 244, 255, 0.15)',
            border: '1px solid rgba(92, 244, 255, 0.4)',
            color: '#5cf4ff',
            cursor: isReturning ? 'not-allowed' : 'pointer',
            opacity: isReturning ? 0.7 : 1,
          }}
        >
          <span>←</span>
          <span>{isReturning ? t('return.returning') : (isStandalone ? 'GB Lobby' : t('return.returnToGameBuddies'))}</span>
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
      <div className="gamebuddies-return">
        <button
          onClick={handleReturn}
          disabled={isReturning}
          style={{
            background: isReturning
              ? 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)'
              : 'linear-gradient(135deg, #5cf4ff 0%, #b18cff 100%)',
            color: '#001a1a',
            border: 'none',
            borderRadius: '10px',
            padding: '15px 30px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: isReturning ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 15px rgba(92, 244, 255, 0.3)',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            transition: 'all 0.3s ease',
            opacity: isReturning ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isReturning) {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 30px rgba(92, 244, 255, 0.5)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isReturning) {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 15px rgba(92, 244, 255, 0.3)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }
          }}
        >
          ← {isReturning
            ? t('return.returning')
            : isStandalone
              ? 'GB Lobby'
              : isHost
                ? t('return.returnAllPlayers')
                : t('return.returnToGameBuddies')}
        </button>
      </div>
    </>
  );
};

export default GameBuddiesReturnButton;
