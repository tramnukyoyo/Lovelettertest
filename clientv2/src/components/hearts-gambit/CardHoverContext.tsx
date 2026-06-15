import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import type { CardType } from '../../types';

/**
 * CardHoverContext — tracks which card the player is hovering so a single
 * large preview can be shown pinned to the top-right of the game stage.
 *
 * onEnter(cardType): schedules the preview after a short delay (so quick
 *   mouse sweeps across the hand don't flash the panel).
 * onLeave(): clears instantly.
 *
 * Card 0 (card back / hidden) is ignored — there's nothing to preview.
 */
interface CardHoverContextValue {
  hoveredCard: CardType | null;
  onEnter: (cardType: CardType) => void;
  onLeave: () => void;
}

const CardHoverContext = createContext<CardHoverContextValue | null>(null);

const SHOW_DELAY_MS = 120;

export const CardHoverProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hoveredCard, setHoveredCard] = useState<CardType | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onEnter = useCallback((cardType: CardType) => {
    // Nothing to preview for hidden / card-back (runtime 0, falsy).
    if (!cardType) return;
    clearTimer();
    timerRef.current = setTimeout(() => setHoveredCard(cardType), SHOW_DELAY_MS);
  }, [clearTimer]);

  const onLeave = useCallback(() => {
    clearTimer();
    setHoveredCard(null);
  }, [clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return (
    <CardHoverContext.Provider value={{ hoveredCard, onEnter, onLeave }}>
      {children}
    </CardHoverContext.Provider>
  );
};

export function useCardHover(): CardHoverContextValue {
  const ctx = useContext(CardHoverContext);
  if (!ctx) {
    // Safe no-op fallback so consumers outside the provider don't crash.
    return { hoveredCard: null, onEnter: () => {}, onLeave: () => {} };
  }
  return ctx;
}

/**
 * CardHoverZone — wraps a hoverable card so hovering it drives the pinned
 * top-right preview. Desktop only; on touch devices the existing CardTooltip
 * long-press behaviour is unchanged (this only listens to mouse events).
 */
export const CardHoverZone: React.FC<{
  card: CardType;
  className?: string;
  children: React.ReactNode;
}> = ({ card, className, children }) => {
  const { onEnter, onLeave } = useCardHover();
  return (
    <div
      className={className}
      onMouseEnter={() => onEnter(card)}
      onMouseLeave={onLeave}
    >
      {children}
    </div>
  );
};

export default CardHoverContext;
