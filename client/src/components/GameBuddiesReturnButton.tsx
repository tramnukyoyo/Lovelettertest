import React, { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { getCurrentSession } from '../services/gameBuddiesSession';

interface GameBuddiesReturnButtonProps {
  roomCode: string;
  socket: Socket;
  isHost?: boolean;
  variant?: 'button' | 'icon'; // 'button' for lobby, 'icon' for compact gameplay display
}

const GameBuddiesReturnButton: React.FC<GameBuddiesReturnButtonProps> = ({
  roomCode,
  socket,
  isHost = false,
  variant = 'button'
}) => {
  const [isReturning, setIsReturning] = useState(false);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const handleReturnRedirect = (data: { returnUrl: string }) => {
      console.log('[GameBuddies] Received return-redirect:', data);
      setIsReturning(true);

      // Countdown before redirect
      let count = 3;
      const interval = setInterval(() => {
        count--;
        setCountdown(count);

        if (count <= 0) {
          clearInterval(interval);
          window.location.href = data.returnUrl;
        }
      }, 1000);
    };

    socket.on('gamebuddies:return-redirect', handleReturnRedirect);

    return () => {
      socket.off('gamebuddies:return-redirect', handleReturnRedirect);
    };
  }, [socket]);

  const handleReturn = () => {
    console.log('[GameBuddies] Return clicked', { isHost });
    setIsReturning(true);

    // Emit socket event to server (server will handle API call securely)
    socket.emit('gamebuddies:return', {
      roomCode,
      mode: isHost ? 'group' : 'individual',
      reason: isHost ? 'Host initiated return' : 'Player returning to lobby'
    });
  };

  // Check if launched from GameBuddies
  const session = getCurrentSession();
  const isGameBuddiesLaunched = session?.source === 'gamebuddies';

  // Don't show button if not launched from GameBuddies
  if (!isGameBuddiesLaunched) {
    return null;
  }

  if (isReturning) {
    return (
      <div
        className="gamebuddies-return-countdown"
        style={{
          background: 'linear-gradient(135deg, rgba(92, 244, 255, 0.15), rgba(177, 140, 255, 0.15))',
          border: '2px solid rgba(92, 244, 255, 0.4)',
          padding: '20px',
          borderRadius: '12px',
          color: '#5cf4ff',
          textAlign: 'center',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(92, 244, 255, 0.2)'
        }}
      >
        <p style={{
          fontSize: '1rem',
          marginBottom: '15px',
          fontWeight: '600',
          letterSpacing: '0.1em',
          textTransform: 'uppercase'
        }}>
          Returning to GameBuddies...
        </p>
        <p style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          color: '#b18cff',
          margin: 0
        }}>
          {countdown}
        </p>
      </div>
    );
  }

  // Icon variant for compact gameplay display (beside lives)
  if (variant === 'icon') {
    return (
      <button
        onClick={handleReturn}
        title="Return all players to GameBuddies"
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300"
        style={{
          background: 'linear-gradient(135deg, rgba(92, 244, 255, 0.2), rgba(177, 140, 255, 0.2))',
          border: '1px solid rgba(92, 244, 255, 0.4)',
          color: '#5cf4ff',
          fontSize: '0.875rem',
          fontWeight: '600',
          cursor: 'pointer',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(92, 244, 255, 0.3), rgba(177, 140, 255, 0.3))';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(92, 244, 255, 0.6)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(92, 244, 255, 0.2), rgba(177, 140, 255, 0.2))';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(92, 244, 255, 0.4)';
        }}
      >
        <span>←</span>
        <span>GameBuddies</span>
      </button>
    );
  }

  // Button variant for lobby display
  return (
    <div className="gamebuddies-return">
      <button
        onClick={handleReturn}
        style={{
          background: 'linear-gradient(135deg, #5cf4ff 0%, #b18cff 100%)',
          color: '#001a1a',
          border: 'none',
          borderRadius: '10px',
          padding: '15px 30px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(92, 244, 255, 0.3)',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 30px rgba(92, 244, 255, 0.5)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 15px rgba(92, 244, 255, 0.3)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        }}
      >
        ← {isHost ? 'Return All Players to GameBuddies' : 'Return to GameBuddies'}
      </button>
    </div>
  );
};

export default GameBuddiesReturnButton;