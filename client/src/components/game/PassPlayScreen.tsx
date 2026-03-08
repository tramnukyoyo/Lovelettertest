/**
 * PassPlayScreen
 *
 * Full-screen overlay shown between turns in Pass & Play mode.
 * Prompts the current player to take the device, tap reveal, view their
 * content, then pass the device to the next player.
 */

import React from 'react';
import { Eye, ChevronRight } from 'lucide-react';
import { getTranslation, getCurrentLanguage } from '../../utils/translations';

interface PassPlayScreenProps {
  currentPlayerName: string;
  currentPlayerIndex: number;
  totalPlayers: number;
  isRevealed: boolean;
  revealContent: React.ReactNode;
  onReveal: () => void;
  onDone: () => void;
  revealLabel?: string;
  doneLabel?: string;
  canAdvance?: boolean;
}

const PassPlayScreen: React.FC<PassPlayScreenProps> = ({
  currentPlayerName,
  currentPlayerIndex,
  totalPlayers,
  isRevealed,
  revealContent,
  onReveal,
  onDone,
  revealLabel,
  doneLabel,
  canAdvance = true,
}) => {
  const lang = getCurrentLanguage();
  const t = (key: string) => getTranslation(key as any, lang);

  return (
    <div className="pp-screen">
      {isRevealed ? (
        /* ===== Revealed State ===== */
        <div className="pp-screen-content pp-revealed">
          <div className="pp-reveal-content">
            {revealContent}
          </div>
          <button
            className={`pp-done-btn ${!canAdvance ? 'pp-done-btn--disabled' : ''}`}
            onClick={onDone}
            disabled={!canAdvance}
            type="button"
          >
            <ChevronRight className="w-5 h-5" />
            {doneLabel || t('passPlay.donePassDevice')}
          </button>
        </div>
      ) : (
        /* ===== Waiting State ===== */
        <div className="pp-screen-content pp-waiting">
          <p className="pp-pass-label">{t('passPlay.passDeviceTo')}</p>
          <h2 className="pp-player-name-display">{currentPlayerName}</h2>

          <div className="pp-privacy-card">
            <span className="pp-privacy-icon" role="img" aria-label="secret">&#128274;</span>
            <span className="pp-privacy-text">
              {t('passPlay.onlyPlayerLooking').replace('{name}', currentPlayerName)}
            </span>
          </div>

          <button
            className="pp-reveal-btn"
            onClick={onReveal}
            type="button"
          >
            <Eye className="w-5 h-5" />
            {revealLabel || t('passPlay.reveal')}
          </button>

          {/* Progress Dots */}
          <PassPlayProgress
            currentIndex={currentPlayerIndex}
            totalPlayers={totalPlayers}
          />
        </div>
      )}
    </div>
  );
};

/* ---- Progress Dots ---- */

interface PassPlayProgressProps {
  currentIndex: number;
  totalPlayers: number;
}

const PassPlayProgress: React.FC<PassPlayProgressProps> = ({ currentIndex, totalPlayers }) => {
  if (totalPlayers === 0) return null;

  return (
    <div className="pp-progress">
      {Array.from({ length: totalPlayers }, (_, i) => {
        const done = i < currentIndex;
        const current = i === currentIndex;
        return (
          <div
            key={i}
            className={`pp-progress-dot ${done ? 'done' : ''} ${current ? 'current' : ''}`}
          />
        );
      })}
    </div>
  );
};

export default PassPlayScreen;
