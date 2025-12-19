import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cardDatabase } from './hearts-gambit/cardDatabase';

interface CardLegendModalProps {
  onClose: () => void;
}

export const CardLegendModal: React.FC<CardLegendModalProps> = ({ onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

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
      className="settings-modal"
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
            <div className="settings-modal-eyebrow">Case Files</div>
            <h2 id="card-legend-title">Card Legend</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="settings-modal-close"
            onClick={onClose}
            aria-label="Close card legend"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="settings-modal-content card-legend-content">
          <div className="card-legend-grid">
            {cardDatabase.map((card) => (
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
                    {card.copies === 1 ? '1 copy in deck' : `${card.copies} copies in deck`}
                  </span>
                  <p className="card-legend-description">{card.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="settings-modal-footer">
          <div className="settings-hint">16 cards total • Higher value wins in comparisons</div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CardLegendModal;
