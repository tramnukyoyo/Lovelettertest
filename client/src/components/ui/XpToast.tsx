import React, { useEffect, useState, useCallback } from 'react';

interface XpReward {
  reward: {
    totalXp: number;
    summary: string;
    breakdown: any;
  };
  progress: {
    newLevel: number;
    previousLevel: number;
    leveledUp: boolean;
    percentage: number;
  };
}

interface XpToastProps {
  reward: XpReward | null;
  onClose: () => void;
}

export const XpToast: React.FC<XpToastProps> = ({ reward, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
      onClose();
    }, 500);
  }, [onClose]);

  useEffect(() => {
    if (reward) {
      setIsVisible(true);
      setIsExiting(false);
      // Auto-hide after 6 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [reward, handleDismiss]);

  if (!reward || !isVisible) return null;

  const { totalXp, summary } = reward.reward;
  const { leveledUp, newLevel, percentage } = reward.progress;

  // Calculate progress percentage (use actual value or default to 75%)
  const progressPercent = percentage || 75;

  return (
    <div className="xp-toast-container">
      <div className={`xp-toast ${leveledUp ? 'level-up' : ''} ${isExiting ? 'exiting' : ''}`}>
        {/* Header bar */}
        <div className="xp-toast-header">
          <span className="xp-toast-header-icon">
            {leveledUp ? '🏆' : '⭐'}
          </span>
          <span className="xp-toast-header-title">
            {leveledUp ? 'LEVEL UP!' : 'XP GAINED'}
          </span>
          <button
            className="xp-toast-close"
            onClick={handleDismiss}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="xp-toast-body">
          <div className="xp-toast-icon">
            {leveledUp ? '🏆' : '✨'}
          </div>

          <div className="xp-toast-content">
            <div className="xp-toast-amount">
              +{totalXp} XP
            </div>

            <div className="xp-toast-message">
              {summary.replace(/.*: \d+ XP/, '').trim() || 'Good Game!'}
            </div>

            {leveledUp && (
              <div className="xp-toast-level-message">
                You reached Level {newLevel}!
              </div>
            )}

            {/* Progress bar with actual percentage */}
            <div className="xp-progress-container">
              <div className="xp-progress-bar">
                <div
                  className="xp-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <span className="xp-progress-text">{Math.round(progressPercent)}%</span>
            </div>
          </div>
        </div>

        {/* Celebration particles for level-up */}
        {leveledUp && (
          <div className="celebration-particles">
            <span className="particle particle-1"></span>
            <span className="particle particle-2"></span>
            <span className="particle particle-3"></span>
            <span className="particle particle-4"></span>
            <span className="particle particle-5"></span>
            <span className="particle particle-6"></span>
            <span className="particle particle-7"></span>
            <span className="particle particle-8"></span>
          </div>
        )}
      </div>
    </div>
  );
};
