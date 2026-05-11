import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getTranslation, getCurrentLanguage } from '../../utils/translations';
import '../../styles/XpToast.css';

interface XpReward {
  reward: {
    totalXp: number;
    summary: string;
    breakdown?: {
      base?: number;
      winBonus?: number;
      durationBonusXp?: number;
      durationPercent?: number;
      streakBonus?: number;
      firstWinBonus?: number;
    };
    multipliers?: { duration?: number; streak?: number };
    isFirstWinOfDay?: boolean;
    gabuPoints?: number;
    xpBoostUsed?: boolean;
  };
  progress: {
    newXp?: number;
    previousXp?: number;
    newLevel: number;
    previousLevel: number;
    leveledUp: boolean;
    levelsGained?: number;
    percentage: number;
  };
  stats?: { current_win_streak?: number } | null;
}

interface XpToastProps {
  reward: XpReward | null;
  onClose: () => void;
}

export const XpToast: React.FC<XpToastProps> = ({ reward, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const language = getCurrentLanguage();
  const t = (key: string) => getTranslation(key as any, language);

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
      const timer = setTimeout(() => {
        handleDismiss();
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [reward, handleDismiss]);

  if (!reward || !isVisible) return null;

  const { totalXp, breakdown, isFirstWinOfDay, gabuPoints, xpBoostUsed } = reward.reward;
  const { leveledUp, newLevel, previousLevel, levelsGained, percentage } = reward.progress;
  const winStreak = reward.stats?.current_win_streak ?? 0;

  const won = (breakdown?.winBonus ?? 0) > 0;
  const progressPercent = Math.max(0, Math.min(100, percentage ?? 0));

  return createPortal(
    <div className="xp-toast-container">
      <div className={`xp-toast ${leveledUp ? 'level-up' : ''} ${isExiting ? 'exiting' : ''}`}>
        {/* Header */}
        <div className="xp-toast-header">
          <span className="xp-toast-header-icon">{leveledUp ? '🏆' : '⭐'}</span>
          <span className="xp-toast-header-title">
            {leveledUp ? t('xp.levelUp') : t('xp.xpGained')}
          </span>
          <span className={`xp-toast-outcome ${won ? '' : 'is-loss'}`}>
            {won ? '🏆 Victory' : '💪 Played'}
          </span>
          <button
            className="xp-toast-close"
            onClick={handleDismiss}
            aria-label={t('xp.dismissNotification')}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="xp-toast-body">
          <div className="xp-toast-icon">{leveledUp ? '🏆' : '✨'}</div>

          <div className="xp-toast-content">
            <div className="xp-toast-amount-row">
              <div className="xp-toast-amount">+{totalXp} XP</div>
              {gabuPoints != null && gabuPoints > 0 && (
                <div className="xp-toast-gp">+{gabuPoints} GP</div>
              )}
            </div>

            {/* Breakdown chips */}
            {breakdown && (
              <div className="xp-toast-chips">
                {(breakdown.base ?? 0) > 0 && (
                  <span className="xp-toast-chip">Base {breakdown.base}</span>
                )}
                {(breakdown.winBonus ?? 0) > 0 && (
                  <span className="xp-toast-chip is-bonus">Win +{breakdown.winBonus}</span>
                )}
                {breakdown.durationPercent != null && breakdown.durationPercent !== 0 && (
                  <span className={`xp-toast-chip ${breakdown.durationPercent < 0 ? 'is-negative' : 'is-bonus'}`}>
                    {breakdown.durationPercent > 0 ? '+' : ''}{breakdown.durationPercent}% length
                  </span>
                )}
                {(breakdown.streakBonus ?? 0) > 0 && (
                  <span className="xp-toast-chip is-bonus">
                    🔥 {winStreak > 0 ? `${winStreak} streak` : `+${breakdown.streakBonus}`}
                  </span>
                )}
                {(breakdown.firstWinBonus ?? 0) > 0 && isFirstWinOfDay && (
                  <span className="xp-toast-chip is-bonus">🌅 First win +{breakdown.firstWinBonus}</span>
                )}
                {xpBoostUsed && (
                  <span className="xp-toast-chip is-boost">🚀 2× XP Boost</span>
                )}
              </div>
            )}

            {/* Level transition */}
            {leveledUp && (
              <div className="xp-toast-level-up">
                <div className="xp-toast-level-transition">
                  <span>Lv {previousLevel}</span>
                  <span className="arrow">→</span>
                  <span>Lv {newLevel}</span>
                </div>
                {(levelsGained ?? 0) > 1 && (
                  <div className="xp-toast-levels-gained">+{levelsGained} Levels!</div>
                )}
              </div>
            )}

            <div className="xp-progress-container">
              <div className="xp-progress-bar">
                <div
                  className="xp-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="xp-progress-text">
                Lv {newLevel} · {Math.round(progressPercent)}%
              </span>
            </div>
          </div>
        </div>

        {leveledUp && (
          <div className="celebration-particles">
            <span className="particle particle-1" />
            <span className="particle particle-2" />
            <span className="particle particle-3" />
            <span className="particle particle-4" />
            <span className="particle particle-5" />
            <span className="particle particle-6" />
            <span className="particle particle-7" />
            <span className="particle particle-8" />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
