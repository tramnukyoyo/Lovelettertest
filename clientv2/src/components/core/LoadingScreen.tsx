/**
 * LoadingScreen - Beautiful full-screen loading overlay
 *
 * Shown when launching from GameBuddies.io to prevent
 * brief flash of HomePage during auto-join process.
 * Features playful animations and colorful visual feedback.
 */

import React from 'react';
import { t } from '../../utils/translations';
import './LoadingScreen.css';

interface LoadingScreenProps {
  /** Status message shown during loading (new API) */
  status?: string;
  /** @deprecated Use status instead. Kept for backwards compatibility */
  message?: string;
  /** Whether to animate the fade-out transition */
  fadeOut?: boolean;
  /** Optional game name override */
  gameName?: string;
  /** Optional mascot image URL */
  mascotUrl?: string;
}

const HINT_KEYS = [
  'loadingScreen.hint1',
  'loadingScreen.hint2',
  'loadingScreen.hint3',
  'loadingScreen.hint4',
  'loadingScreen.hint5',
  'loadingScreen.hint6',
];

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  status,
  message,
  fadeOut = false,
  gameName = 'GameBuddies',
  mascotUrl,
}) => {
  const displayStatus = status || message || t('loadingScreen.connecting');
  const [hint] = React.useState(() =>
    t(HINT_KEYS[Math.floor(Math.random() * HINT_KEYS.length)])
  );

  return (
    <div className={`loading-screen${fadeOut ? ' fade-out' : ''}`}>
      {/* Floating particles */}
      <div className="loading-particles">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="loading-particle" />
        ))}
      </div>

      <div className="loading-content">
        {/* Mascot with rotating rings */}
        <div className="loading-mascot-wrapper">
          <div className="loading-ring loading-ring-1" />
          <div className="loading-ring loading-ring-2" />
          <div className="loading-ring loading-ring-3" />
          <div className="loading-mascot-glow" />
          {mascotUrl ? (
            <img
              src={mascotUrl}
              alt={gameName}
              className="loading-mascot"
            />
          ) : (
            <div className="loading-mascot-fallback">🎮</div>
          )}
        </div>

        {/* Title */}
        <div className="loading-title">{gameName}</div>

        {/* Status message */}
        <div className="loading-status">
          <span key={displayStatus} className="loading-status-text">
            {displayStatus}...
          </span>
        </div>

        {/* Progress bar */}
        <div className="loading-progress-container">
          <div className="loading-progress-track">
            <div className="loading-progress-fill" />
          </div>
        </div>

        {/* Fun hint */}
        <div className="loading-hint">{hint}</div>
      </div>
    </div>
  );
};

export default LoadingScreen;
