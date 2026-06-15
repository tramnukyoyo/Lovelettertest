import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { getTranslatedCardDatabase } from './hearts-gambit/cardDatabase';
import { getCurrentLanguage, getTranslation } from '../utils/gameTranslations';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const language = getCurrentLanguage();
  const cards = getTranslatedCardDatabase(language);
  const t = (key: Parameters<typeof getTranslation>[0]) => getTranslation(key, language);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Detailed rules per card — pulled from translations so they localize.
  const detailedRules: Record<number, string> = {
    1: t('rules.detail.1'),
    2: t('rules.detail.2'),
    3: t('rules.detail.3'),
    4: t('rules.detail.4'),
    5: t('rules.detail.5'),
    6: t('rules.detail.6'),
    7: t('rules.detail.7'),
    8: t('rules.detail.8'),
  };

  return createPortal(
    <div
      className="settings-modal-backdrop"
      data-broadcast-mirror-portal="rules"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-modal-title"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="settings-modal-panel hg-panel hg-candlelight rules-panel"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="settings-modal-header">
          <div className="settings-modal-title">
            <div className="settings-modal-eyebrow">{t('rules.caseBriefing')}</div>
            <h2 id="rules-modal-title">{t('rules.modalTitle')}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="settings-modal-close"
            onClick={onClose}
            aria-label={t('rules.closeAriaLabel')}
          >
            <X size={20} />
          </button>
        </div>

        <div
          className="settings-modal-content rules-content"
          data-mirror-scroll-region="rules-content"
        >
          {/* The Case */}
          <div className="rules-section">
            <div className="rules-section-title">{t('rules.theCase.title')}</div>
            <p className="rules-text">{t('rules.theCase.body')}</p>
            <p className="rules-text" style={{ fontStyle: 'italic', opacity: 0.7 }}>
              {t('rules.theCase.italic')}
            </p>
          </div>

          <div className="rules-divider" />

          {/* Taking a Turn */}
          <div className="rules-section">
            <div className="rules-section-title">{t('rules.takingTurn.title')}</div>
            <ol className="rules-steps">
              <li><strong>{t('rules.takingTurn.step1Bold')}</strong>{t('rules.takingTurn.step1Rest')}</li>
              <li><strong>{t('rules.takingTurn.step2Bold')}</strong>{t('rules.takingTurn.step2Rest')}</li>
              <li><strong>{t('rules.takingTurn.step3Bold')}</strong>{t('rules.takingTurn.step3Rest')}</li>
            </ol>
          </div>

          <div className="rules-divider" />

          {/* Cards Overview */}
          <div className="rules-section">
            <div className="rules-section-title">{t('rules.cardsOverview.title')}</div>
            <div className="rules-card-grid">
              <div className="rules-card-row rules-card-row-header">
                <span className="rules-card-num">{t('rules.cardsOverview.colNumber')}</span>
                <span className="rules-card-name">{t('rules.cardsOverview.colName')}</span>
                <span className="rules-card-copies">{t('rules.cardsOverview.colCopies')}</span>
                <span className="rules-card-effect">{t('rules.cardsOverview.colEffect')}</span>
              </div>
              {cards.map((card) => (
                <div key={card.id} className="rules-card-row">
                  <span className="rules-card-num">{card.value}</span>
                  <span className="rules-card-name">{card.name}</span>
                  <span className="rules-card-copies">&times;{card.copies}</span>
                  <span className="rules-card-effect">{card.description}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rules-divider" />

          {/* End of Round */}
          <div className="rules-section">
            <div className="rules-section-title">{t('rules.endOfRound.title')}</div>
            <p className="rules-text">
              <strong>{t('rules.endOfRound.lastStandingBold')}</strong>{t('rules.endOfRound.lastStandingRest')}
            </p>
            <p className="rules-text">
              <strong>{t('rules.endOfRound.caseFileEmptyBold')}</strong>{t('rules.endOfRound.caseFileEmptyRest')}
            </p>
          </div>

          <div className="rules-divider" />

          {/* Winning the Game */}
          <div className="rules-section">
            <div className="rules-section-title">{t('rules.winning.title')}</div>
            <p className="rules-text">{t('rules.winning.body')}</p>
            <table className="rules-token-table">
              <thead>
                <tr><th>{t('rules.winning.colPlayers')}</th><th>{t('rules.winning.colTokens')}</th></tr>
              </thead>
              <tbody>
                <tr><td>{t('rules.winning.row2Players')}</td><td><span className="rules-token-dot" /> 7</td></tr>
                <tr><td>{t('rules.winning.row3Players')}</td><td><span className="rules-token-dot" /> 5</td></tr>
                <tr><td>{t('rules.winning.row4Players')}</td><td><span className="rules-token-dot" /> 4</td></tr>
              </tbody>
            </table>
          </div>

          <div className="rules-divider" />

          {/* Detailed Card Rules */}
          <div className="rules-section">
            <div className="rules-section-title">{t('rules.detailedRules.title')}</div>
            {[...cards].reverse().map((card) => (
              <div key={card.id} className="rules-card-detail">
                <div className="rules-card-detail-img">
                  <img src={card.image} alt={card.name} />
                </div>
                <div className="rules-card-detail-body">
                  <div className="rules-card-detail-header">
                    <span className="rules-cd-number">{card.value}</span>
                    <span className="rules-cd-title">{card.name}</span>
                    <span className="rules-cd-copies">&times;{card.copies} {card.copies === 1 ? t('rules.copySingular') : t('rules.copyPlural')}</span>
                  </div>
                  <p className="rules-card-detail-effect">
                    {detailedRules[card.value] || card.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Important notes */}
          <div className="rules-important">
            <div className="rules-important-label">{t('rules.important.label')}</div>
            <p>
              {t('rules.important.line1Pre')}
              <strong>{t('rules.important.line1Bold')}</strong>
              {t('rules.important.line1Post')}
            </p>
            <p>{t('rules.important.line2')}</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RulesModal;
