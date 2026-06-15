import React from 'react';
import { useAds } from './AdContext';
import AdSenseUnit from './AdSenseUnit';
import { ADSENSE_ENABLED, AD_SLOTS } from '../../config/adsense';
import './ads.css';

interface GameAdRectangleProps {
  placement: 'results' | 'game_over';
  className?: string;
}

/**
 * Rectangle ad for game screens (300x250).
 * Shows between rounds and on game over screen.
 */
const GameAdRectangle: React.FC<GameAdRectangleProps> = ({
  placement,
  className = '',
}) => {
  const { shouldShowAds, isAdBlocked, canShowAd, onAdImpression } = useAds();

  if (!shouldShowAds || isAdBlocked || !canShowAd) {
    return null;
  }

  const slotId = placement === 'game_over' ? AD_SLOTS.GAME_OVER : AD_SLOTS.GAME_RESULTS;

  // Track impression when mounted
  React.useEffect(() => {
    onAdImpression();
  }, [onAdImpression]);

  return (
    <div className={`game-ad-container ${className}`}>
      {ADSENSE_ENABLED ? (
        <AdSenseUnit
          slot={slotId}
          format="rectangle"
          style={{ width: 300, height: 250 }}
        />
      ) : (
        // Development placeholder
        <div className="game-ad-placeholder">
          <div className="ad-badge">AD</div>
          <div className="ad-text">
            <span className="ad-title">Support GameBuddies</span>
            <span className="ad-subtitle">Ads help keep games free!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameAdRectangle;
