/**
 * LoadingScreen - Beautiful full-screen loading overlay
 *
 * Shown when launching from GameBuddies.io to prevent
 * brief flash of HomePage during auto-join process.
 * Features playful animations and colorful visual feedback.
 */

import React from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  /** Status message shown during loading (new API) */
  status?: string;
  /** @deprecated Use status instead. Kept for backwards compatibility */
  message?: string;
  /** Whether to animate the fade-out transition */
  fadeOut?: boolean;
}

const HINTS = [
  'Trust no one completely!',
  'Watch for suspicious behavior',
  'Deception is key to survival',
  'Observe before you accuse',
  'The truth hides in plain sight',
  'Your rivals are watching you too',
];

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  status,
  message,
  fadeOut = false
}) => {
  const displayStatus = status || message || 'Connecting';
  const [hint] = React.useState(() =>
    HINTS[Math.floor(Math.random() * HINTS.length)]
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
          <img
            src="https://dwrhhrhtsklskquipcci.supabase.co/storage/v1/object/public/game-thumbnails/primesuspect.webp"
            alt="Prime Suspect"
            className="loading-mascot"
          />
        </div>

        {/* Title */}
        <div className="loading-title">Prime Suspect</div>

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
