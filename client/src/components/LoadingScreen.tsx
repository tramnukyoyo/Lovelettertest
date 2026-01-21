/**
 * LoadingScreen - Full-screen loading overlay for GameBuddies launch
 *
 * Shown when launching from GameBuddies.io to prevent
 * brief flash of HomePage during auto-join.
 */

import React from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading' }) => {
  return (
    <div className="gb-loading-screen">
      <div className="gb-loading-content">
        <div className="gb-loading-mascot-wrapper">
          <img
            src="https://dwrhhrhtsklskquipcci.supabase.co/storage/v1/object/public/game-thumbnails/primesuspect.webp"
            alt="Prime Suspect"
            className="gb-loading-mascot"
          />
          <div className="gb-loading-mascot-glow"></div>
        </div>

        <div className="gb-loading-text">
          {message}<span className="gb-loading-dots">...</span>
        </div>

        <div className="gb-loading-bar">
          <div className="gb-loading-bar-fill"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
