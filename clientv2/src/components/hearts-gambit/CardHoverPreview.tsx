import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import DynamicCard from './DynamicCard';
import { useCardHover } from './CardHoverContext';
import { getTranslatedCardData } from './cardDatabase';
import { getCurrentLanguage } from '../../utils/gameTranslations';

/**
 * CardHoverPreview — a large card preview pinned to the TOP-RIGHT of the game
 * stage. Driven by CardHoverContext: whenever the player hovers any card in the
 * hand / opponent row / deck / discard / guard-select, this panel shows that
 * card at ~200x300 with its FULL untruncated effect text.
 *
 * Mounted absolutely inside the game container (pointer-events: none so it never
 * steals hover), candlelit noir look with a gold frame.
 */
const CardHoverPreview: React.FC = () => {
  const { hoveredCard } = useCardHover();
  const language = getCurrentLanguage();
  const cardData = hoveredCard ? getTranslatedCardData(hoveredCard, language) : null;

  return (
    <AnimatePresence>
      {hoveredCard && cardData && (
        <motion.div
          className="ps-hover-preview"
          initial={{ opacity: 0, scale: 0.92, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
          aria-hidden="true"
        >
          <span className="ps-hover-preview-tab">Case File</span>
          <div className="ps-hover-preview-card">
            <DynamicCard cardType={hoveredCard} className="hg-hover-card" />
          </div>
          <div className="ps-hover-preview-info">
            <div className="ps-hover-preview-head">
              <span className="ps-hover-preview-value">{cardData.value}</span>
              <span className="ps-hover-preview-name">{cardData.name}</span>
            </div>
            <div className="ps-hover-preview-type">{cardData.type}</div>
            <p className="ps-hover-preview-desc">{cardData.description}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CardHoverPreview;
