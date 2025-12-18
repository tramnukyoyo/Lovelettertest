import React from 'react';
import type { CardType } from '../../types';
import { getCardData, CARD_BACK_IMAGE } from './cardDatabase';

interface DynamicCardProps {
  cardType: CardType;
  showFace?: boolean;       // Whether to show front or back (default: true for non-zero)
  className?: string;       // Additional CSS classes
  onClick?: () => void;     // Click handler
  selected?: boolean;       // Selection state
  style?: React.CSSProperties; // Additional inline styles
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
  style
}) => {
  // Get card data from database
  const cardData = getCardData(cardType);

  // If showing back or no card data, render card back
  if (!showFace || !cardData) {
    return (
      <div
        className={`hg-dynamic-card hg-card-back ${className} ${selected ? 'selected' : ''}`}
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
      onClick={onClick}
      style={style}
    >
      {/* Header overlay - Value and Name */}
      <div className="card-header">
        <span className="card-value">{cardData.value}</span>
        <span className="card-title">{cardData.name}</span>
      </div>

      {/* Art section - Character image */}
      <div
        className="card-art"
        style={{ backgroundImage: `url(${cardData.image})` }}
      />

      {/* Body section - Type and Description */}
      <div className="card-body">
        <div className="effect-tag">{cardData.type}</div>
        <div className="card-description">{cardData.description}</div>
      </div>
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
