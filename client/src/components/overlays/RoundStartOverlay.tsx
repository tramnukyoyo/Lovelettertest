import React, { useState, useEffect } from 'react';

import { soundEffects } from '../../utils/soundEffects';
import { COUNTDOWN_TIMINGS, COUNTDOWN_TOTAL_DURATION_MS } from '../../constants/timing';
import { logger } from '../../utils/logger';

interface RoundStartOverlayProps {
  roundNumber: number;
  onComplete: () => void;
}

export const RoundStartOverlay: React.FC<RoundStartOverlayProps> = ({ roundNumber, onComplete }) => {
  const [displayNumber, setDisplayNumber] = useState<number | string>(3);

  useEffect(() => {
    // Play countdown sound at start
    soundEffects.play('countdown');

    // Set each number at the right time
    const timeouts = COUNTDOWN_TIMINGS.map((timing) =>
      setTimeout(() => {
        logger.log('[RoundStartOverlay] Setting number:', timing.number);
        setDisplayNumber(timing.number);
      }, timing.delay)
    );

    // Complete after all animations
    const completeTimeout = setTimeout(() => {
      logger.log('[RoundStartOverlay] Countdown complete, calling onComplete');
      onComplete();
    }, COUNTDOWN_TOTAL_DURATION_MS);

    return () => {
      logger.log('[RoundStartOverlay] Cleaning up timeouts');
      timeouts.forEach(clearTimeout);
      clearTimeout(completeTimeout);
    };
  }, []); // Empty dependency array - only run once on mount

  return (
    <div className="round-start-overlay">
      {/* Background with blur */}
      <div className="round-start-backdrop" />

      {/* Content */}
      <div className="round-start-content">
        {/* Round label */}
        <div className="round-label">
          Round {roundNumber}
        </div>

        {/* Animated countdown or GO! */}
        {displayNumber === 'GO!' ? (
          <div key="go" className="go-text">
            GO!
          </div>
        ) : (
          <div key={displayNumber} className="countdown-number">
            {displayNumber}
          </div>
        )}

        {/* Animated circles (neural network effect) */}
        <div className="neural-circles">
          <div className="circle circle-1" />
          <div className="circle circle-2" />
          <div className="circle circle-3" />
        </div>
      </div>
    </div>
  );
};

export default RoundStartOverlay;
