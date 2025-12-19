import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { ChevronUp, ChevronDown, Layers } from 'lucide-react';
import type { CardType, Player, Lobby } from '../../types';
import DynamicCard from './DynamicCard';
import { CARD_NAMES } from './cardDatabase';

interface CaseFileSheetProps {
  /** Player's current hand */
  hand: CardType[];
  /** Currently selected card index */
  selectedCardIndex: number | null;
  /** Callback when a card is selected */
  onSelectCard: (index: number) => void;
  /** Callback when a card is inspected (tap and hold) */
  onInspectCard?: (card: CardType, index: number) => void;
  /** Is it the player's turn? */
  isMyTurn: boolean;
  /** Is the player waiting to draw? */
  waitingToDraw: boolean;
  /** Is the player eliminated? */
  amEliminated: boolean;
  /** Currently selected card type (derived from index) */
  selectedCard: CardType | null;
  /** Target player ID */
  targetId: string | null;
  /** Set target player */
  onSetTargetId: (id: string | null) => void;
  /** Guess card for Inspector */
  guessCard: CardType | null;
  /** Set guess card */
  onSetGuessCard: (card: CardType | null) => void;
  /** All opponents protected? */
  allOpponentsProtected: boolean;
  /** Other players for target selection */
  otherPlayers: Player[];
  /** Current player */
  me: Player | undefined;
  /** Callback to play card */
  onPlayCard: () => void;
  /** Callback to cancel selection */
  onCancel: () => void;
  /** Must play Accomplice card? */
  mustPlayAccomplice: boolean;
  /** Lobby for finding player names */
  lobby: Lobby;
}

const CaseFileSheet: React.FC<CaseFileSheetProps> = ({
  hand,
  selectedCardIndex,
  onSelectCard,
  onInspectCard,
  isMyTurn,
  waitingToDraw,
  amEliminated,
  selectedCard,
  targetId,
  onSetTargetId,
  guessCard,
  onSetGuessCard,
  allOpponentsProtected,
  otherPlayers,
  me,
  onPlayCard,
  onCancel,
  mustPlayAccomplice,
  lobby,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const controls = useAnimation();
  const sheetRef = useRef<HTMLDivElement>(null);

  // Auto-expand when it's the player's turn and they have cards
  useEffect(() => {
    if (isMyTurn && hand.length > 0 && !waitingToDraw && !amEliminated) {
      setIsExpanded(true);
    }
  }, [isMyTurn, hand.length, waitingToDraw, amEliminated]);

  // Auto-expand when a card is selected
  useEffect(() => {
    if (selectedCardIndex !== null) {
      setIsExpanded(true);
    }
  }, [selectedCardIndex]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Handle drag to expand/collapse
  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y < -50) {
      setIsExpanded(true);
    } else if (info.offset.y > 50) {
      setIsExpanded(false);
    }
  };

  // Determine if we need action controls (card selected and it's our turn)
  const showActions = isMyTurn && selectedCard !== null && !waitingToDraw;

  // Cards that need target selection
  const needsTarget = selectedCard && [1, 2, 3, 5, 6].includes(selectedCard);
  const needsGuess = selectedCard === 1;

  // Calculate if confirm should be enabled
  const canConfirm = (() => {
    if (!selectedCard) return false;
    if (needsTarget && !allOpponentsProtected && !targetId) return false;
    if (needsGuess && !allOpponentsProtected && !guessCard) return false;
    return true;
  })();

  return (
    <>
      {/* Sheet container */}
      <motion.div
        ref={sheetRef}
        className="fixed left-0 right-0 bottom-0 z-[var(--z-mobile-drawer,998)] bg-[rgba(0,0,0,0.95)] backdrop-blur-md rounded-t-2xl border-t border-[rgba(var(--accent-color-rgb),0.25)] shadow-[0_-4px_30px_rgba(0,0,0,0.5)] safe-bottom"
        initial={false}
        animate={{
          height: isExpanded ? 'min(45vh, 320px)' : '56px',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Drag handle area */}
        <motion.div
          className="flex flex-col items-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none"
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          onClick={toggleExpanded}
        >
          {/* Handle bar */}
          <div className="w-10 h-1 bg-[var(--parchment-dark)] rounded-full opacity-50 mb-2" />

          {/* Collapsed state info */}
          <div className="flex items-center justify-between w-full px-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--royal-gold)]" />
                <span className="text-sm font-bold text-[var(--parchment)]">
                  {hand.length} card{hand.length !== 1 ? 's' : ''}
                </span>
              </div>

              {isMyTurn && !amEliminated && (
                <span className="bg-[var(--royal-gold)] text-[var(--velvet-dark)] px-2 py-0.5 rounded-full text-xs font-bold animate-pulse">
                  {waitingToDraw ? 'DRAW!' : 'YOUR TURN'}
                </span>
              )}
            </div>

            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronUp className="w-5 h-5 text-[var(--parchment-dark)]" />
            </motion.div>
          </div>
        </motion.div>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-[calc(100%-60px)] overflow-hidden"
            >
              {/* Card carousel */}
              <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 py-2">
                <div className="flex items-end justify-center gap-2 min-w-min h-full">
                  <AnimatePresence>
                    {hand.map((card, idx) => (
                      <motion.div
                        key={`mobile-card-${card}-${idx}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{
                          opacity: 1,
                          scale: selectedCardIndex === idx ? 1.05 : 1,
                          y: selectedCardIndex === idx ? -8 : 0,
                        }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className={`
                          flex-shrink-0 transition-all
                          ${!isMyTurn || amEliminated || waitingToDraw ? 'opacity-60' : 'cursor-pointer'}
                          ${selectedCardIndex === idx ? 'ring-2 ring-[var(--royal-gold)] rounded-xl' : ''}
                        `}
                        onClick={() => {
                          if (isMyTurn && !waitingToDraw && !amEliminated) {
                            onSelectCard(idx);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (onInspectCard) {
                            onInspectCard(card, idx);
                          }
                        }}
                      >
                        <DynamicCard
                          cardType={card}
                          selected={selectedCardIndex === idx}
                          className="hg-mobile-hand-card"
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Action controls */}
              {showActions && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-t border-[rgba(var(--accent-color-rgb),0.2)] px-4 py-3 bg-[rgba(0,0,0,0.5)]"
                >
                  {/* Playing card indicator */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--parchment-dark)] uppercase">Playing:</span>
                      <span className="font-bold text-[var(--royal-gold)]">{CARD_NAMES[selectedCard]}</span>
                    </div>

                    {/* Target indicator (for non-Inspector cards) */}
                    {needsTarget && selectedCard !== 1 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--parchment-dark)] uppercase">Target:</span>
                        {allOpponentsProtected ? (
                          <span className="text-xs text-[var(--royal-gold-light)]">
                            {selectedCard === 5 ? 'Self' : 'None'}
                          </span>
                        ) : targetId ? (
                          <span className="text-xs text-[var(--royal-gold-light)]">
                            {lobby.players.find(p => p.id === targetId)?.name}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--royal-crimson-light)] animate-pulse">
                            Select Above
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Target selection for Blackmailer (card 5) */}
                  {selectedCard === 5 && !allOpponentsProtected && (
                    <div className="mb-3">
                      <select
                        className="w-full bg-[var(--velvet-dark)] border border-[rgba(var(--accent-color-rgb),0.30)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--royal-gold)] text-white"
                        value={targetId || ''}
                        onChange={e => onSetTargetId(e.target.value)}
                      >
                        <option value="">Select Target...</option>
                        <option value={me?.id}>Self</option>
                        {otherPlayers.map(
                          p =>
                            !p.isEliminated &&
                            !p.isImmune && (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            )
                        )}
                      </select>
                    </div>
                  )}

                  {/* Inspector card selection grid */}
                  {needsGuess && (
                    <div className="mb-3">
                      <span className="text-xs text-[var(--parchment-dark)] uppercase block mb-2">Guess Card:</span>
                      <div className="grid grid-cols-7 gap-1">
                        {[2, 3, 4, 5, 6, 7, 8].map(cardNum => (
                          <button
                            key={cardNum}
                            onClick={() => !allOpponentsProtected && onSetGuessCard(cardNum as CardType)}
                            disabled={allOpponentsProtected}
                            className={`
                              aspect-[2/3] rounded-lg border-2 transition-all flex items-center justify-center text-xs font-bold
                              ${guessCard === cardNum
                                ? 'border-[var(--royal-gold)] bg-[var(--royal-gold)] text-[var(--velvet-dark)]'
                                : 'border-[rgba(var(--accent-color-rgb),0.3)] bg-[rgba(var(--accent-color-rgb),0.1)] text-[var(--parchment)]'
                              }
                              ${allOpponentsProtected ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
                            `}
                          >
                            {cardNum}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confirm/Cancel buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={onPlayCard}
                      disabled={!canConfirm}
                      className="flex-1 bg-[var(--royal-crimson)] hover:bg-[var(--royal-crimson-light)] disabled:opacity-50 disabled:grayscale text-white py-3 rounded-xl font-bold text-sm transition-all min-h-[48px]"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={onCancel}
                      className="px-6 py-3 bg-[rgba(var(--accent-color-rgb),0.2)] hover:bg-[rgba(var(--accent-color-rgb),0.3)] text-[var(--parchment)] rounded-xl font-bold text-sm transition-all min-h-[48px]"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

export default CaseFileSheet;
