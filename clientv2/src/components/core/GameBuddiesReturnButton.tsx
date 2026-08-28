/**
 * GameBuddies Return Button
 *
 * Button to return to GameBuddies.io platform.
 * - In GB mode: returns players to their existing GameBuddies lobby
 * - In standalone mode: creates a new GameBuddies lobby and redirects all players
 */

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { beginPlatformReturn } from '../../services/platformReturn';
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
  const handleClick = () => {
    beginPlatformReturn({
      roomCode,
      playerId,
      isHost,
      isStandalone,
      streamerMode,
      source: 'return_button',
    });
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
