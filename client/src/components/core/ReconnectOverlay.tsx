/**
 * ReconnectOverlay - Shown when a game is restored after server restart.
 * Displays reconnection progress and a resume button for the host.
 */

import React, { useState, useEffect } from 'react';
import { getTranslation, getCurrentLanguage } from '../../utils/translations';
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
  const [waitedTooLong, setWaitedTooLong] = useState(false);
  useEffect(() => {
    if (isHost) { setWaitedTooLong(false); return; }
    const id = setTimeout(() => setWaitedTooLong(true), 25000);
    return () => clearTimeout(id);
  }, [isHost]);
  const lang = getCurrentLanguage();

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
        <div className="reconnect-title">{getTranslation('reconnect.title', lang)}</div>
        <div className="reconnect-phase">{phase}</div>

        <div className="reconnect-players">
          <div className="reconnect-player-dots">{dots}</div>
          <span className="reconnect-count">
            {getTranslation('reconnect.playersReconnected', lang).replace('{connected}', String(connectedCount)).replace('{total}', String(totalPlayers))}
          </span>
        </div>

        <div className="reconnect-action">
          {isHost ? (
            <button className="reconnect-resume-btn" onClick={handleResume}>
              {getTranslation('reconnect.resumeGame', lang)}
            </button>
          ) : (
            <div className="reconnect-waiting">
              <div className="reconnect-waiting-spinner" />
              {getTranslation('reconnect.waitingForHost', lang)}
              {waitedTooLong && (
                <button className="reconnect-resume-btn" style={{ marginTop: '0.75rem' }} onClick={() => window.location.reload()} aria-label="Reload page" title="Reload">
                  🔄
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReconnectOverlay;
