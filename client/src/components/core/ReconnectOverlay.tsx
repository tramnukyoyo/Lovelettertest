/**
 * ReconnectOverlay - Shown when a game is restored after server restart.
 * Displays reconnection progress and a resume button for the host.
 */

import React, { useState } from 'react';
import './ReconnectOverlay.css';

interface ReconnectOverlayProps {
  phase: string;
  connectedCount: number;
  totalPlayers: number;
  isHost: boolean;
  onResume: () => void;
}

const ReconnectOverlay: React.FC<ReconnectOverlayProps> = ({
  phase,
  connectedCount,
  totalPlayers,
  isHost,
  onResume,
}) => {
  const [dismissing, setDismissing] = useState(false);

  const handleResume = () => {
    setDismissing(true);
    setTimeout(onResume, 300);
  };

  // Render dots for each player (connected = cyan, disconnected = dim)
  const dots = Array.from({ length: totalPlayers }, (_, i) => (
    <div
      key={i}
      className={`reconnect-dot${i < connectedCount ? ' connected' : ''}`}
    />
  ));

  return (
    <div className={`reconnect-overlay${dismissing ? ' dismissing' : ''}`}>
      <div className="reconnect-card">
        <div className="reconnect-icon">🔄</div>
        <div className="reconnect-title">Game Restored</div>
        <div className="reconnect-phase">{phase}</div>

        <div className="reconnect-players">
          <div className="reconnect-player-dots">{dots}</div>
          <span className="reconnect-count">
            {connectedCount}/{totalPlayers} reconnected
          </span>
        </div>

        <div className="reconnect-action">
          {isHost ? (
            <button className="reconnect-resume-btn" onClick={handleResume}>
              Resume Game
            </button>
          ) : (
            <div className="reconnect-waiting">
              <div className="reconnect-waiting-spinner" />
              Waiting for host to resume...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReconnectOverlay;
