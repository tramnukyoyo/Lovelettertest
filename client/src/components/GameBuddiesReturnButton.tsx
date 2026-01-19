import React, { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { getCurrentSession } from '../services/gameBuddiesSession';
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
  variant?: 'button' | 'icon'; // 'button' for lobby, 'icon' for compact gameplay display
  players?: Player[];
}

const GameBuddiesReturnButton: React.FC<GameBuddiesReturnButtonProps> = ({
  roomCode,
  socket,
  isHost = false,
  variant = 'button',
  players = [],
}) => {
  const [isReturning, setIsReturning] = useState(false);
  const [showPortal, setShowPortal] = useState(false);
  const [isGroupReturn, setIsGroupReturn] = useState(false);
  const [returnUrl, setReturnUrl] = useState('https://gamebuddies.io');
  const language = getCurrentLanguage();
  const t = (key: Parameters<typeof getTranslation>[0]) => getTranslation(key, language);

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

    console.log('[GameBuddies] Return clicked', { isHost });
    setIsReturning(true);

    // Get return URL from session
    const storedReturnUrl = sessionStorage.getItem('gamebuddies_returnUrl') ||
      `https://gamebuddies.io/lobby/${roomCode}`;
    setReturnUrl(storedReturnUrl);

    if (isHost) {
      setIsGroupReturn(true);
      // Emit socket event to server (server will handle API call securely)
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

  // Check if launched from GameBuddies
  const session = getCurrentSession();
  const isGameBuddiesLaunched = session?.source === 'gamebuddies';

  // Don't show button if not launched from GameBuddies
  if (!isGameBuddiesLaunched) {
    return null;
  }

  // Icon variant for compact gameplay display (beside lives)
  if (variant === 'icon') {
    return (
      <>
        <PortalCloseOverlay
          isVisible={showPortal}
          isGroupReturn={isGroupReturn}
          players={players}
          onComplete={handlePortalComplete}
          duration={3000}
        />
        <button
          onClick={handleReturn}
          disabled={isReturning}
          title={t('gamebuddies.returnAllPlayersTitle')}
          className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300"
          style={{
            background: isReturning
              ? 'linear-gradient(135deg, rgba(100, 100, 100, 0.2), rgba(80, 80, 80, 0.2))'
              : 'linear-gradient(135deg, rgba(92, 244, 255, 0.2), rgba(177, 140, 255, 0.2))',
            border: '1px solid rgba(92, 244, 255, 0.4)',
            color: '#5cf4ff',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: isReturning ? 'not-allowed' : 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            opacity: isReturning ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isReturning) {
              (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(92, 244, 255, 0.3), rgba(177, 140, 255, 0.3))';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(92, 244, 255, 0.6)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isReturning) {
              (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(92, 244, 255, 0.2), rgba(177, 140, 255, 0.2))';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(92, 244, 255, 0.4)';
            }
          }}
        >
          <span>←</span>
          <span>{isReturning ? 'Returning...' : 'GameBuddies'}</span>
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
        players={players}
        onComplete={handlePortalComplete}
        duration={3000}
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
            ? 'Returning...'
            : isHost
              ? t('gamebuddies.returnAllPlayers')
              : t('gamebuddies.returnToGameBuddies')}
        </button>
      </div>
    </>
  );
};

export default GameBuddiesReturnButton;
