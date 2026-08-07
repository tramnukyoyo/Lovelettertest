import React from 'react';
import type { CardType } from '../../types';
import { getTranslatedCardData, CARD_BACK_IMAGE } from './cardDatabase';
import { getCurrentLanguage } from '../../utils/gameTranslations';

/**
 * Canonical (un-translated) thematic type per CardType id. Used for the
 * `data-card-type` attribute so the noir theme can colour the ribbon/accent
 * per identity regardless of the active UI language (cardData.type is localized).
 */
const CARD_TYPE_BY_ID: Record<number, string> = {
  1: 'Law',
  2: 'Staff',
  3: 'Civilian',
  4: 'Civilian',
  5: 'Criminal',
  6: 'Spy',
  7: 'Dangerous',
  8: 'Guilty',
};

interface DynamicCardProps {
  cardType: CardType;
  showFace?: boolean;       // Whether to show front or back (default: true for non-zero)
  className?: string;       // Additional CSS classes
  onClick?: () => void;     // Click handler
  selected?: boolean;       // Selection state
  style?: React.CSSProperties; // Additional inline styles
  /** Frame-theme token class of the card's OWNER ('fr-theme-<frameId>' from
   *  utils/frameThemes.frameThemeClass, '' = plain). Only affects the
   *  face-down back (the fr-theme token rule in cardstyles.css); pass nothing
   *  for ownerless backs (deck, previews). */
  ownerFrameClass?: string;
}

/**
 * DynamicCard - Renders a card with dynamic text overlays
 *
 * Card structure:
 * - Header: Value number + Card name
 * - Art: Character image (60% height)
 * - Body: Type tag + Description (40% height)
 */
const DynamicCard: React.FC<DynamicCardProps> = ({
  cardType,
  showFace = cardType !== 0,
  className = '',
  onClick,
  selected = false,
  style,
  ownerFrameClass = ''
}) => {
  // Get translated card data from database
  const language = getCurrentLanguage();
  const cardData = getTranslatedCardData(cardType, language);

  // If showing back or no card data, render card back
  if (!showFace || !cardData) {
    return (
      <div
        className={`hg-dynamic-card hg-card-back ${ownerFrameClass ? `${ownerFrameClass} ` : ''}${className} ${selected ? 'selected' : ''}`}
        onClick={onClick}
        style={style}
      >
        <img
          src={CARD_BACK_IMAGE}
          alt="Card Back"
          className="card-back-image"
          draggable={false}
        />
      </div>
    );
  }

  // Render face-up card with dynamic content
  return (
    <div
      className={`hg-dynamic-card ${className} ${selected ? 'selected' : ''}`}
      data-card-type={CARD_TYPE_BY_ID[cardData.id] || 'Civilian'}
      onClick={onClick}
      style={style}
    >
      {/* Header overlay - Value only */}
      <div className="card-header">
        <span className="card-value">{cardData.value}</span>
      </div>

      {/* Art section - Character image */}
      <div
        className="card-art"
        style={{ backgroundImage: `url(${cardData.image})` }}
      />

      {/* Body section - Name and Description */}
      <div className="card-body">
        <div className="effect-tag">{cardData.name}</div>
        <div className="card-description">{cardData.description}</div>
      </div>

      {/* Bottom-right corner value — playing-card feel. NOT mirrored: the rank IS
          the guess target in this deduction loop, so a rotated 6 printed a literal
          9 (see prime-suspect-ingame.css §18.2). */}
      <div className="card-value-br" aria-hidden="true">{cardData.value}</div>
    </div>
  );
};

/**
 * CardBackOnly - Simple card back component for deck/opponent hands
 */
export const CardBackOnly: React.FC<{
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}> = ({ className = '', style, onClick }) => (
  <div
    className={`hg-dynamic-card hg-card-back ${className}`}
    onClick={onClick}
    style={style}
  >
    <img
      src={CARD_BACK_IMAGE}
      alt="Card Back"
      className="card-back-image"
      draggable={false}
    />
  </div>
);

export default DynamicCard;
