import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Lobby, CardType, Player } from '../../types';
import type { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, FileText, Copy, Check, User, ArrowLeft, Play } from 'lucide-react';
import Toast from './Toast';
import DynamicCard from './DynamicCard';
import {
  CARD_IMAGES,
  CARD_BACK_IMAGE,
  getTranslatedCardName
} from './cardDatabase';
import { playDrawSound, playDropSound, playEliminatedSound } from '../../utils/soundEffects';
import { CardLegendModal } from '../CardLegendModal';
import { RulesModal } from '../RulesModal';
import TutorialCarousel from '../TutorialCarousel';
import OrientationPrompt from './OrientationPrompt';
import MobileOpponentStrip from './MobileOpponentStrip';
import CardInspectorModal, { type InspectorCard } from './CardInspectorModal';
import MobileGameMenu from './MobileGameMenu';
import MobileChatDrawer from './MobileChatDrawer';
import { getTranslation, getCurrentLanguage } from '../../utils/gameTranslations';
import { translateGameMessage } from '../../utils/gameLog';
import { clearSession } from '../../services/gameBuddiesSession';
import socketService from '../../services/socketService';
import { VictoryScreen } from './VictoryScreen';
import PassPlayToggle from '../lobby/PassPlayToggle';
import BotControls from '../lobby/BotControls';
import { usePassPlay } from '../../hooks/usePassPlay';
import { GameExplainer, GameExplainerHelpButton } from '../lobby/GameExplainer';
import { Avatar } from '../core/Avatar';
import { primeSuspectDemoSpec } from '../lobby/GameExplainer/demos/PrimeSuspectDemo';
import '../lobby/GameExplainer/GameExplainer.css';
import { GAME_META } from '../../config/gameMeta';

interface HeartsGambitGameMobileProps {
  lobby: Lobby;
  socket: Socket;
  ppActivePlayerId?: string;
  ppActionHandler?: (action: string, payload?: any) => void;
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
const HeartsGambitGameMobile: React.FC<HeartsGambitGameMobileProps> = ({ lobby, socket, ppActivePlayerId, ppActionHandler }) => {
  const isPP = !!ppActivePlayerId;
  // Game state
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [guessCard, setGuessCard] = useState<CardType | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [playingCard, setPlayingCard] = useState<{ card: CardType; image: string } | null>(null);
  const [playStep, setPlayStep] = useState<PlayStep>('IDLE');

  // UI state
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [lastSeenMessageCount, setLastSeenMessageCount] = useState(0);
  const [inspectorCards, setInspectorCards] = useState<InspectorCard[]>([]);
  const [inspectorIndex, setInspectorIndex] = useState(0);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [inspectorTitle, setInspectorTitle] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [previewCard, setPreviewCard] = useState<CardType | null>(null);
  const [eliminationMessage, setEliminationMessage] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  void longPressTimerRef; // Available for future use

  // Chat: Calculate unread count
  const chatMessages = lobby.messages || [];
  const unreadChatCount = Math.max(0, chatMessages.length - lastSeenMessageCount);

  // Mark messages as read when chat opens
  useEffect(() => {
    if (isChatOpen) {
      setLastSeenMessageCount(chatMessages.length);
    }
  }, [isChatOpen, chatMessages.length]);

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
      setToast({ message: t('error.failedToCopyLink'), type: 'error' });
    }
  }, [lobby.code]);

  // Refs for animations/tracking
  const [prevTokens, setPrevTokens] = useState(0);
  const prevEliminatedRef = useRef<Set<string>>(new Set());

  // Translation helper
  const language = getCurrentLanguage();
  const t = (key: Parameters<typeof getTranslation>[0]) => getTranslation(key, language);

  const pp = usePassPlay({
    roomCode: lobby.code,
    players: lobby.players,
    passPlay: lobby.passPlay,
    settings: lobby.settings,
    socket,
  });

  // Derived game state
  const viewingAsSocketId = (lobby as any).viewingAs as string | undefined;
  const isSpectator = !!lobby.players.find(p => p.socketId === lobby.mySocketId)?.isSpectator;
  const me = ppActivePlayerId
    ? lobby.players.find(p => p.id === ppActivePlayerId)
    : viewingAsSocketId
      ? lobby.players.find(p => p.socketId === viewingAsSocketId)
      : lobby.players.find(p => p.socketId === lobby.mySocketId);
  const isMyTurn = !isSpectator && lobby.gameData?.currentTurn === me?.id;
  const myHand = me?.hand || [];
  const otherPlayers = lobby.players.filter(p => p.id !== me?.id && !p.isSpectator);
  // Server already masks opponent hands correctly in serializeRoom (sends 0 for hidden, real values for Butler-revealed)
  const displayOtherPlayers = otherPlayers;
  const allOpponentsProtected = otherPlayers.every(p => p.isEliminated || p.isImmune);
  const amEliminated = me?.isEliminated || false;
  const waitingToDraw = isMyTurn && lobby.gameData?.turnPhase === 'draw';
  const drawPendingRef = useRef(false);
  if (!waitingToDraw) drawPendingRef.current = false;
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
      lobby.players.filter(p => p.isEliminated).map(p => p.id).filter((id): id is string => !!id)
    );
    const prevEliminated = prevEliminatedRef.current;

    currentEliminated.forEach(id => {
      if (!prevEliminated.has(id)) {
        playEliminatedSound();
      }
    });

    // If I was just eliminated, show overlay with reason from last game message
    if (me?.id && currentEliminated.has(me.id) && !prevEliminated.has(me.id)) {
      const lastMsg = lobby.messages?.[lobby.messages.length - 1]?.message || t('game.eliminated');
      setEliminationMessage(lastMsg);
      setTimeout(() => setEliminationMessage(null), 4000);
    }

    prevEliminatedRef.current = currentEliminated;
  }, [lobby.players]);

  // Socket error handling
  useEffect(() => {
    const handleError = (data: { message: string }) => {
      // Don't reset timer if same message already showing
      setToast(prev => {
        if (prev?.message === data.message) return prev;
        return { message: data.message, type: 'error' };
      });
    };

    socket.on('error', handleError);
    return () => { socket.off('error', handleError); };
  }, [socket]);

  // Spectator: emit selection state so spectators can see what we're doing
  useEffect(() => {
    if (isSpectator || isPP) return;
    socket.emit('player:ui-state', { selectedCardIndex, targetId, guessCard, playStep });
  }, [selectedCardIndex, targetId, guessCard, playStep, isSpectator, isPP, socket]);

  // Spectator: receive viewed player's selection state
  useEffect(() => {
    if (!isSpectator) return;
    const uiState = (me as any)?.uiState;
    if (uiState) {
      setSelectedCardIndex(uiState.selectedCardIndex);
      setTargetId(uiState.targetId);
      setGuessCard(uiState.guessCard);
      if (uiState.playStep) setPlayStep(uiState.playStep as PlayStep);
    } else {
      setSelectedCardIndex(null);
      setTargetId(null);
      setGuessCard(null);
      setPlayStep('IDLE');
    }
  }, [isSpectator, viewingAsSocketId]);

  useEffect(() => {
    if (!isSpectator) return;
    const handler = (data: { selectedCardIndex: number | null; targetId: string | null; guessCard: number | null; playStep?: string | null }) => {
      setSelectedCardIndex(data.selectedCardIndex);
      setTargetId(data.targetId);
      setGuessCard(data.guessCard as any);
      if (data.playStep) setPlayStep(data.playStep as PlayStep);
      else setPlayStep('IDLE');
    };
    socket.on('spectator:ui-state', handler);
    return () => { socket.off('spectator:ui-state', handler); };
  }, [isSpectator, socket]);

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
      if (ppActionHandler) {
        ppActionHandler('play-card', {
          cardIndex: selectedCardIndex,
          targetPlayerId: targetToSend,
          guess: guessToSend,
        });
      } else {
        socket.emit('play:card', {
          card: cardToPlay,
          targetId: targetToSend,
          guess: guessToSend
        });
      }
      setPlayingCard(null);
    }, 400);
  }, [selectedCardIndex, myHand, targetId, guessCard, allOpponentsProtected, me, socket, resetPlayState, ppActionHandler]);

  // Get available targets for current card
  const availableTargets = otherPlayers.filter(p => {
    if (p.isEliminated) return false;
    // Inspector (1) can target immune players
    if (selectedCard === 1) return true;
    // Other cards cannot target immune players
    return !p.isImmune;
  });

  // Card inspection handlers (openHandInspector kept for potential future use)
  const _openHandInspector = useCallback((_card: CardType, index: number) => {
    const cards: InspectorCard[] = myHand.map((c, i) => ({
      card: c,
      source: 'hand' as const,
      label: getTranslatedCardName(c as any, language),
      canPlay: isMyTurn && !waitingToDraw && !amEliminated,
      handIndex: i,
    }));
    setInspectorCards(cards);
    setInspectorIndex(index);
    setInspectorTitle(t('game.yourHand'));
    setIsInspectorOpen(true);
  }, [myHand, isMyTurn, waitingToDraw, amEliminated]);
  void _openHandInspector;

  const openOpponentInspector = useCallback((player: Player) => {
    const cards: InspectorCard[] = [];
    for (let i = 0; i < player.handCount; i++) {
      const card = player.hand?.[i];
      if (card !== undefined && card !== 0) {
        cards.push({
          card,
          source: 'opponent',
          label: getTranslatedCardName(card as any, language),
          meta: t('game.playerCard').replace('{name}', player.name),
        });
      }
    }
    if (cards.length === 0) {
      setToast({ message: t('game.playerCardsHidden').replace('{name}', player.name), type: 'error' });
      return;
    }
    setInspectorCards(cards);
    setInspectorIndex(0);
    setInspectorTitle(t('game.playerCards').replace('{name}', player.name));
    setIsInspectorOpen(true);
  }, []);

  const openDiscardInspector = useCallback(() => {
    const cards: InspectorCard[] = [];

    // Add face-up cards (2-player removal)
    faceUpCards.forEach((card) => {
      cards.push({
        card,
        source: 'evidence',
        label: getTranslatedCardName(card as any, language),
        meta: t('game.removedAtStart'),
      });
    });

    // Add discard pile
    if (discardEvents) {
      discardEvents.forEach((evt, i) => {
        cards.push({
          card: evt.card,
          source: 'discard',
          label: getTranslatedCardName(evt.card as any, language),
          meta: `#${i + 1} - ${evt.playerName}`,
        });
      });
    } else {
      // Fallback to player discards
      lobby.players.forEach(p => {
        p.discarded?.forEach((card) => {
          cards.push({
            card,
            source: 'discard',
            label: getTranslatedCardName(card as any, language),
            meta: `${p.name}'s discard`,
          });
        });
      });
    }

    if (cards.length === 0) {
      setToast({ message: t('evidence.noEvidenceYet'), type: 'error' });
      return;
    }

    setInspectorCards(cards);
    setInspectorIndex(cards.length - 1); // Start at newest
    setInspectorTitle(t('evidence.locker'));
    setIsInspectorOpen(true);
  }, [faceUpCards, discardEvents, lobby.players]);

  const handleInspectorPlayCard = useCallback((_card: CardType, handIndex: number) => {
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
    <div className="hearts-gambit-game hg-mobile-layout h-full text-[var(--parchment)] overflow-hidden">
      {/* Orientation prompt */}
      <OrientationPrompt />

      {/* HUD Layer - Minimal Top bar with hamburger menu */}
      <div className="hg-mobile-header-area bg-[rgba(0,0,0,0.6)] backdrop-blur-sm px-3 py-2 flex items-center justify-between safe-top border-b border-[rgba(var(--accent-color-rgb),0.15)]">
        <div className="flex items-center gap-2">
          {isPP ? (
            <div className="flex items-center gap-1 flex-wrap">
              {lobby.players.filter(p => !p.isEliminated).map(p => (
                <span
                  key={p.id}
                  className={`text-[var(--parchment)] text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                    p.id === me?.id
                      ? 'bg-[var(--royal-crimson)]'
                      : 'bg-[rgba(255,255,255,0.12)]'
                  }`}
                >
                  {p.name}: {p.tokens || 0}
                </span>
              ))}
            </div>
          ) : (
            <motion.span
              className="bg-[var(--royal-crimson)] text-[var(--parchment)] text-xs font-black px-2 py-1 rounded-full"
            >
              {t('game.tokens').replace('{count}', String(me?.tokens || 0))}
            </motion.span>
          )}

          {isMyTurn && !amEliminated && (
            <span className="bg-[var(--royal-gold)] text-[var(--velvet-dark)] px-2 py-1 rounded-full text-xs font-bold animate-pulse">
              {waitingToDraw ? 'DRAW!' : 'YOUR TURN'}
            </span>
          )}

          {amEliminated && (
            <span className="bg-[var(--royal-crimson-dark)] text-white text-xs font-black px-2 py-1 rounded-full flex items-center gap-1">
              <Skull size={12} /> OUT
            </span>
          )}
        </div>

        {/* Hamburger Menu */}
        <MobileGameMenu
            roomCode={lobby.code || 'N/A'}
            onCopyLink={copyRoomLink}
            linkCopied={copyFeedback}
            onLeave={() => {
              if (confirm(t('game.areYouSureLeave'))) {
                socketService.clearReconnectionData();
                clearSession();
                sessionStorage.removeItem('gameSessionToken');
                socketService.disconnect();
                window.location.href = import.meta.env.BASE_URL || '/';
              }
            }}
            onHowToPlay={() => setIsTutorialOpen(true)}
            onCardLegend={() => setIsLegendOpen(true)}
            onRules={() => setIsRulesOpen(true)}
            onChat={() => setIsChatOpen(true)}
            unreadCount={unreadChatCount}
            playerCount={`${lobby.players.length}/4`}
            onReturnToLobby={me?.isHost ? () => {
              socket.emit('game:backToLobby', { roomCode: lobby.code });
            } : undefined}
          />
      </div>

      {/* Board Layer - Main content */}
      <div className="absolute inset-0">
        {/* Opponents strip */}
        <div className="hg-mobile-opponent-area overflow-hidden">
          <MobileOpponentStrip
            players={displayOtherPlayers}
            currentTurnId={lobby.gameData?.currentTurn ?? undefined}
            selectedCard={selectedCard}
            targetId={targetId}
            onSelectTarget={setTargetId}
            onInspectOpponent={openOpponentInspector}
            onPreviewCard={setPreviewCard}
          />
        </div>

        {/* Center area - Deck & Discard */}
        <div className="hg-mobile-deck-area flex items-center justify-center gap-[clamp(16px,4vw,32px)] pointer-events-auto">
          {/* Discard Pile */}
          <div className="flex flex-col items-center translate-y-[3dvh]">
            <span className="font-bold text-[var(--royal-gold-light)] uppercase tracking-wider mb-0.5 block translate-x-[3vw]" style={{ fontSize: 'clamp(10px, 2vw, 14px)' }}>
              {t('evidence.title')}
            </span>
            <button
              onClick={openDiscardInspector}
              className="relative hg-mobile-discard-card flex items-center justify-center overflow-visible translate-x-[3vw]"
              aria-label={t('evidence.openEvidenceLocker')}
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
                <span className="text-xs text-[var(--parchment-dark)]">{t('game.empty')}</span>
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
          <div className="flex flex-col items-center translate-y-[3dvh]">
            <span className="font-bold text-[var(--royal-gold-light)] uppercase tracking-wider mb-0.5 block translate-x-[1.5vw] whitespace-nowrap" style={{ fontSize: 'clamp(10px, 2vw, 14px)' }}>
              {t('game.caseFile')} <span className="text-[var(--parchment-dark)]">({lobby.gameData.deckCount})</span>
            </span>
            <button
              onClick={() => {
                if (waitingToDraw && !drawPendingRef.current) {
                  drawPendingRef.current = true;
                  playDrawSound();
                  if (ppActionHandler) {
                    ppActionHandler('draw', { source: 'deck' });
                  } else {
                    socket.emit('player:draw', {});
                  }
                }
              }}
              className={`relative hg-mobile-deck-card ${
                waitingToDraw ? 'cursor-pointer animate-pulse' : 'cursor-default'
              }`}
              aria-label={waitingToDraw ? t('game.drawACard') : t('game.deck')}
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
                <div className="absolute -bottom-[8%] left-1/2 -translate-x-1/2 z-20">
                  <span className="bg-[var(--royal-gold)] text-[var(--velvet-dark)] px-[1vw] py-[0.5vh] rounded-full text-xs font-bold whitespace-nowrap">
                    TAP TO DRAW
                  </span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Case Notes - Right Side Panel */}
        {lobby.state !== 'LOBBY' && (
          <div className="hg-mobile-notes-area bg-[rgba(0,0,0,0.7)] backdrop-blur-sm rounded-xl p-2 overflow-hidden flex flex-col">
            <div className="text-[8px] font-bold text-[var(--royal-gold-light)] mb-1 flex items-center gap-1 uppercase tracking-wider">
              <FileText size={10} /> Notes ({lobby.messages?.length || 0})
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
              {lobby.messages?.filter(m => m.playerId === 'system' || (m as any).isSystem).slice(-8).map(msg => (
                <div key={msg.id} className="text-[9px] text-[rgba(246,240,230,0.9)] leading-tight">
                  {translateGameMessage(msg.message)}
                </div>
              ))}
              {(!lobby.messages || lobby.messages.length === 0) && (
                <div className="text-[9px] text-[rgba(246,240,230,0.72)] italic">No events yet...</div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Waiting overlay - FIXED to cover full screen (never shown in PP mode) */}
      {lobby.state === 'LOBBY' && !isPP && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center flex-col gap-2 z-[100] backdrop-blur-sm overflow-y-auto py-2 hg-lobby-overlay">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[var(--parchment)]">{t('game.waitingForPlayers')}</h2>
            <GameExplainerHelpButton gameId={GAME_META.id} ariaLabel={t('tutorial.howToPlay')} />
          </div>
          <p className="text-sm text-[var(--parchment-dark)]">
            {t('lobby.playersJoined').replace('{current}', String(lobby.players.length)).replace('{max}', '4')}
          </p>

          {/* How-to-play explainer (auto-opens once, ambient sidebar afterwards) */}
          <div className="w-[min(92vw,360px)] px-2">
            <GameExplainer
              gameId={GAME_META.id}
              demoSpec={primeSuspectDemoSpec}
              t={(key: string) => getTranslation(key as any, language)}
            />
          </div>

          {/* Room code with copy button */}
          <div className="flex items-center gap-2 bg-[rgba(var(--accent-color-rgb),0.2)] border border-[rgba(var(--accent-color-rgb),0.4)] rounded-xl px-4 py-2">
            <span className="text-[var(--parchment-dark)] text-sm">{t('menu.room')}:</span>
            <span className="text-[var(--royal-gold-light)] font-bold text-lg tracking-wider">{lobby.code}</span>
            <button
              onClick={copyRoomLink}
              className="ml-2 p-2 rounded-lg bg-[rgba(var(--accent-color-rgb),0.3)] hover:bg-[rgba(var(--accent-color-rgb),0.5)] transition-colors"
              aria-label={t('gameHeader.copyInviteLink')}
            >
              {copyFeedback ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy size={16} color="var(--parchment)" />
              )}
            </button>
          </div>
          {copyFeedback && (
            <p className="text-xs text-green-400">{t('lobby.inviteLinkCopied')}</p>
          )}

          {/* Pass & Play Toggle */}
          <PassPlayToggle
            isPassPlay={pp.isPassPlay}
            isHost={!!me?.isHost}
            players={lobby.players}
            maxPlayers={lobby.settings.maxPlayers}
            onToggleMode={pp.toggleMode}
            onAddPlayer={pp.addPlayer}
            onRemovePlayer={pp.removePlayer}
          />

          {/* Bot Controls (online mode only) */}
          {!pp.isPassPlay && me?.isHost && (
            <BotControls
              roomCode={lobby.code}
              players={lobby.players}
              isHost={true}
              maxPlayers={lobby.settings.maxPlayers}
              socket={socket}
            />
          )}

          {me?.isHost ? (
            <button
              onClick={() => {
                playEliminatedSound();
                socket.emit('game:start', {});
              }}
              disabled={lobby.players.length < 2}
              className="ps-btn ps-btn--primary min-h-[48px] min-w-[140px]"
            >
              {t('game.startGame')}
            </button>
          ) : (
            <p className="text-sm text-[var(--parchment-dark)] italic">
              {t('game.waitingForHost')}
            </p>
          )}
        </div>
      )}

      {/* Must Play Accomplice floating indicator */}
      {mustPlayAccomplice && isMyTurn && !waitingToDraw && lobby.state !== 'LOBBY' && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <span className="bg-[var(--royal-crimson)] text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg animate-pulse">
            {t('game.mustPlayAccomplice')} (7)
          </span>
        </div>
      )}

      {/* Player's Hand - design-based positioning (only show when game has started) */}
      {lobby.state !== 'LOBBY' && (
        <div className="hg-mobile-player-area flex items-center justify-center gap-3 pointer-events-none">
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
        {playStep === 'SELECTED' && selectedCard !== null && (isMyTurn || isSpectator) && !waitingToDraw && lobby.state !== 'LOBBY' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', bottom: '1%', right: '1%', zIndex: 100 }}
            className={`flex gap-[0.5vw] ${isSpectator ? 'pointer-events-none opacity-95' : ''}`}
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
              className={`hg-noir-modal p-4 w-[min(280px,90vw)] ${isSpectator ? 'pointer-events-none' : ''}`}
            >
              <h3 className="text-center text-base font-bold text-[var(--royal-gold-light)] mb-3 uppercase tracking-wider"
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
                        <Avatar src={player.avatarUrl} alt={player.name} className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <span className="text-xs text-[var(--parchment)] font-medium truncate max-w-full">
                      {player.name}
                    </span>
                    {player.isImmune && (
                      <span className="text-[10px] text-yellow-400 mt-0.5">{t('cardInspector.protected')}</span>
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
                        <User size={20} color="var(--parchment)" />
                      </div>
                    </div>
                    <span className="text-xs text-[var(--parchment)] font-medium">{t('cardInspector.yourself')}</span>
                  </button>
                )}
              </div>

              {/* Cancel button - noir styled */}
              <button
                onClick={handleBack}
                className="hg-modal-btn hg-noir-cancel-btn w-full flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} />
                {t('common.cancel')}
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
              className={`hg-noir-modal p-4 w-[min(300px,92vw)] ${isSpectator ? 'pointer-events-none' : ''}`}
            >
              <h3 className="text-center text-base font-bold text-[var(--royal-gold-light)] mb-3 uppercase tracking-wider"
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
                <ArrowLeft size={16} />
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
              className={`hg-noir-modal p-3 w-[min(220px,85vw)] ${isSpectator ? 'pointer-events-none' : ''}`}
            >
              {/* Card preview with noir glow - show guessed card for Inspector */}
              <div className="flex justify-center mb-2">
                <div className="relative">
                  <div className="absolute -inset-1.5 rounded bg-[var(--royal-gold)]/20 blur-sm" />
                  <DynamicCard
                    cardType={guessCard || selectedCard}
                    className="hg-confirmation-card relative z-10"
                  />
                </div>
              </div>

              {/* Selection summary - compact */}
              <div className="text-center mb-2 space-y-0">
                {/* For Inspector: show "Guessing [card]" as title */}
                {guessCard ? (
                  <>
                    <div className="text-[9px] text-[var(--parchment-dark)] uppercase tracking-wide">
                      {t('game.playingInspector')}
                    </div>
                    <div className="text-xs font-bold text-[var(--royal-gold-light)] uppercase tracking-wider"
                         style={{ fontFamily: 'var(--font-typewriter)' }}>
                      {t('cardInspector.guessing')}: {getTranslatedCardName(guessCard as any, language)}
                    </div>
                  </>
                ) : (
                  <div className="text-xs font-bold text-[var(--royal-gold-light)] uppercase tracking-wider"
                       style={{ fontFamily: 'var(--font-typewriter)' }}>
                    {getTranslatedCardName(selectedCard as any, language)}
                  </div>
                )}
                {targetId && (
                  <div className="text-[10px] text-[var(--parchment)]">
                    {t('game.targetPrefix')} <span className="font-bold">
                      {targetId === me?.id
                        ? t('cardInspector.yourself')
                        : otherPlayers.find(p => p.id === targetId)?.name || t('game.unknown')}
                    </span>
                  </div>
                )}
              </div>

              {/* Action buttons - compact noir styled */}
              <div className="flex gap-1.5">
                <button
                  onClick={handleBack}
                  className="hg-modal-btn hg-noir-cancel-btn flex-1 flex items-center justify-center text-[10px] py-1.5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFinalPlay}
                  className="hg-modal-btn flex-1 py-1.5 bg-green-700 hover:bg-green-600 text-white font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-1"
                  style={{ fontFamily: 'var(--font-typewriter)', borderRadius: '4px' }}
                >
                  <Play size={12} />
                  Play
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card preview - shows on hover/long-press OR when card is selected */}
      <AnimatePresence>
        {(previewCard !== null || (playStep === 'SELECTED' && selectedCard !== null)) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed left-1/2 top-1/3 -translate-y-1/2 ml-36 z-50 pointer-events-none"
          >
            <DynamicCard
              cardType={previewCard ?? selectedCard!}
              className="hg-mobile-preview-card"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Elimination Alert Banner — top of screen on mobile */}
      <AnimatePresence>
        {eliminationMessage && (
          <motion.div
            className="fixed top-4 left-4 right-4 z-[55] border-2 border-[var(--royal-crimson-light)] rounded-xl p-3 shadow-[0_0_20px_rgba(168,52,74,0.35)]"
            style={{ background: 'linear-gradient(135deg, rgba(30,10,10,0.95), rgba(60,15,15,0.95))' }}
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Skull className="w-6 h-6 text-[var(--danger-500)] flex-shrink-0" />
              <span className="text-base font-black text-[var(--danger-500)] uppercase tracking-widest">
                {t('game.eliminated')}
              </span>
            </div>
            <p className="text-sm text-[var(--parchment)] leading-snug opacity-90">
              {eliminationMessage}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Victory / Round-Over Overlay */}
      {(lobby.gameData.roundWinner || lobby.gameData.winner) && (
        <VictoryScreen lobby={lobby} socket={socket} />
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
              alt={getTranslatedCardName(playingCard.card as any, language)}
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

      {/* Rules Modal */}
      {isRulesOpen && <RulesModal onClose={() => setIsRulesOpen(false)} />}

      {/* Tutorial Modal */}
      <TutorialCarousel
        variant="modal"
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />

      {/* Chat Drawer - hide in PP */}
      {!isPP && (
        <MobileChatDrawer
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          messages={chatMessages}
          socket={socket}
          mySocketId={lobby.mySocketId}
        />
      )}

    </div>
  );
};

export default HeartsGambitGameMobile;
