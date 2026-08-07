import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, Sparkles, Flame, Sunrise, Zap, X } from 'lucide-react';
import { t } from '../../utils/translations';
import { getToastLane } from './toastRail';
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
      <div
        className={`ps-toast ps-toast--reward ps-toast--stacked xp-toast ${leveledUp ? 'level-up' : ''} ${isExiting ? 'exiting' : ''}`}
        data-ps-toast="xp"
        role="status"
      >
        {/* Header */}
        <div className="xp-toast-header">
          <span className="xp-toast-header-icon" aria-hidden="true">
            {leveledUp
              ? <Trophy size={16} strokeWidth={1.75} />
              : <Sparkles size={16} strokeWidth={1.75} />}
          </span>
          <span className="xp-toast-header-title">
            {leveledUp ? t('xp.levelUp') : t('xp.xpGained')}
          </span>
          <span className={`xp-toast-outcome ${won ? '' : 'is-loss'}`}>
            {won ? t('xp.victory') : t('xp.played')}
          </span>
          <button
            className="xp-toast-close"
            onClick={handleDismiss}
            type="button"
            aria-label={t('xp.dismiss')}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="xp-toast-body">
          <div className="xp-toast-icon" aria-hidden="true">
            {leveledUp
              ? <Trophy size={26} strokeWidth={1.5} />
              : <Sparkles size={26} strokeWidth={1.5} />}
          </div>

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
                  <span className="xp-toast-chip">{t('xp.base')} {breakdown.base}</span>
                )}
                {(breakdown.winBonus ?? 0) > 0 && (
                  <span className="xp-toast-chip is-bonus">{t('xp.win')} +{breakdown.winBonus}</span>
                )}
                {breakdown.durationPercent != null && breakdown.durationPercent !== 0 && (
                  <span className={`xp-toast-chip ${breakdown.durationPercent < 0 ? 'is-negative' : 'is-bonus'}`}>
                    {breakdown.durationPercent > 0 ? '+' : ''}{breakdown.durationPercent}% {t('xp.length')}
                  </span>
                )}
                {(breakdown.streakBonus ?? 0) > 0 && (
                  <span className="xp-toast-chip is-bonus">
                    <Flame size={11} strokeWidth={2} aria-hidden="true" />
                    {winStreak > 0 ? t('xp.streak', { count: winStreak }) : `+${breakdown.streakBonus}`}
                  </span>
                )}
                {(breakdown.firstWinBonus ?? 0) > 0 && isFirstWinOfDay && (
                  <span className="xp-toast-chip is-bonus">
                    <Sunrise size={11} strokeWidth={2} aria-hidden="true" />
                    {t('xp.firstWin')} +{breakdown.firstWinBonus}
                  </span>
                )}
                {xpBoostUsed && (
                  <span className="xp-toast-chip is-boost">
                    <Zap size={11} strokeWidth={2} aria-hidden="true" />
                    {t('xp.xpBoost')}
                  </span>
                )}
              </div>
            )}

            {/* Level transition (level-up only) */}
            {leveledUp && (
              <div className="xp-toast-level-up">
                <div className="xp-toast-level-transition">
                  <span>{t('xp.lv')} {previousLevel}</span>
                  <span className="arrow">→</span>
                  <span>{t('xp.lv')} {newLevel}</span>
                </div>
                {(levelsGained ?? 0) > 1 && (
                  <div className="xp-toast-levels-gained">{t('xp.levelsGained', { count: levelsGained ?? 0 })}</div>
                )}
              </div>
            )}

            {/* Progress bar (always shown for current level) */}
            <div className="xp-progress-container">
              <div className="xp-progress-bar">
                <div
                  className="xp-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="xp-progress-text">
                {t('xp.lv')} {newLevel} · {Math.round(progressPercent)}%
              </span>
            </div>
          </div>
        </div>

        {/* Celebration particles */}
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
    getToastLane('top-right')
  );
};
