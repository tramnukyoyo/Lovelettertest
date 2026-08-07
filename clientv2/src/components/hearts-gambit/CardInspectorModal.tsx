import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Play, Check, RotateCcw, ArrowLeft, User } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import type { CardType, Player } from '../../types';
import DynamicCard from './DynamicCard';
import { getTranslatedCardName, getTranslatedCardDescription } from './cardDatabase';
import { getTranslation, getCurrentLanguage } from '../../utils/gameTranslations';
import { Portal } from '../../utils/portal';
import { Avatar } from '../core/Avatar';
import '../../styles/game/prime-suspect-card-inspector.css';

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
  const language = getCurrentLanguage();
  const t = (key: string) => getTranslation(key as any, language);
  const reduceMotion = useReducedMotion();

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

  const currentCardName = getTranslatedCardName(currentCard.card, language);
  // The card FACE already prints the short description — the reason to open a
  // dossier is the long-form rule text (same source as the Rules modal).
  const longRule = t(`rules.detail.${currentCard.card}`);
  const briefText = longRule && longRule !== `rules.detail.${currentCard.card}`
    ? longRule
    : getTranslatedCardDescription(currentCard.card, language);
  // `label` is set to the card name by every caller — only show it if it adds
  // something the title does not already say.
  const showLabel = !!currentCard.label && currentCard.label !== currentCardName;

  // ONE position readout. When the dot pager renders (2–10 exhibits) it is the
  // single source of position — it already carries `aria-current` plus a
  // per-dot "Go to card N" label — so the eyebrow stays pure provenance and can
  // never contradict the pill. Above 10 cards there is no pager, so the eyebrow
  // takes the counter back rather than leaving the reader without one.
  const hasPager = cards.length > 1 && cards.length <= 10;
  const eyebrow = cards.length > 1 && !hasPager
    ? `${title} · ${currentIndex + 1}/${cards.length}`
    : title;

  return (
    <Portal>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="hg-inspector-modal settings-modal-backdrop"
          data-broadcast-mirror-portal="card-inspector"
          role="dialog"
          aria-modal="true"
          aria-labelledby="hg-inspector-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            className="settings-modal-panel hg-panel hg-candlelight hgi-panel"
            onClick={(e) => e.stopPropagation()}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
          >
            {/* Dossier tab: provenance eyebrow + the exhibit's name */}
            <div className="settings-modal-header hgi-header">
              <div className="settings-modal-title">
                <div className="settings-modal-eyebrow hgi-eyebrow">{eyebrow}</div>
                <h2 id="hg-inspector-title">{currentCardName}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="settings-modal-close hgi-close"
                aria-label={t('cardInspector.closeInspector')}
              >
                <X size={20} />
              </button>
            </div>

            {/* Exhibit + case notes */}
            <div className="settings-modal-content hgi-content">
              <div className="hgi-stage">
                {cards.length > 1 && (
                  <button
                    type="button"
                    onClick={goToPrev}
                    className="hgi-nav hgi-nav--prev"
                    aria-label={t('cardInspector.previousCard')}
                  >
                    <ChevronLeft size={22} />
                  </button>
                )}

                <motion.div
                  key={currentIndex}
                  initial={reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, x: swipeDirection === 'left' ? 60 : swipeDirection === 'right' ? -60 : 0 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={reduceMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 300, damping: 30 }}
                  className={`hgi-card-frame${selectedIndex === currentIndex ? ' is-selected' : ''}`}
                  drag={cards.length > 1 ? 'x' : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={handleDragEnd}
                >
                  <DynamicCard
                    cardType={currentCard.card}
                    className="hg-inspector-card"
                  />
                  {selectedIndex === currentIndex && (
                    <div className="hgi-selected-stamp">
                      <Check size={12} />
                      {t('cardInspector.selected')}
                    </div>
                  )}
                </motion.div>

                {cards.length > 1 && (
                  <button
                    type="button"
                    onClick={goToNext}
                    className="hgi-nav hgi-nav--next"
                    aria-label={t('cardInspector.nextCard')}
                  >
                    <ChevronRight size={22} />
                  </button>
                )}
              </div>

              <div className="hgi-info">
                {currentCard.meta && (
                  <div className="hgi-provenance">{currentCard.meta}</div>
                )}
                {showLabel && (
                  <div className="hgi-label">{currentCard.label}</div>
                )}
                {/* Case-notes slip: a labelled torn note clipped into the
                    dossier, not a generic tooltip rectangle. */}
                <div className="hgi-brief">
                  <span className="hgi-brief-label">{t('cardInspector.caseNotes')}</span>
                  <p className="hgi-brief-text">{briefText}</p>
                </div>
              </div>
            </div>

            {/* Hairline footer: pagination · hint · the one primary action */}
            {(cards.length > 1 || (currentCard.source === 'hand' && currentCard.handIndex !== undefined)) && (
              <div className="settings-modal-footer hgi-footer">
                {hasPager && (
                  <div className="hgi-dots">
                    {cards.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentIndex(idx);
                        }}
                        className={`hgi-dot${idx === currentIndex ? ' is-active' : ''}`}
                        aria-label={t('cardInspector.goToCard').replace('{number}', String(idx + 1))}
                        aria-current={idx === currentIndex ? 'true' : 'false'}
                      >
                        <span className="hgi-dot-pill" />
                      </button>
                    ))}
                  </div>
                )}

                {cards.length > 1 && (
                  <div className="hgi-hint">{t('cardInspector.navigateHint')}</div>
                )}

                {currentCard.source === 'hand' && currentCard.handIndex !== undefined && (
                  step === 'SELECTED' && selectedIndex === currentIndex ? (
                    <div className="hgi-actions">
                      <button
                        type="button"
                        onClick={handleCancelSelection}
                        className="ps-btn ps-btn--ghost"
                      >
                        <RotateCcw size={16} />
                        {t('cardInspector.chooseAnother')}
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmSelection}
                        className="ps-btn ps-btn--primary"
                      >
                        <Check size={18} />
                        {t('common.confirm')}
                      </button>
                    </div>
                  ) : currentCard.canPlay ? (
                    <div className="hgi-actions">
                      <button
                        type="button"
                        onClick={() => handleSelectCard(currentIndex)}
                        className="ps-btn ps-btn--primary"
                      >
                        <Play size={18} />
                        {t('cardInspector.selectThisCard')}
                      </button>
                    </div>
                  ) : (
                    <div className="hgi-actions">
                      <button
                        type="button"
                        disabled
                        className="ps-btn ps-btn--ghost hgi-btn-sealed"
                      >
                        {t('cardInspector.cannotPlayCard')}
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </motion.div>

          {/* TARGET_SELECT — name your suspect */}
          {step === 'TARGET_SELECT' && (
            <div
              className="hgi-scrim"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className="settings-modal-panel hg-panel hg-candlelight hgi-subpanel"
              >
                <div className="settings-modal-header">
                  <div className="settings-modal-title">
                    <div className="settings-modal-eyebrow hgi-eyebrow">
                      {t('cardInspector.eyebrowTarget')}
                    </div>
                    <h2>{t('cardInspector.selectTarget')}</h2>
                  </div>
                </div>

                <div className="settings-modal-content hgi-subcontent">
                  <div className="hgi-suspects">
                    {availableTargets.map(player => (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => handleSelectTarget(player.id!)}
                        className={`hgi-suspect${targetId === player.id ? ' is-target' : ''}${player.isImmune ? ' is-immune' : ''}`}
                      >
                        <span className="hgi-suspect-avatar">
                          <Avatar src={player.avatarUrl} alt={player.name} />
                        </span>
                        <span className="hgi-suspect-name">{player.name}</span>
                        {player.isImmune && (
                          <span className="hgi-suspect-flag">{t('cardInspector.protected')}</span>
                        )}
                        {targetId === player.id && (
                          <span className="hgi-seal" aria-hidden="true"><Check size={14} /></span>
                        )}
                      </button>
                    ))}

                    {/* Self option for Blackmailer (card 5) */}
                    {pendingCard === 5 && meId && (
                      <button
                        type="button"
                        onClick={() => handleSelectTarget(meId)}
                        className={`hgi-suspect${targetId === meId ? ' is-target' : ''}`}
                      >
                        <span className="hgi-suspect-self">
                          <User size={26} />
                        </span>
                        <span className="hgi-suspect-name">{t('cardInspector.yourself')}</span>
                        {targetId === meId && (
                          <span className="hgi-seal" aria-hidden="true"><Check size={14} /></span>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="settings-modal-footer hgi-subfooter">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="ps-btn ps-btn--ghost"
                  >
                    <ArrowLeft size={16} />
                    {t('common.cancel')}
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* GUESS_SELECT — call the card */}
          {step === 'GUESS_SELECT' && (
            <div
              className="hgi-scrim"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className="settings-modal-panel hg-panel hg-candlelight hgi-subpanel hgi-subpanel--wide"
              >
                <div className="settings-modal-header">
                  <div className="settings-modal-title">
                    <div className="settings-modal-eyebrow hgi-eyebrow">
                      {t('cardInspector.eyebrowGuess')}
                    </div>
                    <h2>{t('cardInspector.guessTheirCard')}</h2>
                  </div>
                </div>

                <div className="settings-modal-content hgi-subcontent">
                  <div className="hgi-guesses">
                    {([2, 3, 4, 5, 6, 7, 8] as CardType[]).map(cardNum => (
                      <button
                        key={cardNum}
                        type="button"
                        onClick={() => handleSelectGuess(cardNum)}
                        className={`hgi-guess${guessCard === cardNum ? ' is-picked' : ''}`}
                        aria-pressed={guessCard === cardNum}
                        aria-label={getTranslatedCardName(cardNum, language)}
                      >
                        <DynamicCard
                          cardType={cardNum}
                          className="hg-guess-card-modal"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-modal-footer hgi-subfooter">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="ps-btn ps-btn--ghost"
                  >
                    <ArrowLeft size={16} />
                    {t('cardInspector.back')}
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* READY_TO_PLAY — file the accusation */}
          {step === 'READY_TO_PLAY' && pendingCard !== null && (
            <div
              className="hgi-scrim"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className="settings-modal-panel hg-panel hg-candlelight hgi-subpanel"
              >
                <div className="settings-modal-header">
                  <div className="settings-modal-title">
                    <div className="settings-modal-eyebrow hgi-eyebrow">{t('cardInspector.eyebrowConfirm')}</div>
                    <h2>{getTranslatedCardName(pendingCard, language)}</h2>
                  </div>
                </div>

                <div className="settings-modal-content hgi-subcontent">
                  <div className="hgi-preview">
                    <DynamicCard
                      cardType={pendingCard}
                      className="hg-confirmation-card"
                    />
                  </div>

                  <div className="hgi-summary">
                    {targetId && (
                      <div className="hgi-summary-row">
                        {t('game.target')}: <strong>
                          {targetId === meId
                            ? t('cardInspector.yourself')
                            : otherPlayers?.find(p => p.id === targetId)?.name || t('card.unknown')}
                        </strong>
                      </div>
                    )}
                    {guessCard && (
                      <div className="hgi-summary-row">
                        {t('cardInspector.guessing')}: <strong>{getTranslatedCardName(guessCard, language)}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className="settings-modal-footer hgi-subfooter">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="ps-btn ps-btn--ghost"
                  >
                    <ArrowLeft size={16} />
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handlePlayClick}
                    className="ps-btn ps-btn--primary"
                  >
                    <Play size={16} />
                    {t('cardInspector.playCard')}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
    </Portal>
  );
};

export default CardInspectorModal;
