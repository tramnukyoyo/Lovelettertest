import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CardType } from '../../types';
import DynamicCard from './DynamicCard';

interface CardTooltipProps {
  card: CardType;
  cardImage: string;
  cardName: string;
  cardDescription?: string;
  children: React.ReactNode;
  disabled?: boolean;
  imageOnly?: boolean;
  useDynamicCard?: boolean;  // Use DynamicCard component for preview
}

const CardTooltip: React.FC<CardTooltipProps> = ({
  card,
  cardImage,
  cardName,
  cardDescription,
  children,
  disabled = false,
  imageOnly = false,
  useDynamicCard = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    }, 300);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isVisible) {
      setPosition({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  // Mobile tap handler
  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    const touch = e.touches[0];
    setPosition({ x: touch.clientX, y: touch.clientY - 150 });
    setIsVisible(true);
  };

  const handleTouchEnd = () => {
    setTimeout(() => setIsVisible(false), 1500);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Calculate position to keep tooltip on screen
  const getTooltipStyle = () => {
    const tooltipWidth = 180;
    const tooltipHeight = 280;
    const padding = 20;

    let left = position.x + padding;
    let top = position.y - tooltipHeight - padding;

    // Keep within horizontal bounds
    if (left + tooltipWidth > window.innerWidth - padding) {
      left = position.x - tooltipWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }

    // Keep within vertical bounds
    if (top < padding) {
      top = position.y + padding;
    }

    return { left, top };
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {children}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 pointer-events-none"
            style={getTooltipStyle()}
          >
            {useDynamicCard ? (
              <DynamicCard
                cardType={card}
                showFace={card !== 0}
                className="hg-tooltip-card"
              />
            ) : imageOnly ? (
              <img
                src={cardImage}
                alt={cardName}
                className="w-[200px] h-auto rounded-xl shadow-2xl ring-1 ring-[rgba(var(--accent-color-rgb),0.25)]"
              />
            ) : (
              <div className="hg-panel hg-candlelight rounded-xl p-3 shadow-2xl backdrop-blur-sm w-[190px]">
                {/* Card Image Preview */}
                <img
                  src={cardImage}
                  alt={cardName}
                  className="w-full h-auto rounded-lg mb-2 shadow-md ring-1 ring-white/10"
                />
                {/* Card Info */}
                <div className="text-center">
                  <div className="text-[var(--royal-gold)] font-bold text-sm tracking-wide">{cardName}</div>
                  {card !== 0 && (
                    <div className="hg-meta text-xs mt-1">Value: {card}</div>
                  )}
                  {cardDescription && (
                    <div className="text-[rgba(246,240,230,0.78)] text-xs mt-2 leading-tight">{cardDescription}</div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CardTooltip;
