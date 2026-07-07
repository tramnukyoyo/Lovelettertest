import React from 'react';
import { useAds } from './AdContext';
import AdSenseUnit from './AdSenseUnit';
import { ADSENSE_ENABLED, AD_SLOTS } from '../../config/adsense';
import { t } from '../../utils/translations';
import './ads.css';

interface GameAdRectangleProps {
  placement: 'results' | 'game_over' | 'bigscreen_lobby';
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

  // Decide ONCE per mount whether this instance shows. The impression it
  // fires starts the cooldown, which flips canShowAd — without the sticky
  // decision the ad would unrender one frame after mounting. (Hooks must also
  // run before any early return — the old early-return-then-useEffect order
  // crashed with "rendered more hooks" when canShowAd changed mid-mount.)
  const decidedRef = React.useRef<boolean | null>(null);
  if (decidedRef.current === null) {
    decidedRef.current = shouldShowAds && !isAdBlocked && canShowAd;
  }
  // Premium flipping on (e.g. a premium player joins the big-screen room) or
  // ad-block detection still hides an already-shown ad.
  const showing = decidedRef.current && shouldShowAds && !isAdBlocked;

  // Track impression once when this instance actually shows
  const trackedRef = React.useRef(false);
  React.useEffect(() => {
    if (showing && !trackedRef.current) {
      trackedRef.current = true;
      onAdImpression();
    }
  }, [showing, onAdImpression]);

  if (!showing) {
    return null;
  }

  const slotId =
    placement === 'game_over' ? AD_SLOTS.GAME_OVER :
    placement === 'bigscreen_lobby' ? AD_SLOTS.BIGSCREEN_LOBBY :
    AD_SLOTS.GAME_RESULTS;

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
          <div className="ad-badge">{t('ads.adLabel')}</div>
          <div className="ad-text">
            <span className="ad-title">{t('ads.support')}</span>
            <span className="ad-subtitle">{t('ads.adsHelp')}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameAdRectangle;
