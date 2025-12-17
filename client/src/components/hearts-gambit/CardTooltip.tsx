import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CardType } from '../../types';

interface CardTooltipProps {
  card: CardType;
  cardImage: string;
  cardName: string;
  cardDescription?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

const CardTooltip: React.FC<CardTooltipProps> = ({
  card,
  cardImage,
  cardName,
  cardDescription,
  children,
  disabled = false
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
            <div className="bg-slate-900/95 border-2 border-amber-500/50 rounded-xl p-3 shadow-2xl backdrop-blur-sm w-[180px]">
              {/* Card Image Preview */}
              <img
                src={cardImage}
                alt={cardName}
                className="w-full h-auto rounded-lg mb-2 shadow-md"
              />
              {/* Card Info */}
              <div className="text-center">
                <div className="text-amber-400 font-bold text-sm">{cardName}</div>
                {card !== 0 && (
                  <div className="text-slate-300 text-xs mt-1 italic">Value: {card}</div>
                )}
                {cardDescription && (
                  <div className="text-slate-400 text-xs mt-2 leading-tight">{cardDescription}</div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CardTooltip;
