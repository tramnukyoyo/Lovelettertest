import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { getTranslatedCardDatabase } from './hearts-gambit/cardDatabase';
import { getTranslation, getCurrentLanguage } from '../utils/gameTranslations';
import '../styles/game/prime-suspect-modal-family.css';

interface CardLegendModalProps {
  onClose: () => void;
}

export const CardLegendModal: React.FC<CardLegendModalProps> = ({ onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const language = getCurrentLanguage();
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

  return createPortal(
    <div
      className="settings-modal-backdrop"
      data-broadcast-mirror-portal="card-legend"
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-legend-title"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="settings-modal-panel hg-panel hg-candlelight card-legend-panel"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="settings-modal-header">
          <div className="settings-modal-title">
            <div className="settings-modal-eyebrow">{t('cardLegend.caseFiles')}</div>
            <h2 id="card-legend-title">{t('cardLegend.title')}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="settings-modal-close"
            onClick={onClose}
            aria-label={t('cardLegend.closeLabel')}
          >
            <X size={20} />
          </button>
        </div>

        <div
          className="settings-modal-content card-legend-content"
          data-mirror-scroll-region="card-legend-content"
        >
          <div className="card-legend-grid">
            {getTranslatedCardDatabase(language).map((card) => (
              <div key={card.id} className="card-legend-item">
                <div className="card-legend-image-wrapper">
                  <img
                    src={card.image}
                    alt={card.name}
                    className="card-legend-image"
                  />
                </div>
                <div className="card-legend-info">
                  <div className="card-legend-header">
                    <span className="card-legend-name">{card.name}</span>
                    <span className="card-legend-value">{card.value}</span>
                  </div>
                  <span className="card-legend-copies">
                    {card.copies === 1 ? t('cardLegend.oneCopy') : t('cardLegend.multipleCopies').replace('{count}', card.copies.toString())}
                  </span>
                  <p className="card-legend-description">{card.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="settings-modal-footer">
          <div className="settings-hint">{t('cardLegend.footer')}</div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CardLegendModal;
