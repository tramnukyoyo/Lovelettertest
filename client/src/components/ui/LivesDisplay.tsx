import React from 'react';

interface LivesDisplayProps {
  livesRemaining: number;
  maxLives: number;
}

export const LivesDisplay: React.FC<LivesDisplayProps> = ({ livesRemaining, maxLives }) => {
  const hearts = [];

  // Create hearts array (filled and empty)
  for (let i = 0; i < maxLives; i++) {
    if (i < livesRemaining) {
      hearts.push(
        <span key={i} className="heart heart-filled">
          ❤️
        </span>
      );
    } else {
      hearts.push(
        <span key={i} className="heart heart-empty">
          🖤
        </span>
      );
    }
  }

  const isLowLives = livesRemaining <= 2;
  const isCriticalLives = livesRemaining <= 1;

  return (
    <div className={`lives-display ${isLowLives ? 'low-lives' : ''} ${isCriticalLives ? 'critical-lives' : ''}`}>
      <div className="lives-label">Shared Lives:</div>
      <div className="hearts-container">
        {hearts}
      </div>
      <div className="lives-count">
        {livesRemaining}/{maxLives}
      </div>
    </div>
  );
};
