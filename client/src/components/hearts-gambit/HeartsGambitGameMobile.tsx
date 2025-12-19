import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Lobby, CardType, Player } from '../../types';
import type { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, FileText, Copy, Check, User, ArrowLeft, Play, X } from 'lucide-react';
import Toast from './Toast';
import DynamicCard from './DynamicCard';
import {
  CARD_NAMES,
  CARD_DESCRIPTIONS,
  CARD_IMAGES,
  CARD_BACK_IMAGE
} from './cardDatabase';
import { playDrawSound, playDropSound, playEliminatedSound } from '../../utils/soundEffects';
import { CardLegendModal } from '../CardLegendModal';
import TutorialCarousel from '../TutorialCarousel';
import OrientationPrompt from './OrientationPrompt';
import MobileOpponentStrip from './MobileOpponentStrip';
import CardInspectorModal, { type InspectorCard } from './CardInspectorModal';
import MobileGameMenu from './MobileGameMenu';

interface HeartsGambitGameMobileProps {
  lobby: Lobby;
  socket: Socket;
}

type DiscardKind = 'play' | 'forced-discard';

// Step flow for playing cards from hand (similar to CardInspectorModal)
type PlayStep = 'IDLE' | 'SELECTED' | 'TARGET_SELECT' | 'GUESS_SELECT' | 'READY_TO_PLAY';

// Cards that need additional input
const CARDS_NEEDING_TARGET = [1, 2, 3, 5, 6];
const CARDS_NEEDING_GUESS = [1]; // Only Inspector

type DiscardEvent = {
  playerId: string;
  playerName: string;
  card: CardType;
  kind: DiscardKind;
  timestamp: number;
};

/**
 * Mobile-optimized version of HeartsGambitGame.
 * Uses a three-layer architecture:
 * - Board Layer (z-0): Opponents, Deck, Discard
 * - HUD Layer (z-10): Turn indicator, Menu
 * - Sheet Layer (z-20): Case File (Hand + Actions)
 */
const HeartsGambitGameMobile: React.FC<HeartsGambitGameMobileProps> = ({ lobby, socket }) => {
  // Game state
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [guessCard, setGuessCard] = useState<CardType | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [playingCard, setPlayingCard] = useState<{ card: CardType; image: string } | null>(null);
  const [playStep, setPlayStep] = useState<PlayStep>('IDLE');

  // UI state
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [inspectorCards, setInspectorCards] = useState<InspectorCard[]>([]);
  const [inspectorIndex, setInspectorIndex] = useState(0);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [inspectorTitle, setInspectorTitle] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [previewCard, setPreviewCard] = useState<CardType | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Copy room link (same as desktop GameHeader)
  const copyRoomLink = useCallback(async () => {
    const baseUrl = window.location.origin;
    const basePath = import.meta.env.BASE_URL || '/';
    const joinUrl = `${baseUrl}${basePath}?invite=${lobby.code}`;

    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      setToast({ message: 'Failed to copy room link', type: 'error' });
    }
  }, [lobby.code]);

  // Refs for animations/tracking
  const [prevTokens, setPrevTokens] = useState(0);
  const prevEliminatedRef = useRef<Set<string>>(new Set());

  // Derived game state
  const me = lobby.players.find(p => p.socketId === lobby.mySocketId);
  const isMyTurn = lobby.gameData?.currentTurn === me?.id;
  const myHand = me?.hand || [];
  const otherPlayers = lobby.players.filter(p => p.id !== me?.id);
  const allOpponentsProtected = otherPlayers.every(p => p.isEliminated || p.isImmune);
  const amEliminated = me?.isEliminated || false;
  const waitingToDraw = isMyTurn && lobby.gameData?.turnPhase === 'draw';
  const mustPlayAccomplice = myHand.includes(7) && (myHand.includes(5) || myHand.includes(6));
  const selectedCard = selectedCardIndex !== null ? myHand[selectedCardIndex] : null;
  const currentTokens = me?.tokens || 0;

  // Discard pile data
  const discardEvents: DiscardEvent[] | null = lobby.gameData?.discardPile?.length
    ? (lobby.gameData.discardPile as DiscardEvent[])
    : null;
  const faceUpCards = lobby.gameData?.faceUpCards || [];
  const totalDiscardedCount = (discardEvents
    ? discardEvents.length
    : lobby.players.reduce((sum, p) => sum + (p.discarded?.length || 0), 0)) + faceUpCards.length;
  const lastDiscardEvent = discardEvents ? discardEvents[discardEvents.length - 1] : null;

  // Token animation tracking
  useEffect(() => {
    if (currentTokens !== prevTokens) {
      setPrevTokens(currentTokens);
    }
  }, [currentTokens, prevTokens]);

  // Elimination sound tracking
  useEffect(() => {
    const currentEliminated = new Set(
      lobby.players.filter(p => p.isEliminated).map(p => p.id)
    );
    const prevEliminated = prevEliminatedRef.current;

    currentEliminated.forEach(id => {
      if (!prevEliminated.has(id)) {
        playEliminatedSound();
      }
    });

    prevEliminatedRef.current = currentEliminated;
  }, [lobby.players]);

  // Socket error handling
  useEffect(() => {
    const handleError = (data: { message: string }) => {
      setToast({ message: data.message, type: 'error' });
    };

    socket.on('error', handleError);
    return () => { socket.off('error', handleError); };
  }, [socket]);

  // Reset all play state
  const resetPlayState = useCallback(() => {
    setSelectedCardIndex(null);
    setTargetId(null);
    setGuessCard(null);
    setPlayStep('IDLE');
  }, []);

  // When card is tapped in hand
  const handleCardTap = useCallback((idx: number) => {
    if (!isMyTurn || waitingToDraw || amEliminated) return;

    if (selectedCardIndex === idx) {
      // Deselect
      resetPlayState();
    } else {
      setSelectedCardIndex(idx);
      setPlayStep('SELECTED');
      // Reset target/guess when selecting a different card
      setTargetId(null);
      setGuessCard(null);
    }
  }, [isMyTurn, waitingToDraw, amEliminated, selectedCardIndex, resetPlayState]);

  // When Confirm is clicked in SELECTED step
  const handleConfirmSelection = useCallback(() => {
    if (selectedCardIndex === null) return;
    const card = myHand[selectedCardIndex];
    const needsTarget = CARDS_NEEDING_TARGET.includes(card) && !allOpponentsProtected;

    if (needsTarget) {
      setPlayStep('TARGET_SELECT');
    } else {
      // Cards 4, 7, 8 or all protected - go directly to confirmation
      setPlayStep('READY_TO_PLAY');
    }
  }, [selectedCardIndex, myHand, allOpponentsProtected]);

  // When target is selected
  const handleSelectTarget = useCallback((playerId: string) => {
    setTargetId(playerId);
    if (selectedCardIndex === null) return;
    const card = myHand[selectedCardIndex];

    if (CARDS_NEEDING_GUESS.includes(card)) {
      setPlayStep('GUESS_SELECT');
    } else {
      setPlayStep('READY_TO_PLAY');
    }
  }, [selectedCardIndex, myHand]);

  // When guess is selected
  const handleSelectGuess = useCallback((guess: CardType) => {
    setGuessCard(guess);
    setPlayStep('READY_TO_PLAY');
  }, []);

  // Go back one step
  const handleBack = useCallback(() => {
    switch (playStep) {
      case 'TARGET_SELECT':
        setPlayStep('SELECTED');
        setTargetId(null);
        break;
      case 'GUESS_SELECT':
        setPlayStep('TARGET_SELECT');
        setGuessCard(null);
        break;
      case 'READY_TO_PLAY':
        if (selectedCard !== null && CARDS_NEEDING_GUESS.includes(selectedCard) && targetId) {
          setPlayStep('GUESS_SELECT');
          setGuessCard(null);
        } else if (selectedCard !== null && CARDS_NEEDING_TARGET.includes(selectedCard) && !allOpponentsProtected) {
          setPlayStep('TARGET_SELECT');
          setTargetId(null);
          setGuessCard(null);
        } else {
          setPlayStep('SELECTED');
        }
        break;
      default:
        resetPlayState();
        break;
    }
  }, [playStep, selectedCard, targetId, allOpponentsProtected, resetPlayState]);

  // Final play action
  const handleFinalPlay = useCallback(() => {
    if (selectedCardIndex === null) return;
    const card = myHand[selectedCardIndex];

    // Handle Blackmailer self-target when all protected
    let finalTargetId = targetId;
    if (card === 5 && allOpponentsProtected && me?.id) {
      finalTargetId = me.id;
    }

    // Animation and sound
    const cardImage = CARD_IMAGES[card];
    setPlayingCard({ card, image: cardImage });
    playDropSound();

    const cardToPlay = card;
    const targetToSend = finalTargetId;
    const guessToSend = guessCard;

    // Reset state
    resetPlayState();

    setTimeout(() => {
      socket.emit('play:card', {
        card: cardToPlay,
        targetId: targetToSend,
        guess: guessToSend
      });
      setPlayingCard(null);
    }, 400);
  }, [selectedCardIndex, myHand, targetId, guessCard, allOpponentsProtected, me, socket, resetPlayState]);

  // Get available targets for current card
  const availableTargets = otherPlayers.filter(p => {
    if (p.isEliminated) return false;
    // Inspector (1) can target immune players
    if (selectedCard === 1) return true;
    // Other cards cannot target immune players
    return !p.isImmune;
  });

  // Card inspection handlers
  const openHandInspector = useCallback((card: CardType, index: number) => {
    const cards: InspectorCard[] = myHand.map((c, i) => ({
      card: c,
      source: 'hand' as const,
      label: CARD_NAMES[c],
      canPlay: isMyTurn && !waitingToDraw && !amEliminated,
      handIndex: i,
    }));
    setInspectorCards(cards);
    setInspectorIndex(index);
    setInspectorTitle('Your Hand');
    setIsInspectorOpen(true);
  }, [myHand, isMyTurn, waitingToDraw, amEliminated]);

  const openOpponentInspector = useCallback((player: Player) => {
    const cards: InspectorCard[] = [];
    for (let i = 0; i < player.handCount; i++) {
      const card = player.hand?.[i];
      if (card !== undefined && card !== 0) {
        cards.push({
          card,
          source: 'opponent',
          label: CARD_NAMES[card],
          meta: `${player.name}'s card`,
        });
      }
    }
    if (cards.length === 0) {
      setToast({ message: `${player.name}'s cards are hidden`, type: 'error' });
      return;
    }
    setInspectorCards(cards);
    setInspectorIndex(0);
    setInspectorTitle(`${player.name}'s Cards`);
    setIsInspectorOpen(true);
  }, []);

  const openDiscardInspector = useCallback(() => {
    const cards: InspectorCard[] = [];

    // Add face-up cards (2-player removal)
    faceUpCards.forEach((card, i) => {
      cards.push({
        card,
        source: 'evidence',
        label: CARD_NAMES[card],
        meta: 'Removed at start',
      });
    });

    // Add discard pile
    if (discardEvents) {
      discardEvents.forEach((evt, i) => {
        cards.push({
          card: evt.card,
          source: 'discard',
          label: CARD_NAMES[evt.card],
          meta: `#${i + 1} - ${evt.playerName}`,
        });
      });
    } else {
      // Fallback to player discards
      lobby.players.forEach(p => {
        p.discarded?.forEach((card, i) => {
          cards.push({
            card,
            source: 'discard',
            label: CARD_NAMES[card],
            meta: `${p.name}'s discard`,
          });
        });
      });
    }

    if (cards.length === 0) {
      setToast({ message: 'No evidence yet', type: 'error' });
      return;
    }

    setInspectorCards(cards);
    setInspectorIndex(cards.length - 1); // Start at newest
    setInspectorTitle('Evidence Locker');
    setIsInspectorOpen(true);
  }, [faceUpCards, discardEvents, lobby.players]);

  const handleInspectorPlayCard = useCallback((card: CardType, handIndex: number) => {
    if (isMyTurn && !waitingToDraw && !amEliminated) {
      setSelectedCardIndex(handIndex);
    }
  }, [isMyTurn, waitingToDraw, amEliminated]);

  if (!lobby.gameData) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--parchment)]">
        Loading Game Data...
      </div>
    );
  }

  return (
    <div className="hearts-gambit-game h-full text-[var(--parchment)] flex flex-col overflow-hidden relative">
      {/* Orientation prompt */}
      <OrientationPrompt />

      {/* HUD Layer - Minimal Top bar with hamburger menu */}
      <div className="z-10 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm px-3 py-2 flex items-center justify-between safe-top border-b border-[rgba(var(--accent-color-rgb),0.15)]">
        <div className="flex items-center gap-2">
          <motion.span
            className="bg-[var(--royal-crimson)] text-[var(--parchment)] text-xs font-black px-2 py-1 rounded-full"
          >
            {me?.tokens} Tokens
          </motion.span>

          {isMyTurn && !amEliminated && (
            <span className="bg-[var(--royal-gold)] text-[var(--velvet-dark)] px-2 py-1 rounded-full text-xs font-bold animate-pulse">
              {waitingToDraw ? 'DRAW!' : 'YOUR TURN'}
            </span>
          )}

          {amEliminated && (
            <span className="bg-red-700 text-white text-xs font-black px-2 py-1 rounded-full flex items-center gap-1">
              <Skull className="w-3 h-3" /> OUT
            </span>
          )}
        </div>

        {/* Hamburger Menu - replaces individual buttons */}
        <MobileGameMenu
          roomCode={lobby.code || 'N/A'}
          onCopyLink={copyRoomLink}
          linkCopied={copyFeedback}
          onLeave={() => {
            if (confirm('Are you sure you want to leave the room?')) {
              socket.emit('player:leave', {});
              window.location.href = '/primesuspect/heartsgambit/';
            }
          }}
          onHowToPlay={() => setIsTutorialOpen(true)}
          onCardLegend={() => setIsLegendOpen(true)}
          playerCount={`${lobby.players.length}/${lobby.maxPlayers || 4}`}
        />
      </div>

      {/* Board Layer - Main content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Opponents strip */}
        <div className="bg-[rgba(0,0,0,0.15)] border-b border-[rgba(var(--accent-color-rgb),0.1)]">
          <MobileOpponentStrip
            players={otherPlayers}
            currentTurnId={lobby.gameData?.currentTurn}
            selectedCard={selectedCard}
            targetId={targetId}
            onSelectTarget={setTargetId}
            onInspectOpponent={openOpponentInspector}
            onPreviewCard={setPreviewCard}
          />
        </div>

        {/* Center area - Deck & Discard - slightly left of center */}
        <div className="absolute inset-0 flex items-center justify-center -translate-x-12 gap-8 pointer-events-none z-0">
          <div className="flex items-center justify-center gap-4 pointer-events-auto">
          {/* Discard Pile */}
          <div className="flex flex-col items-center translate-y-2.5">
            <span className="font-bold text-[var(--royal-gold)] uppercase tracking-wider mb-0.5 block translate-x-6" style={{ fontSize: '12px' }}>
              Evidence
            </span>
            <button
              onClick={openDiscardInspector}
              className="relative hg-mobile-discard-card flex items-center justify-center overflow-visible translate-x-6"
              aria-label="Open evidence locker"
            >
              {/* Top card - no stack effect on mobile */}
              {lastDiscardEvent ? (
                <DynamicCard
                  cardType={lastDiscardEvent.card}
                  className="hg-mobile-evidence-card"
                />
              ) : faceUpCards.length > 0 ? (
                <DynamicCard
                  cardType={faceUpCards[faceUpCards.length - 1]}
                  className="hg-mobile-evidence-card"
                />
              ) : (
                <span className="text-xs text-[var(--parchment-dark)]">Empty</span>
              )}

              {/* Count badge */}
              {totalDiscardedCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-[var(--royal-gold)] text-[var(--velvet-dark)] text-[10px] font-black px-1.5 py-0.5 rounded-full z-10">
                  {totalDiscardedCount}
                </div>
              )}
            </button>
          </div>

          {/* Case File (Deck) */}
          <div className="flex flex-col items-center translate-y-[13px]">
            <span className="font-bold text-[var(--royal-gold)] uppercase tracking-wider mb-0.5 block translate-x-3" style={{ fontSize: '12px' }}>
              Case File <span className="text-[var(--parchment-dark)]">({lobby.gameData.deckCount})</span>
            </span>
            <button
              onClick={() => {
                if (waitingToDraw) {
                  playDrawSound();
                  socket.emit('player:draw', {});
                }
              }}
              className={`relative hg-mobile-deck-card ${
                waitingToDraw ? 'cursor-pointer animate-pulse' : 'cursor-default'
              }`}
              aria-label={waitingToDraw ? 'Draw a card' : 'Deck'}
            >
              {/* Stack effect */}
              {Array.from({ length: Math.min(lobby.gameData.deckCount, 4) }).map((_, i) => (
                <div
                  key={i}
                  className="absolute inset-0"
                  style={{
                    transform: `translate(${i * 0.5}px, ${-i * 0.5}px)`,
                    zIndex: i
                  }}
                >
                  <img
                    src={CARD_BACK_IMAGE}
                    alt=""
                    className="w-full h-full object-cover rounded-lg shadow-lg"
                  />
                </div>
              ))}

              {/* Draw indicator */}
              {waitingToDraw && (
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-20">
                  <span className="bg-[var(--royal-gold)] text-[var(--velvet-dark)] px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap">
                    TAP TO DRAW
                  </span>
                </div>
              )}
            </button>
          </div>
          </div>

          {/* Case Notes - Right Side Panel (Landscape) */}
          {lobby.state !== 'LOBBY' && (
            <div className="absolute right-2 top-16 bottom-20 w-32 bg-[rgba(0,0,0,0.7)] backdrop-blur-sm rounded-xl p-2 z-10 overflow-hidden flex flex-col">
              <div className="text-[8px] font-bold text-[var(--royal-gold)] mb-1 flex items-center gap-1 uppercase tracking-wider">
                <FileText size={10} /> Notes ({lobby.messages?.length || 0})
              </div>
              <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
                {lobby.messages?.slice(-8).map(msg => (
                  <div key={msg.id} className="text-[9px] text-[rgba(246,240,230,0.75)] leading-tight">
                    {msg.message}
                  </div>
                ))}
                {(!lobby.messages || lobby.messages.length === 0) && (
                  <div className="text-[9px] text-[rgba(246,240,230,0.4)] italic">No events yet...</div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Waiting overlay - FIXED to cover full screen */}
      {lobby.state === 'LOBBY' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center flex-col gap-4 z-[100] backdrop-blur-sm">
          <h2 className="text-xl font-bold text-[var(--parchment)]">Waiting for Players</h2>
          <p className="text-sm text-[var(--parchment-dark)]">
            {lobby.players.length}/{lobby.maxPlayers || 4} players joined
          </p>

          {/* Room code with copy button */}
          <div className="flex items-center gap-2 bg-[rgba(var(--accent-color-rgb),0.2)] border border-[rgba(var(--accent-color-rgb),0.4)] rounded-xl px-4 py-2">
            <span className="text-[var(--parchment-dark)] text-sm">Room:</span>
            <span className="text-[var(--royal-gold)] font-bold text-lg tracking-wider">{lobby.code}</span>
            <button
              onClick={copyRoomLink}
              className="ml-2 p-2 rounded-lg bg-[rgba(var(--accent-color-rgb),0.3)] hover:bg-[rgba(var(--accent-color-rgb),0.5)] transition-colors"
              aria-label="Copy invite link"
            >
              {copyFeedback ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-[var(--parchment)]" />
              )}
            </button>
          </div>
          {copyFeedback && (
            <p className="text-xs text-green-400">Invite link copied!</p>
          )}

          {me?.isHost ? (
            <button
              onClick={() => {
                playEliminatedSound();
                socket.emit('game:start', {});
              }}
              disabled={lobby.players.length < 2}
              className="hg-icon-btn bg-[var(--royal-crimson)] hover:bg-[var(--royal-crimson-light)] text-white px-6 py-3 rounded-full text-base font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] min-w-[140px] transition-all active:scale-95"
            >
              Start Game
            </button>
          ) : (
            <p className="text-sm text-[var(--parchment-dark)] italic">
              Waiting for host to start...
            </p>
          )}
        </div>
      )}

      {/* Must Play Accomplice floating indicator */}
      {mustPlayAccomplice && isMyTurn && !waitingToDraw && lobby.state !== 'LOBBY' && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <span className="bg-purple-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg animate-pulse">
            Must Play Accomplice (7)
          </span>
        </div>
      )}

      {/* Player's Hand - floating at bottom (only show when game has started) */}
      {lobby.state !== 'LOBBY' && (
        <div className="fixed hg-mobile-hand-row left-0 right-0 z-30 flex items-center justify-center -translate-x-8 gap-3 pointer-events-none">
          {myHand.map((card, idx) => (
            <button
              key={`hand-${card}-${idx}`}
              onClick={() => handleCardTap(idx)}
              onTouchStart={(e) => {
                e.stopPropagation();
                setPreviewCard(card);
              }}
              onTouchEnd={() => setPreviewCard(null)}
              onMouseEnter={() => setPreviewCard(card)}
              onMouseLeave={() => setPreviewCard(null)}
              className={`
                pointer-events-auto transition-all bg-transparent p-0 border-none
                ${selectedCardIndex === idx ? '-translate-y-2 scale-110' : ''}
                ${!isMyTurn || amEliminated || waitingToDraw ? 'opacity-50' : ''}
              `}
            >
              <DynamicCard
                cardType={card}
                selected={selectedCardIndex === idx}
                className="hg-mobile-hand-card"
              />
            </button>
          ))}
        </div>
      )}

      {/* Floating Confirm/Cancel - tiny buttons, bottom right corner */}
      <AnimatePresence>
        {playStep === 'SELECTED' && selectedCard !== null && isMyTurn && !waitingToDraw && lobby.state !== 'LOBBY' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', bottom: '4px', right: '4px', zIndex: 100 }}
            className="flex gap-0.5"
          >
            <button
              onClick={handleConfirmSelection}
              className="hg-btn-tiny bg-green-600 text-white"
            >
              Confirm
            </button>
            <button
              onClick={resetPlayState}
              className="hg-btn-tiny bg-black/80 text-white/60"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TARGET_SELECT Modal - Noir styled */}
      <AnimatePresence>
        {playStep === 'TARGET_SELECT' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[150] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="hg-noir-modal p-4 w-[min(280px,90vw)]"
            >
              <h3 className="text-center text-base font-bold text-[var(--royal-gold)] mb-3 uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-typewriter)' }}>
                Select Target
              </h3>

              {/* Player grid - 2 columns with noir styling */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {availableTargets.map(player => (
                  <button
                    key={player.id}
                    onClick={() => handleSelectTarget(player.id!)}
                    className={`hg-modal-btn hg-noir-player-btn flex flex-col items-center active:scale-95
                      ${targetId === player.id ? 'selected' : ''}
                      ${player.isImmune ? 'opacity-60' : ''}`}
                  >
                    {/* Noir octagonal avatar */}
                    <div className="hg-noir-avatar mb-1">
                      <div className="hg-noir-avatar-inner">
                        {player.avatarUrl ? (
                          <img src={player.avatarUrl} alt={player.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-[var(--parchment)]" />
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-[var(--parchment)] font-medium truncate max-w-full">
                      {player.name}
                    </span>
                    {player.isImmune && (
                      <span className="text-[10px] text-yellow-400 mt-0.5">Protected</span>
                    )}
                  </button>
                ))}

                {/* Self option for Blackmailer (card 5) */}
                {selectedCard === 5 && me?.id && (
                  <button
                    onClick={() => handleSelectTarget(me.id!)}
                    className={`hg-modal-btn hg-noir-player-btn flex flex-col items-center active:scale-95
                      ${targetId === me.id ? 'selected' : ''}`}
                  >
                    <div className="hg-noir-avatar mb-1">
                      <div className="hg-noir-avatar-inner">
                        <User className="w-5 h-5 text-[var(--parchment)]" />
                      </div>
                    </div>
                    <span className="text-xs text-[var(--parchment)] font-medium">Yourself</span>
                  </button>
                )}
              </div>

              {/* Cancel button - noir styled */}
              <button
                onClick={handleBack}
                className="hg-modal-btn hg-noir-cancel-btn w-full flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GUESS_SELECT Modal - Noir styled */}
      <AnimatePresence>
        {playStep === 'GUESS_SELECT' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[150] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="hg-noir-modal p-4 w-[min(300px,92vw)]"
            >
              <h3 className="text-center text-base font-bold text-[var(--royal-gold)] mb-3 uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-typewriter)' }}>
                Guess Their Card
              </h3>

              {/* Cards 2-8 grid - noir styled */}
              <div className="grid grid-cols-4 gap-1.5 mb-3 justify-items-center">
                {([2, 3, 4, 5, 6, 7, 8] as CardType[]).map(cardNum => (
                  <button
                    key={cardNum}
                    onClick={() => handleSelectGuess(cardNum)}
                    className={`hg-modal-btn hg-noir-card-btn active:scale-95
                      ${guessCard === cardNum ? 'selected scale-110' : 'opacity-75 hover:opacity-100 hover:scale-105'}`}
                  >
                    <DynamicCard
                      cardType={cardNum}
                      className="hg-guess-card-modal"
                    />
                  </button>
                ))}
              </div>

              {/* Back button - noir styled */}
              <button
                onClick={handleBack}
                className="hg-modal-btn hg-noir-cancel-btn w-full flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* READY_TO_PLAY Modal - Noir styled with card preview */}
      <AnimatePresence>
        {playStep === 'READY_TO_PLAY' && selectedCard !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[150] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="hg-noir-modal p-4 w-[min(260px,88vw)]"
            >
              {/* Card preview with noir glow - show guessed card for Inspector */}
              <div className="flex justify-center mb-3">
                <div className="relative">
                  <div className="absolute -inset-2 rounded bg-[var(--royal-gold)]/20 blur-md" />
                  <DynamicCard
                    cardType={guessCard || selectedCard}
                    className="hg-confirmation-card relative z-10"
                  />
                </div>
              </div>

              {/* Selection summary */}
              <div className="text-center mb-3 space-y-0.5">
                {/* For Inspector: show "Guessing [card]" as title */}
                {guessCard ? (
                  <>
                    <div className="text-[10px] text-[var(--parchment-dark)] uppercase tracking-wide">
                      Playing Inspector
                    </div>
                    <div className="text-base font-bold text-[var(--royal-gold)] uppercase tracking-wider"
                         style={{ fontFamily: 'var(--font-typewriter)' }}>
                      Guessing: {CARD_NAMES[guessCard]}
                    </div>
                  </>
                ) : (
                  <div className="text-base font-bold text-[var(--royal-gold)] uppercase tracking-wider"
                       style={{ fontFamily: 'var(--font-typewriter)' }}>
                    {CARD_NAMES[selectedCard]}
                  </div>
                )}
                {targetId && (
                  <div className="text-xs text-[var(--parchment)]">
                    Target: <span className="font-bold">
                      {targetId === me?.id
                        ? 'Yourself'
                        : otherPlayers.find(p => p.id === targetId)?.name || 'Unknown'}
                    </span>
                  </div>
                )}
              </div>

              {/* Action buttons - noir styled */}
              <div className="flex gap-2">
                <button
                  onClick={handleBack}
                  className="hg-modal-btn hg-noir-cancel-btn flex-1 flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFinalPlay}
                  className="hg-modal-btn flex-1 py-2.5 bg-green-700 hover:bg-green-600 text-white font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-1.5"
                  style={{ fontFamily: 'var(--font-typewriter)', borderRadius: '4px' }}
                >
                  <Play className="w-3.5 h-3.5" />
                  Play Card
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Long-press card preview - right of deck */}
      <AnimatePresence>
        {previewCard !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed left-1/2 top-1/3 -translate-y-1/2 ml-36 z-50 pointer-events-none"
          >
            <DynamicCard
              cardType={previewCard}
              className="hg-mobile-preview-card"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Winner Overlay */}
      {(lobby.gameData.roundWinner || lobby.gameData.winner) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="hg-panel hg-candlelight border border-[rgba(var(--accent-color-rgb),0.35)] p-6 rounded-2xl max-w-sm w-full text-center">
            <h2 className="text-2xl font-black mb-3 text-[var(--royal-gold)] uppercase tracking-widest">
              {lobby.gameData.winner ? 'Victory!' : 'Round Over'}
            </h2>

            <div className="my-4">
              <div className="text-[var(--parchment-dark)] mb-1 uppercase text-xs tracking-widest">Winner</div>
              <div className="text-xl font-bold text-white">
                {lobby.gameData.winner
                  ? lobby.players.find(p => p.id === lobby.gameData?.winner)?.name
                  : lobby.players.find(p => p.id === lobby.gameData?.roundWinner)?.name}
              </div>
            </div>

            {me?.isHost && (
              <button
                onClick={() => socket.emit('game:start', {})}
                className="px-6 py-3 bg-gradient-to-r from-[var(--royal-crimson)] to-[var(--royal-crimson-dark)] text-white font-bold rounded-xl text-sm shadow-lg min-h-[48px] w-full"
              >
                {lobby.gameData.winner ? 'New Game' : 'Next Round'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Card Inspector Modal */}
      <CardInspectorModal
        cards={inspectorCards}
        initialIndex={inspectorIndex}
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        onPlayCard={handleInspectorPlayCard}
        title={inspectorTitle}
        otherPlayers={otherPlayers}
        socket={socket}
        meId={me?.id}
        allOpponentsProtected={allOpponentsProtected}
      />

      {/* Card Play Animation */}
      <AnimatePresence>
        {playingCard && (
          <motion.div
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 1.3, opacity: 0, y: -100 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
          >
            <img
              src={playingCard.image}
              alt={CARD_NAMES[playingCard.card]}
              className="hg-card object-cover rounded-xl shadow-2xl border-4 border-[var(--royal-gold)]"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {/* Card Legend Modal */}
      {isLegendOpen && <CardLegendModal onClose={() => setIsLegendOpen(false)} />}

      {/* Tutorial Modal */}
      <TutorialCarousel
        variant="modal"
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />

    </div>
  );
};

export default HeartsGambitGameMobile;
