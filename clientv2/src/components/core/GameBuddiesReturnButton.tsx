/**
 * GameBuddies Return Button
 *
 * Button to return to GameBuddies.io platform.
 * - In GB mode: returns players to their existing GameBuddies lobby
 * - In standalone mode: creates a new GameBuddies lobby and redirects all players
 */

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import socketService from '../../services/socketService';
import { trackGameLeft } from '../../services/analyticsService';
import { t } from '../../utils/translations';

interface GameBuddiesReturnButtonProps {
  roomCode: string;
  playerId?: string;
  isHost?: boolean;
  /** When true, emits create-lobby instead of a room return */
  isStandalone?: boolean;
  /** Pass through streamer mode so the new GB lobby preserves it */
  streamerMode?: boolean;
  variant?: 'inline' | 'floating';
  className?: string;
}

const GameBuddiesReturnButton: React.FC<GameBuddiesReturnButtonProps> = ({
  roomCode,
  playerId,
  isHost = false,
  isStandalone = false,
  streamerMode = false,
  variant = 'inline',
  className = ''
}) => {
  const redirectWithReturning = (targetUrl: string) => {
    // Append ?returning=true for cross-domain detection (sessionStorage doesn't cross domains)
    try {
      const url = new URL(targetUrl);
      url.searchParams.set('returning', 'true');
      const pName = sessionStorage.getItem('gamebuddies_playerName') || '';
      if (pName) url.searchParams.set('returningPlayer', pName);
      window.location.href = url.toString();
    } catch {
      window.location.href = targetUrl;
    }
  };

  const handleClick = () => {
    trackGameLeft('return_button', { room_code: roomCode, is_host: isHost });
    const socket = socketService.getSocket();
    if (!socket) {
      redirectWithReturning('https://gamebuddies.io');
      return;
    }

    // Seed the portal overlay immediately so the animation plays regardless of
    // server response. App.tsx listens for this event and sets portalRedirect
    // state with a fallback URL; if the server later emits gamebuddies:return-redirect
    // (or gamebuddies:lobby-redirect), those listeners overwrite the URL with the
    // real tokenised one before the 3s animation completes.
    window.dispatchEvent(new CustomEvent('gb:portal-begin', {
      detail: {
        mode: isStandalone ? 'standalone' : 'group',
        roomCode,
        playerName: sessionStorage.getItem('gamebuddies_playerName') || '',
      }
    }));

    if (isStandalone) {
      // Standalone mode: create a new lobby on GameBuddies.io
      socket.emit('gamebuddies:create-lobby', { roomCode, streamerMode });
    } else {
      // GB mode: return to existing lobby
      socket.emit('gamebuddies:return', {
        roomCode,
        playerId,
        mode: isHost ? 'group' : 'individual'
      });
    }
  };

  const title = t('header.tryAnotherGameTitle');

  const labelContent = (
    <span className="gb-return-label">
      <span className="gb-return-main">{t('header.tryAnotherGame')}</span>
      <span className="gb-return-sub">GameBuddies.io</span>
    </span>
  );

  if (variant === 'floating') {
    return (
      <button
        onClick={handleClick}
        className={`gamebuddies-return-btn floating ${className}`}
        title={title}
      >
        <ArrowLeft className="w-4 h-4" />
        {labelContent}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`gamebuddies-return-btn inline ${className}`}
      title={title}
    >
      <ArrowLeft className="w-4 h-4" />
      {labelContent}
    </button>
  );
};

export default GameBuddiesReturnButton;
