import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Play, Check, RotateCcw, ArrowLeft, User } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import type { CardType, Player } from '../../types';
import DynamicCard from './DynamicCard';
import { CARD_NAMES, CARD_DESCRIPTIONS } from './cardDatabase';

// Step flow for playing cards that need targets/guesses
type ModalStep = 'BROWSING' | 'SELECTED' | 'TARGET_SELECT' | 'GUESS_SELECT' | 'READY_TO_PLAY';

// Cards that need additional input
const CARDS_NEEDING_TARGET = [1, 2, 3, 5, 6];
const CARDS_NEEDING_GUESS = [1]; // Only Inspector

export interface InspectorCard {
  card: CardType;
  source: 'hand' | 'discard' | 'evidence' | 'opponent';
  label?: string;
  meta?: string;
  canPlay?: boolean;
  handIndex?: number;
}

interface CardInspectorModalProps {
  /** Cards to display in the inspector */
  cards: InspectorCard[];
  /** Initial index to show */
  initialIndex?: number;
  /** Is the modal open */
  isOpen: boolean;
  /** Close the modal */
  onClose: () => void;
  /** Called when user wants to play/select a card from their hand (fallback) */
  onPlayCard?: (card: CardType, handIndex: number) => void;
  /** Title for the inspector */
  title?: string;
  /** Other players for target selection */
  otherPlayers?: Player[];
  /** Socket for emitting play:card */
  socket?: Socket;
  /** Current player's ID (for Blackmailer self-target) */
  meId?: string;
  /** Whether all opponents are protected/eliminated */
  allOpponentsProtected?: boolean;
}

const CardInspectorModal: React.FC<CardInspectorModalProps> = ({
  cards,
  initialIndex = 0,
  isOpen,
  onClose,
  onPlayCard,
  title = 'Card Inspector',
  otherPlayers,
  socket,
  meId,
  allOpponentsProtected = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  // Track which card is selected (pending confirmation)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Multi-step flow state
  const [step, setStep] = useState<ModalStep>('BROWSING');
  const [pendingCard, setPendingCard] = useState<CardType | null>(null);
  const [pendingHandIndex, setPendingHandIndex] = useState<number | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [guessCard, setGuessCard] = useState<CardType | null>(null);

  // Reset all state when modal opens/closes
  const resetState = useCallback(() => {
    setStep('BROWSING');
    setSelectedIndex(null);
    setPendingCard(null);
    setPendingHandIndex(null);
    setTargetId(null);
    setGuessCard(null);
  }, []);

  // Reset index and selection when cards change or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      resetState();
    }
  }, [isOpen, initialIndex, resetState]);

  const handleSelectCard = useCallback((index: number) => {
    setSelectedIndex(index);
    setStep('SELECTED');
  }, []);

  const handleCancelSelection = useCallback(() => {
    setSelectedIndex(null);
    setStep('BROWSING');
  }, []);

  // Handle confirming card selection - may go to target/guess selection
  const handleConfirmSelection = useCallback(() => {
    if (selectedIndex === null) return;
    const selectedCard = cards[selectedIndex];
    if (!selectedCard?.canPlay || selectedCard.handIndex === undefined) return;

    const card = selectedCard.card;
    setPendingCard(card);
    setPendingHandIndex(selectedCard.handIndex);

    // Check if card needs target selection
    const needsTarget = CARDS_NEEDING_TARGET.includes(card);

    if (needsTarget && !allOpponentsProtected) {
      setStep('TARGET_SELECT');
    } else {
      // Cards 4, 7, 8 or all opponents protected - play directly
      handleFinalPlay(card, selectedCard.handIndex, null, null);
    }
  }, [selectedIndex, cards, allOpponentsProtected]);

  // Handle target selection
  const handleSelectTarget = useCallback((playerId: string) => {
    setTargetId(playerId);

    // Inspector (card 1) needs guess selection too
    if (pendingCard !== null && CARDS_NEEDING_GUESS.includes(pendingCard)) {
      setStep('GUESS_SELECT');
    } else {
      setStep('READY_TO_PLAY');
    }
  }, [pendingCard]);

  // Handle guess selection
  const handleSelectGuess = useCallback((guess: CardType) => {
    setGuessCard(guess);
    setStep('READY_TO_PLAY');
  }, []);

  // Final play action - emit to socket
  const handleFinalPlay = useCallback((
    card: CardType,
    handIndex: number,
    target: string | null,
    guess: CardType | null
  ) => {
    // Handle Blackmailer (5) self-target when all protected
    let finalTarget = target;
    if (card === 5 && allOpponentsProtected && meId) {
      finalTarget = meId;
    }

    if (socket) {
      socket.emit('play:card', {
        card,
        targetId: finalTarget,
        guess
      });
    } else if (onPlayCard) {
      // Fallback to existing callback
      onPlayCard(card, handIndex);
    }

    resetState();
    onClose();
  }, [socket, meId, allOpponentsProtected, onPlayCard, onClose, resetState]);

  // Handle play button click in READY_TO_PLAY step
  const handlePlayClick = useCallback(() => {
    if (pendingCard === null || pendingHandIndex === null) return;
    handleFinalPlay(pendingCard, pendingHandIndex, targetId, guessCard);
  }, [pendingCard, pendingHandIndex, targetId, guessCard, handleFinalPlay]);

  // Go back one step
  const handleBack = useCallback(() => {
    switch (step) {
      case 'TARGET_SELECT':
        setStep('SELECTED');
        setTargetId(null);
        break;
      case 'GUESS_SELECT':
        setStep('TARGET_SELECT');
        setGuessCard(null);
        break;
      case 'READY_TO_PLAY':
        if (pendingCard !== null && CARDS_NEEDING_GUESS.includes(pendingCard)) {
          setStep('GUESS_SELECT');
        } else {
          setStep('TARGET_SELECT');
        }
        break;
      default:
        break;
    }
  }, [step, pendingCard]);

  // Get available targets (not eliminated, optionally not immune)
  const availableTargets = otherPlayers?.filter(p => {
    if (p.isEliminated) return false;
    // Inspector (1) can target immune players
    if (pendingCard === 1) return true;
    // Other cards cannot target immune players
    return !p.isImmune;
  }) || [];

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrev();
          break;
        case 'ArrowRight':
          goToNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, cards.length]);

  const goToPrev = useCallback(() => {
    if (cards.length <= 1) return;
    setSwipeDirection('right');
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  }, [cards.length]);

  const goToNext = useCallback(() => {
    if (cards.length <= 1) return;
    setSwipeDirection('left');
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  }, [cards.length]);

  // Handle swipe gestures
  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x > threshold) {
      goToPrev();
    } else if (info.offset.x < -threshold) {
      goToNext();
    }
  };

  const currentCard = cards[currentIndex];

  if (!currentCard) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="hg-inspector-modal fixed inset-0 z-[110] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* Header */}
          <div
            className="hg-inspector-header absolute top-0 left-0 right-0 flex items-center justify-between p-4 safe-top"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="hg-inspector-title text-xs text-[var(--parchment-dark)] uppercase tracking-wide">{title}</div>
              {cards.length > 1 && (
                <div className="hg-inspector-counter text-sm text-[var(--parchment)]">
                  {currentIndex + 1} / {cards.length}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="hg-inspector-close hg-icon-btn w-10 h-10 flex items-center justify-center rounded-full bg-[rgba(var(--accent-color-rgb),0.2)] hover:bg-[rgba(var(--accent-color-rgb),0.3)] transition-colors"
              aria-label="Close inspector"
            >
              <X className="w-5 h-5 text-[#f6f0e6]" />
            </button>
          </div>

          {/* Card content area */}
          <motion.div
            className="hg-inspector-content flex-1 flex items-center justify-center w-full px-4 py-20"
            onClick={(e) => e.stopPropagation()}
            drag={cards.length > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
          >
            {/* Previous button */}
            {cards.length > 1 && (
              <button
                onClick={goToPrev}
                className="hg-inspector-nav hg-inspector-nav-prev hg-icon-btn absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-[rgba(212,175,55,0.4)] hover:bg-[rgba(212,175,55,0.5)] transition-colors z-20 border border-[rgba(212,175,55,0.5)]"
                aria-label="Previous card"
              >
                <ChevronLeft className="w-6 h-6 text-[#f6f0e6]" />
              </button>
            )}

            {/* Card display */}
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: swipeDirection === 'left' ? 100 : swipeDirection === 'right' ? -100 : 0, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="hg-inspector-card-area flex flex-col items-center"
            >
              {/* Card with selection highlight - enhanced glow effect */}
              <div className={`relative ${selectedIndex === currentIndex ? 'hg-inspector-card-selected' : ''}`}>
                {selectedIndex === currentIndex && (
                  <>
                    {/* Outer glow */}
                    <div className="absolute -inset-4 rounded-3xl bg-[var(--royal-gold)]/20 blur-md" />
                    {/* Inner highlight border */}
                    <div className="absolute -inset-3 rounded-2xl bg-[var(--royal-gold)]/50 border-[3px] border-[var(--royal-gold)] shadow-[0_0_25px_rgba(210,178,90,0.7)] animate-pulse" />
                  </>
                )}
                <DynamicCard
                  cardType={currentCard.card}
                  className="hg-inspector-card relative z-10"
                />
                {selectedIndex === currentIndex && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 bg-[var(--royal-gold)] text-[#1a0f1e] px-4 py-1.5 rounded-full text-xs font-bold shadow-[0_0_15px_rgba(210,178,90,0.5)]">
                    ✓ Selected
                  </div>
                )}
              </div>

              {/* Card info */}
              <div className="hg-inspector-info mt-4 text-center max-w-xs">
                <h3 className="text-lg font-bold text-[var(--royal-gold)]">
                  {CARD_NAMES[currentCard.card]}
                </h3>
                {currentCard.label && (
                  <div className="text-sm text-[var(--parchment-dark)] mt-1">{currentCard.label}</div>
                )}
                {currentCard.meta && (
                  <div className="text-xs text-[var(--parchment-dark)] mt-1 opacity-75">{currentCard.meta}</div>
                )}
                <p className="text-sm text-[var(--parchment)] mt-2 opacity-80">
                  {CARD_DESCRIPTIONS[currentCard.card]}
                </p>
              </div>
            </motion.div>

            {/* Next button */}
            {cards.length > 1 && (
              <button
                onClick={goToNext}
                className="hg-inspector-nav hg-inspector-nav-next hg-icon-btn absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-[rgba(212,175,55,0.4)] hover:bg-[rgba(212,175,55,0.5)] transition-colors z-20 border border-[rgba(212,175,55,0.5)]"
                aria-label="Next card"
              >
                <ChevronRight className="w-6 h-6 text-[#f6f0e6]" />
              </button>
            )}
          </motion.div>

          {/* Action panels - different UI for each step */}
          {currentCard.source === 'hand' && currentCard.handIndex !== undefined && (
            <div
              className="hg-inspector-actions absolute bottom-0 left-0 right-0 safe-bottom"
              onClick={(e) => e.stopPropagation()}
            >
              {/* BROWSING / SELECTED state - card selection buttons */}
              {(step === 'BROWSING' || step === 'SELECTED') && (
                <div className="p-4">
                  {step === 'SELECTED' && selectedIndex === currentIndex ? (
                    /* Card is selected, show confirm/cancel */
                    <div className="flex gap-3">
                      <button
                        onClick={handleCancelSelection}
                        className="flex-1 flex items-center justify-center gap-2 bg-[rgba(var(--accent-color-rgb),0.3)] hover:bg-[rgba(var(--accent-color-rgb),0.4)] text-[var(--parchment)] py-4 rounded-xl font-bold text-sm transition-all min-h-[56px] border border-[rgba(var(--accent-color-rgb),0.5)]"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Choose Another
                      </button>
                      <button
                        onClick={handleConfirmSelection}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-bold text-sm transition-all min-h-[56px]"
                      >
                        <Check className="w-5 h-5" />
                        Confirm
                      </button>
                    </div>
                  ) : currentCard.canPlay ? (
                    /* Show Select button */
                    <button
                      onClick={() => handleSelectCard(currentIndex)}
                      className="w-full flex items-center justify-center gap-2 bg-[var(--royal-crimson)] hover:bg-[var(--royal-crimson-light)] text-white py-4 rounded-xl font-bold text-sm transition-all min-h-[56px]"
                    >
                      <Play className="w-5 h-5" />
                      Select This Card
                    </button>
                  ) : (
                    /* Card can't be played */
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 bg-gray-600/50 text-gray-400 py-4 rounded-xl font-bold text-sm min-h-[56px] cursor-not-allowed"
                    >
                      Cannot Play This Card
                    </button>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TARGET_SELECT - Centered Modal Overlay */}
          {step === 'TARGET_SELECT' && (
            <div
              className="fixed inset-0 bg-black/85 z-[150] flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#1a0f1e] rounded-2xl p-5 max-w-xs w-full border border-[var(--royal-gold)]/30 shadow-[0_0_30px_rgba(210,178,90,0.2)]"
              >
                <h3 className="text-center text-lg font-bold text-[var(--royal-gold)] mb-4">
                  Select Target
                </h3>

                {/* Player grid - 2 columns */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {availableTargets.map(player => (
                    <button
                      key={player.id}
                      onClick={() => handleSelectTarget(player.id!)}
                      className={`
                        flex flex-col items-center p-3 rounded-xl transition-all active:scale-95
                        ${targetId === player.id
                          ? 'bg-[var(--royal-gold)]/20 ring-2 ring-[var(--royal-gold)] shadow-[0_0_15px_rgba(210,178,90,0.3)]'
                          : 'bg-[rgba(var(--accent-color-rgb),0.1)] hover:bg-[rgba(var(--accent-color-rgb),0.2)]'}
                        ${player.isImmune ? 'opacity-60' : ''}
                      `}
                    >
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--royal-gold)] to-[var(--royal-crimson)] p-0.5 mb-2 overflow-hidden">
                        {player.avatarUrl ? (
                          <img
                            src={player.avatarUrl}
                            alt={player.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-[#1a0f1e] flex items-center justify-center">
                            <User className="w-7 h-7 text-[var(--parchment)]" />
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-[var(--parchment)] font-medium truncate max-w-full">
                        {player.name}
                      </span>
                      {player.isImmune && (
                        <span className="text-[10px] text-yellow-400 mt-0.5">Protected</span>
                      )}
                    </button>
                  ))}

                  {/* Self option for Blackmailer (card 5) */}
                  {pendingCard === 5 && meId && (
                    <button
                      onClick={() => handleSelectTarget(meId)}
                      className={`
                        flex flex-col items-center p-3 rounded-xl transition-all active:scale-95
                        ${targetId === meId
                          ? 'bg-[var(--royal-gold)]/20 ring-2 ring-[var(--royal-gold)] shadow-[0_0_15px_rgba(210,178,90,0.3)]'
                          : 'bg-[rgba(var(--accent-color-rgb),0.1)] hover:bg-[rgba(var(--accent-color-rgb),0.2)]'}
                      `}
                    >
                      <div className="w-14 h-14 rounded-full bg-[var(--royal-crimson)] flex items-center justify-center mb-2">
                        <User className="w-7 h-7 text-white" />
                      </div>
                      <span className="text-sm text-[var(--parchment)] font-medium">Yourself</span>
                    </button>
                  )}
                </div>

                {/* Cancel button */}
                <button
                  onClick={handleBack}
                  className="w-full py-3 flex items-center justify-center gap-2 bg-[rgba(var(--accent-color-rgb),0.15)] hover:bg-[rgba(var(--accent-color-rgb),0.25)] text-[var(--parchment)] rounded-xl font-bold text-sm transition-all border border-[rgba(var(--accent-color-rgb),0.3)]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Cancel
                </button>
              </motion.div>
            </div>
          )}

          {/* GUESS_SELECT - Centered Modal Overlay */}
          {step === 'GUESS_SELECT' && (
            <div
              className="fixed inset-0 bg-black/85 z-[150] flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#1a0f1e] rounded-2xl p-5 max-w-sm w-full border border-[var(--royal-gold)]/30 shadow-[0_0_30px_rgba(210,178,90,0.2)]"
              >
                <h3 className="text-center text-lg font-bold text-[var(--royal-gold)] mb-4">
                  Guess Their Card
                </h3>

                {/* Cards 2-8 grid */}
                <div className="grid grid-cols-4 gap-2 mb-4 justify-items-center">
                  {([2, 3, 4, 5, 6, 7, 8] as CardType[]).map(cardNum => (
                    <button
                      key={cardNum}
                      onClick={() => handleSelectGuess(cardNum)}
                      className={`
                        transition-all active:scale-95 rounded-lg
                        ${guessCard === cardNum
                          ? 'ring-2 ring-[var(--royal-gold)] scale-110 shadow-[0_0_15px_rgba(210,178,90,0.4)]'
                          : 'opacity-75 hover:opacity-100 hover:scale-105'}
                      `}
                    >
                      <DynamicCard
                        cardType={cardNum}
                        className="hg-guess-card-modal"
                      />
                    </button>
                  ))}
                </div>

                {/* Cancel button */}
                <button
                  onClick={handleBack}
                  className="w-full py-3 flex items-center justify-center gap-2 bg-[rgba(var(--accent-color-rgb),0.15)] hover:bg-[rgba(var(--accent-color-rgb),0.25)] text-[var(--parchment)] rounded-xl font-bold text-sm transition-all border border-[rgba(var(--accent-color-rgb),0.3)]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </motion.div>
            </div>
          )}

          {/* READY_TO_PLAY - Confirmation Modal with Card Preview */}
          {step === 'READY_TO_PLAY' && pendingCard !== null && (
            <div
              className="fixed inset-0 bg-black/85 z-[150] flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#1a0f1e] rounded-2xl p-5 max-w-xs w-full border border-[var(--royal-gold)]/30 shadow-[0_0_30px_rgba(210,178,90,0.2)]"
              >
                {/* Card preview with glow */}
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div className="absolute -inset-3 rounded-2xl bg-[var(--royal-gold)]/30 blur-md" />
                    <DynamicCard
                      cardType={pendingCard}
                      className="hg-confirmation-card relative z-10"
                    />
                  </div>
                </div>

                {/* Selection summary */}
                <div className="text-center mb-4 space-y-1">
                  <div className="text-lg font-bold text-[var(--royal-gold)]">
                    {CARD_NAMES[pendingCard]}
                  </div>
                  {targetId && (
                    <div className="text-sm text-[var(--parchment)]">
                      Target: <span className="font-bold">
                        {targetId === meId
                          ? 'Yourself'
                          : otherPlayers?.find(p => p.id === targetId)?.name || 'Unknown'}
                      </span>
                    </div>
                  )}
                  {guessCard && (
                    <div className="text-sm text-[var(--parchment-dark)]">
                      Guessing: <span className="font-bold text-[var(--royal-gold)]">{CARD_NAMES[guessCard]}</span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleBack}
                    className="flex-1 py-3 flex items-center justify-center gap-2 bg-[rgba(var(--accent-color-rgb),0.15)] hover:bg-[rgba(var(--accent-color-rgb),0.25)] text-[var(--parchment)] rounded-xl font-bold text-sm transition-all border border-[rgba(var(--accent-color-rgb),0.3)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePlayClick}
                    className="flex-1 py-3 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-sm transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                  >
                    <Play className="w-4 h-4" />
                    Play Card
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Swipe hint */}
          {cards.length > 1 && (
            <div className="hg-inspector-hint absolute bottom-20 left-1/2 -translate-x-1/2 text-xs text-[var(--parchment-dark)] opacity-50">
              Swipe to navigate
            </div>
          )}

          {/* Pagination dots */}
          {cards.length > 1 && cards.length <= 10 && (
            <div className="hg-inspector-dots absolute bottom-28 left-1/2 -translate-x-1/2 flex gap-2">
              {cards.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentIndex
                      ? 'active bg-[var(--royal-gold)] w-4'
                      : 'bg-[var(--parchment-dark)] opacity-50 hover:opacity-75'
                  }`}
                  aria-label={`Go to card ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CardInspectorModal;
