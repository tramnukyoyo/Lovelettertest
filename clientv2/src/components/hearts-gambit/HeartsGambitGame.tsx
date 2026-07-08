import React, { useState, useEffect, useRef } from 'react';
import type { Lobby, CardType } from '../../types';
import type { Socket } from 'socket.io-client';
import { Shield, Crown, Skull, BookOpen, HelpCircle, ScrollText, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CardTooltip from './CardTooltip';
import Toast from './Toast';
import DynamicCard from './DynamicCard';
import {
  getTranslatedCardName,
  getTranslatedCardDescription,
  CARD_IMAGES,
  CARD_BACK_IMAGE
} from './cardDatabase';
import { playDrawSound, playDropSound, playEliminatedSound } from '../../utils/soundEffects';
import { CardLegendModal } from '../CardLegendModal';
import { RulesModal } from '../RulesModal';
import TutorialCarousel from '../TutorialCarousel';
import { useIsMobile } from '../../hooks/useIsMobile';
import HeartsGambitGameMobile from './HeartsGambitGameMobile';
import { VictoryScreen } from './VictoryScreen';
import { getTranslation, getCurrentLanguage } from '../../utils/gameTranslations';
import { translateGameMessage } from '../../utils/gameLog';
import { Portal } from '../../utils/portal';
import { CardHoverProvider, CardHoverZone } from './CardHoverContext';
import CardHoverPreview from './CardHoverPreview';
import { Avatar } from '../core/Avatar';
// GameExplainer / BotControls / GAME_META were only used by the bespoke LOBBY
// overlay, which now lives in src/pages/LobbyPage.tsx (standard two-pane lobby).

interface HeartsGambitGameProps {
  lobby: Lobby;
  socket: Socket;
  viewMode?: 'player' | 'broadcast';
}

type DiscardKind = 'play' | 'forced-discard';

type DiscardEvent = {
  playerId: string;
  playerName: string;
  card: CardType;
  kind: DiscardKind;
  timestamp: number;
};

type DiscardEventWithOrder = DiscardEvent & { order: number };

type ZoomCard = {
  key: string;
  card: CardType;
  image: string;
  caption: string;
  meta?: string;
  stamp?: string;
};

type ZoomContext = {
  title: string;
  cards: ZoomCard[];
  index: number;
};

// getTranslatedCardName, getTranslatedCardDescription, and CARD_IMAGES are now imported from cardDatabase.ts

/**
 * Router component that selects between mobile and desktop implementations.
 * This wrapper ensures hooks aren't called conditionally.
 */
const HeartsGambitGame: React.FC<HeartsGambitGameProps> = (props) => {
  const isMobile = useIsMobile();

  if (props.viewMode === 'broadcast') {
    return <HeartsGambitGameDesktop {...props} />;
  }

  if (isMobile) {
    return <HeartsGambitGameMobile {...props} />;
  }

  return <HeartsGambitGameDesktop {...props} />;
};

/**
 * Desktop version of the HeartsGambit game.
 * This is the original full-featured implementation.
 */
const HeartsGambitGameDesktop: React.FC<HeartsGambitGameProps> = ({
  lobby,
  socket,
  viewMode = 'player',
}) => {
  const isBroadcastMirror = viewMode === 'broadcast';
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [guessCard, setGuessCard] = useState<CardType | null>(null);
  const [toast, setToast] = useState<{message: string; type: 'error' | 'success'} | null>(null);
  const [playingCard, setPlayingCard] = useState<{card: CardType; image: string} | null>(null);
  const [eliminationMessage, setEliminationMessage] = useState<string | null>(null);
  const [isDiscardViewerOpen, setIsDiscardViewerOpen] = useState(false);
  const [discardViewerMode, setDiscardViewerMode] = useState<'timeline' | 'by-player'>('timeline');
  const [discardViewerOrder, setDiscardViewerOrder] = useState<'newest' | 'oldest'>('newest');
  const [zoomContext, setZoomContext] = useState<ZoomContext | null>(null);
  const [prevTokens, setPrevTokens] = useState(0);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const tokenAnimationRef = useRef(false);
  const prevEliminatedRef = useRef<Set<string>>(new Set());
  const caseLogEndRef = useRef<HTMLDivElement>(null);
  const language = getCurrentLanguage();
  const t = (key: Parameters<typeof getTranslation>[0]) => getTranslation(key, language);

  // Case Log = system/game-log events ONLY (player chat lives in the rail).
  const caseLog = (lobby.messages || []).filter(m => m.playerId === 'system' || (m as any).isSystem);


  const viewingAsSocketId = (lobby as any).viewingAs as string | undefined;
  const isSpectator = !!lobby.players.find(p => p.socketId === lobby.mySocketId)?.isSpectator;
  const me = viewingAsSocketId
    ? lobby.players.find(p => p.socketId === viewingAsSocketId)
    : lobby.players.find(p => p.socketId === lobby.mySocketId);
  const isMyTurn = !isSpectator && lobby.gameData?.currentTurn === me?.id;
  const myHand = me?.hand || [];
  const otherPlayers = lobby.players.filter(p => p.id !== me?.id && !p.isSpectator);
  const allOpponentsProtected = otherPlayers.every(p => p.isEliminated || p.isImmune);
  const amEliminated = me?.isEliminated || false;
  const discardEvents: DiscardEvent[] | null = lobby.gameData?.discardPile?.length ? (lobby.gameData.discardPile as DiscardEvent[]) : null;
  const faceUpCards = lobby.gameData?.faceUpCards || [];
  const totalDiscardedCount = (discardEvents
    ? discardEvents.length
    : lobby.players.reduce((sum, p) => sum + (p.discarded?.length || 0), 0)) + faceUpCards.length;
  const lastDiscardEvent = discardEvents ? discardEvents[discardEvents.length - 1] : null;
  const lastDiscardOrder = discardEvents ? discardEvents.length : null;
  // Top card currently shown on the evidence/discard pile — used to drive the
  // pinned hover preview when the player hovers the pile.
  const discardTopCard: CardType = (lastDiscardEvent?.card
    ?? (faceUpCards.length ? faceUpCards[faceUpCards.length - 1] : 0)) as CardType;
  const discardTimeline: DiscardEventWithOrder[] | null = discardEvents ? discardEvents.map((evt, i) => ({ ...evt, order: i + 1 })) : null;
  const discardTimelineDisplay = discardTimeline
    ? (discardViewerOrder === 'newest' ? [...discardTimeline].reverse() : discardTimeline)
    : null;

  const openZoom = (ctx: ZoomContext) => setZoomContext(ctx);

  const isMostRecentDiscard = (evt: { timestamp: number; playerId: string; card: CardType }) => {
    return !!lastDiscardEvent
      && evt.timestamp === lastDiscardEvent.timestamp
      && evt.playerId === lastDiscardEvent.playerId
      && evt.card === lastDiscardEvent.card;
  };

  const buildZoomCardsFromTimeline = (events: DiscardEventWithOrder[]) => {
    return events.map((evt) => {
      const actionLabel = evt.kind === 'forced-discard' ? t('game.compelledDiscard') : t('game.played');

      return {
        key: `zoom-${evt.playerId}-${evt.timestamp}-${evt.card}`,
        card: evt.card,
        image: CARD_IMAGES[evt.card],
        caption: getTranslatedCardName(evt.card as any, language),
        meta: `#${evt.order} - ${actionLabel} - ${evt.playerName}`,
        stamp: isMostRecentDiscard(evt) ? 'LATEST' : undefined
      } satisfies ZoomCard;
    });
  };

  // Use server state for draw phase
  const waitingToDraw = isMyTurn && lobby.gameData?.turnPhase === 'draw';
  const drawPendingRef = useRef(false);
  if (!waitingToDraw) drawPendingRef.current = false;

  // Check if player must play Accomplice (has 7 with 5 or 6)
  const mustPlayAccomplice = myHand.includes(7) && (myHand.includes(5) || myHand.includes(6));

  // If waiting to draw, we rely on server not sending the 2nd card yet
  // But strictly, we just show what we have.
  // The server now won't send the 2nd card until we emit 'player:draw'.
  // So 'myHand' will have 1 card during 'draw' phase.
  const displayedHand = myHand;

  // Derive selectedCard from index (fixes bug where two same cards both highlight)
  const selectedCard = selectedCardIndex !== null ? displayedHand[selectedCardIndex] : null;

  // Track token changes for animation
  const currentTokens = me?.tokens || 0;
  const tokensIncreased = currentTokens > prevTokens && prevTokens > 0;

  useEffect(() => {
    if (currentTokens !== prevTokens) {
      if (currentTokens > prevTokens && prevTokens > 0) {
        tokenAnimationRef.current = true;
        setTimeout(() => { tokenAnimationRef.current = false; }, 600);
      }
      setPrevTokens(currentTokens);
    }
  }, [currentTokens, prevTokens]);

  // Auto-scroll the Case Log to the newest entry
  useEffect(() => {
    if (isBroadcastMirror) return;
    caseLogEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [caseLog.length, isBroadcastMirror]);

  // Track player elimination and play gunshot sound
  useEffect(() => {
    const currentEliminated = new Set(
      lobby.players.filter(p => p.isEliminated).map(p => p.id).filter((id): id is string => !!id)
    );
    const prevEliminated = prevEliminatedRef.current;

    // Check if any new player was eliminated
    currentEliminated.forEach(id => {
      if (!prevEliminated.has(id) && !isBroadcastMirror) {
        playEliminatedSound();
      }
    });

    // If I was just eliminated, show overlay with reason from last game message
    if (me?.id && currentEliminated.has(me.id) && !prevEliminated.has(me.id) && !isBroadcastMirror) {
      const lastMsg = lobby.messages?.[lobby.messages.length - 1]?.message || t('game.eliminated');
      setEliminationMessage(lastMsg);
      setTimeout(() => setEliminationMessage(null), 4000);
    }

    prevEliminatedRef.current = currentEliminated;
  }, [isBroadcastMirror, lobby.players]);

  // Listen for server errors
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
    if (isSpectator || isBroadcastMirror) return;
    socket.emit('player:ui-state', { selectedCardIndex, targetId, guessCard });
  }, [selectedCardIndex, targetId, guessCard, isSpectator, isBroadcastMirror, socket]);

  // Spectator: receive viewed player's selection state
  useEffect(() => {
    if (!isSpectator) return;
    // Apply initial uiState from lobby data when switching view
    const uiState = (me as any)?.uiState;
    if (uiState) {
      setSelectedCardIndex(uiState.selectedCardIndex);
      setTargetId(uiState.targetId);
      setGuessCard(uiState.guessCard);
    } else {
      setSelectedCardIndex(null);
      setTargetId(null);
      setGuessCard(null);
    }
  }, [isSpectator, viewingAsSocketId]);

  useEffect(() => {
    if (!isSpectator) return;
    const handler = (data: { selectedCardIndex: number | null; targetId: string | null; guessCard: number | null }) => {
      setSelectedCardIndex(data.selectedCardIndex);
      setTargetId(data.targetId);
      setGuessCard(data.guessCard as CardType | null);
    };
    socket.on('spectator:ui-state', handler);
    return () => { socket.off('spectator:ui-state', handler); };
  }, [isSpectator, socket]);

  const handlePlayCard = () => {
    if (!selectedCard) return;

    // Validation before emit
    const needsTarget = [1, 2, 3, 5, 6].includes(selectedCard);
    const needsGuess = selectedCard === 1;

    // If all opponents are protected (Immune/Eliminated):
    // - Blackmailer (5): Must target self.
    // - Others: Target is null (No Effect).
    let finalTargetId = targetId;

    if (needsTarget && allOpponentsProtected) {
        if (selectedCard === 5) {
            finalTargetId = me?.id || null; // Force self-target for Blackmailer
        } else {
            finalTargetId = null; // No effect for others
        }
    }

    // Only validate target if NOT all protected (or if we failed to set self-target)
    if (needsTarget && !finalTargetId && !allOpponentsProtected) {
      setToast({ message: t('game.selectTargetPlayer'), type: 'error' });
      return;
    }
    if (needsGuess && !guessCard && !allOpponentsProtected) {
      // If playing against no one, do we need a guess? Server says "if (!target) return 'no effect'".
      // So guess is irrelevant if target is null.
      if (!allOpponentsProtected) {
          setToast({ message: t('game.guessACard'), type: 'error' });
          return;
      }
    }

    // Trigger card play animation and sound
    const cardImage = CARD_IMAGES[selectedCard];
    setPlayingCard({ card: selectedCard, image: cardImage });
    playDropSound();

    // Capture current values before resetting state
    const cardToPlay = selectedCard;
    const targetToSend = finalTargetId;
    const guessToSend = guessCard;

    // Reset local state immediately for UI
    setSelectedCardIndex(null);
    setTargetId(null);
    setGuessCard(null);

    // Send to server after animation starts
    setTimeout(() => {
      if (socket.connected) {
        socket.emit('play:card', {
          card: cardToPlay,
          targetId: targetToSend,
          guess: guessToSend
        });
      }
      setPlayingCard(null);
    }, 400);
  };

  useEffect(() => {
    if (!isDiscardViewerOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (zoomContext) {
        setZoomContext(null);
        return;
      }
      setIsDiscardViewerOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDiscardViewerOpen, zoomContext]);

  useEffect(() => {
    if (!isDiscardViewerOpen) setZoomContext(null);
  }, [isDiscardViewerOpen]);

  useEffect(() => {
    if (!zoomContext) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setZoomContext(null);
        return;
      }
      if (e.key === 'ArrowLeft') {
        setZoomContext(prev => {
          if (!prev) return prev;
          const nextIndex = (prev.index - 1 + prev.cards.length) % prev.cards.length;
          return { ...prev, index: nextIndex };
        });
        return;
      }
      if (e.key === 'ArrowRight') {
        setZoomContext(prev => {
          if (!prev) return prev;
          const nextIndex = (prev.index + 1) % prev.cards.length;
          return { ...prev, index: nextIndex };
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [zoomContext]);

  useEffect(() => {
    if (!isDiscardViewerOpen) return;
    if (!discardTimeline && discardViewerMode === 'timeline') setDiscardViewerMode('by-player');
  }, [discardTimeline, discardViewerMode, isDiscardViewerOpen]);

  if (!lobby.gameData) return <div className="text-white text-center mt-20">{t('game.loading')}</div>;

  return (
   <CardHoverProvider>
    <div
      className={`hearts-gambit-game h-full text-[var(--parchment)] flex flex-col items-stretch p-0 overflow-hidden${isBroadcastMirror ? ' hg-broadcast-view' : ''}`}
      data-hearts-gambit-root={isBroadcastMirror ? undefined : 'true'}
    >

      {/* Main Game Container - Dark Table Surface */}
      <div className="w-full h-full rounded-none overflow-hidden shadow-2xl flex flex-col flex-1 min-h-0 relative">

        {/* Large card preview pinned top-right of the stage (desktop hover) */}
        {!isBroadcastMirror && <CardHoverPreview />}

        {/* Case Log — always-visible bottom-LEFT corner panel (system events only) */}
        {!isBroadcastMirror && (
          <div className="ps-caselog" aria-label={t('caseNotes.title')}>
            <div className="ps-caselog-header">
              <ScrollText size={12} className="ps-caselog-icon" />
              <span className="ps-caselog-title">{t('caseNotes.title')}</span>
              <span className="ps-caselog-count">{caseLog.length}</span>
            </div>
            <div className="ps-caselog-body">
              {caseLog.length === 0 ? (
                <div className="ps-caselog-empty">{t('game.noMessagesYet')}</div>
              ) : (
                caseLog.slice(-10).map(msg => (
                  <div key={msg.id} className="ps-caselog-line">{translateGameMessage(msg.message)}</div>
                ))
              )}
              <div ref={caseLogEndRef} />
            </div>
          </div>
        )}

        {/* TOP SECTION: Opponents Area - Dark Table Surface */}
        <div className="ps-opponents-area relative flex-[3] min-h-0 p-3 flex items-center justify-center gap-6 overflow-hidden">

          {otherPlayers.map(player => (
             <div
                key={player.id}
                className={`
                    relative ps-suspect flex flex-col items-center transition-all p-2 rounded-xl
                    ${player.isEliminated ? 'opacity-50 grayscale cursor-not-allowed' : player.isImmune && selectedCard !== 1 ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
                    ${targetId === player.id ? 'ps-opp-targeted bg-[rgba(var(--accent-color-rgb),0.2)] ring-4 ring-[var(--royal-gold)] scale-105' : ''}
                    ${lobby.gameData?.currentTurn === player.id ? 'ps-opp-active bg-[rgba(var(--primary-rgb),0.10)]' : ''}
                    ${player.isImmune && selectedCard === 1 ? 'ring-2 ring-yellow-500/50' : ''}
                `}
                onClick={() => {
                  if (player.isEliminated || !player.id) return;
                  // Allow selecting immune players for Inspector (card 1) - server handles "no effect"
                  if (player.isImmune && selectedCard !== 1) return;
                  setTargetId(player.id);
                }}
             >
                {/* Player Info - Dark Theme */}
                <div className="hg-panel hg-candlelight flex items-center gap-2 p-1.5 rounded-xl w-36 mb-1.5 relative backdrop-blur-sm">
                    {/* Detective decoration: pinned evidence tag (decorative only) */}
                    <span className="hg-decor-tag" aria-hidden="true">File</span>
                    {/* Circular Avatar with Gradient Border */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--royal-gold)] to-[var(--royal-crimson)] p-0.5 overflow-hidden shrink-0 relative">
                        <div className="w-full h-full rounded-full bg-[var(--velvet-dark)] overflow-hidden flex items-center justify-center">
                            <Avatar
                              src={player.avatarUrl}
                              alt={`${player.name} avatar`}
                              className="w-full h-full rounded-full object-cover"
                            />
                        </div>
                        {/* Immunity Shield Badge */}
                        {player.isImmune && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--royal-gold)] rounded-full flex items-center justify-center shadow-lg z-10">
                                <Shield className="w-3 h-3 text-[var(--velvet-dark)]" />
                            </div>
                        )}
                    </div>
                    <div className="overflow-hidden">
                        <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-[var(--parchment)] truncate">{player.name}</span>
                            {player.isHost && <Crown size={12} color="var(--royal-gold)" />}
                            {player.isBot && <Bot size={12} color="var(--parchment-dark)" />}
                        </div>
                        <div className="hg-meta flex items-center gap-2 text-[10px]">
                             <span className="ps-token-mini"><span className="ps-token-mini-disc" aria-hidden="true">★</span>{t('game.tokens').replace('{count}', String(player.tokens))}</span>
                        </div>
                    </div>
                    {/* Eliminated Overlay */}
                    {player.isEliminated && (
                        <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                            <Skull className="w-6 h-6 text-[var(--royal-crimson-light)]" />
                        </div>
                    )}
                </div>

                {/* Opponent Card (Face Down) or Last Played */}
                <div className="relative">
                    {/* Hand Count representation */}
                    <div className="flex justify-center -space-x-8">
                         {Array.from({length: Math.min(player.handCount, 3)}).map((_, i) => {
                             const cardToDisplay = player.hand[i]; // This will be the actual card or '0' (card back)

                             return (
                                 <CardHoverZone
                                    key={`opponent-${player.id}-${i}`}
                                    card={cardToDisplay}
                                 >
                                   <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="hg-opponent-card rounded cursor-pointer"
                                      style={{
                                          transformOrigin: "bottom center",
                                          marginLeft: i > 0 ? "-8px" : 0,
                                          rotate: (i - (player.handCount-1)/2) * 8
                                      }}
                                   >
                                      <DynamicCard
                                          cardType={cardToDisplay}
                                          showFace={cardToDisplay !== 0}
                                          ownerCardStyle={player.cardStyle}
                                          className="hg-opponent-card"
                                      />
                                   </motion.div>
                                 </CardHoverZone>
                             );
                         })}
                    </div>
                    

                </div>
             </div>
          ))}
          
          {otherPlayers.length === 0 && (
             <div className="text-[rgba(246,240,230,0.9)] italic">{t('game.waitingForOpponents')}</div>
          )}
        </div>

        {/* MIDDLE SECTION: Deck Area */}
        <div className="bg-[rgba(0,0,0,0.22)] p-2 flex-[4] min-h-0 flex relative shadow-inner border-y border-[rgba(var(--accent-color-rgb),0.12)]">

          {/* Center Area: Deck & Discard - No Border */}
          <div className="flex-1 flex flex-row items-center justify-center gap-20 relative">
            <div className="ps-deck-evidence-row flex flex-row items-center justify-center gap-20">
              {/* Discard Pile */}
              <div className="flex flex-col items-center relative">
                 <h3 className="text-sm font-bold text-[var(--royal-gold-light)] uppercase tracking-wider mb-2">
                  {t('evidence.title')}
                </h3>
                <CardHoverZone card={discardTopCard}>
                <div
                  className="relative hg-discard-card flex items-center justify-center overflow-visible cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={t('evidence.openEvidenceLocker')}
                  onClick={() => setIsDiscardViewerOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setIsDiscardViewerOpen(true);
                  }}
                >
                    {/* Detective decoration: red-string accent (decorative only) */}
                    <span className="hg-decor-string" aria-hidden="true" />
                    {/* Stack effect (cards under top card) */}
                    {(() => {
                      const stackDepth = Math.min(Math.max(totalDiscardedCount - 1, 0), 4);
                      if (!stackDepth) return null;

                      return (
                        <div className="absolute inset-0 pointer-events-none">
                          {Array.from({ length: stackDepth }).map((_, i) => (
                            <img
                              key={`discard-stack-${i}`}
                              src={CARD_BACK_IMAGE}
                              alt={t('evidence.evidenceStack')}
                              className="absolute inset-0 w-full h-full object-cover rounded-xl shadow-2xl opacity-30"
                              style={{
                                transform: `translate(${(i + 1) * 2}px, ${-(i + 1) * 2}px) rotate(${(i % 2 ? -1 : 1) * (i + 1)}deg)`,
                                zIndex: i
                              }}
                            />
                          ))}
                        </div>
                      );
                    })()}

                    {(() => {
                         if (lastDiscardEvent) {
                           return (
                             <motion.div
                               key={`discard-pile-${lastDiscardEvent.playerId}-${lastDiscardEvent.timestamp}-${lastDiscardEvent.card}`}
                               initial={{ opacity: 0, scale: 0.9 }}
                               animate={{ opacity: 1, scale: 1 }}
                               className="relative z-10"
                             >
                               <DynamicCard
                                 cardType={lastDiscardEvent.card}
                                 className="hg-discard-pile-card"
                               />
                             </motion.div>
                           );
                         }

                         const activeIdx = lobby.players.findIndex(p => p.id === lobby.gameData?.currentTurn);
                         const idx = activeIdx === -1 ? 0 : activeIdx;
                         const prevPlayer = lobby.players[(idx - 1 + lobby.players.length) % lobby.players.length];
                         const topCard = prevPlayer?.discarded.length ? prevPlayer.discarded[prevPlayer.discarded.length-1] : null;

                         if (!topCard) {
                           // Show face-up cards if available (2-player games)
                           if (faceUpCards.length > 0) {
                             return (
                               <div className="relative z-10">
                                 <DynamicCard
                                   cardType={faceUpCards[faceUpCards.length - 1]}
                                   className="hg-discard-pile-card"
                                 />
                               </div>
                             );
                           }
                           return (
                               <span className="hg-meta text-xs text-[var(--royal-gold-light)]">{t('evidence.noEvidence')}</span>
                           );
                         }

                         return (
                            <motion.div
                                key={`discard-pile-${topCard}`}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="relative z-10"
                            >
                                <DynamicCard
                                  cardType={topCard}
                                  className="hg-discard-pile-card"
                                />
                            </motion.div>
                         );
                    })()}

                    {totalDiscardedCount > 0 && (
                      <div className="absolute -top-2 -right-2 bg-[var(--royal-gold)] text-[var(--velvet-dark)] text-[10px] font-black px-2 py-1 rounded-full shadow-lg z-20">
                        {totalDiscardedCount}
                      </div>
                    )}

                    {lastDiscardEvent && (
                      <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap z-20">
                        <span className="hg-stamp text-[var(--parchment)] px-3 py-1 rounded-full text-[10px] font-bold">
                          {t('evidence.latestEvidence')}: {getTranslatedCardName(lastDiscardEvent.card as any, language)}
                          {typeof lastDiscardOrder === 'number' ? ` #${lastDiscardOrder}` : ''} - {lastDiscardEvent.playerName}
                        </span>
                      </div>
                    )}
                </div>
                </CardHoverZone>
              </div>

              {/* Deck */}
              <div className="flex flex-col items-center relative">
                <h3 className="text-sm font-bold text-[var(--royal-gold-light)] uppercase tracking-wider mb-2">
                  Case File <span className="text-[var(--parchment-dark)]">({lobby.gameData.deckCount})</span>
                </h3>
                <div
                    className={`relative hg-deck-card transition-all ${waitingToDraw ? 'cursor-pointer hover:scale-105' : ''}`}
                    onClick={() => { if (waitingToDraw && socket.connected && !drawPendingRef.current) { drawPendingRef.current = true; playDrawSound(); socket.emit('player:draw', {}); } }}
                >
                  {/* Detective decoration: rotated rubber CLASSIFIED stamp (decorative only) */}
                  <span className="hg-decor-stamp" aria-hidden="true">Classified</span>
                  {Array.from({ length: Math.min(lobby.gameData.deckCount, 5) }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute inset-0 transition-transform"
                      style={{
                        transform: `translate(${i * 1}px, ${-i * 1}px)`,
                        zIndex: i
                      }}
                    >
                      <img src={CARD_BACK_IMAGE} alt={t('game.caseFile')} className="w-full h-full object-cover rounded-xl shadow-2xl" />
                    </div>
                  ))}

                  {/* The "To Be Drawn" Card (Ghost) */}
                  {waitingToDraw && (
                      <motion.div
                        layoutId="drawing-card"
                        className="absolute inset-0 z-50"
                        style={{ transform: `translate(${(Math.min(lobby.gameData.deckCount, 5) * 2)}px, ${-(Math.min(lobby.gameData.deckCount, 5) * 2)}px)` }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                          <img src={CARD_BACK_IMAGE} alt="Draw" className="w-full h-full object-cover rounded-xl shadow-2xl" />
                      </motion.div>
                  )}
                  {/* Draw indicator */}
                  {waitingToDraw && (
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap">
                          <span className="bg-[var(--royal-gold)] text-[var(--velvet-dark)] px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                            {t('game.draw')}
                          </span>
                      </div>
                  )}
                </div>
              </div>
            </div>

            {/* LOBBY waiting state moved to the standard two-pane LobbyPage
                (src/pages/LobbyPage.tsx). HeartsGambitGame now only renders for
                PLAYING / ENDED, so no waiting overlay is needed here. */}
          </div>

        </div>

        {/* BOTTOM SECTION: Player Area */}
        <div className={`
          bg-[rgba(0,0,0,0.20)] flex-[3] min-h-0 p-3 relative flex flex-col overflow-hidden transition-all border-t border-[rgba(var(--accent-color-rgb),0.10)]
          ${amEliminated ? 'opacity-50 grayscale' : ''}
          ${isMyTurn && !amEliminated ? 'ring-2 ring-[var(--royal-gold)] ring-inset shadow-[inset_0_0_30px_rgba(var(--accent-color-rgb),0.28)]' : ''}
        `}>
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[rgba(var(--accent-color-rgb),0.18)] via-[rgba(var(--accent-color-rgb),0.45)] to-[rgba(var(--accent-color-rgb),0.18)] ${isMyTurn ? 'animate-pulse' : ''}`}></div>

            <div className="flex items-center gap-3 mb-3 z-10 relative">
              <motion.span
                className={`ps-token-coin${tokensIncreased ? ' is-pulse' : ''}`}
                animate={tokensIncreased ? { scale: [1, 1.18, 1] } : {}}
                transition={{ duration: 0.6 }}
              >
                <span className="ps-token-disc" aria-hidden="true">★</span>
                {t('game.tokens').replace('{count}', String(me?.tokens || 0))}
              </motion.span>
              {isMyTurn && <span className="ps-turn-badge">⚖ {t('game.yourTurn')}</span>}
              {waitingToDraw && <span className="ps-chip ps-chip--draw">{t('game.drawCard')}</span>}
              {mustPlayAccomplice && !waitingToDraw && (
                <span className="ps-chip ps-chip--warn">
                  {t('game.mustPlayAccomplice')}
                </span>
              )}
              {amEliminated && (
                <span className="ps-chip ps-chip--elim">
                  <Skull size={14} /> {t('game.eliminated')}
                </span>
              )}

              {/* Card Legend, Rules & How to Play Buttons */}
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setIsLegendOpen(true)}
                  className="ps-btn ps-btn--ghost ps-btn--sm"
                  title={t('cardLegend.title')}
                >
                  <BookOpen size={16} />
                  {t('cardLegend.title')}
                </button>
                <button
                  onClick={() => setIsRulesOpen(true)}
                  className="ps-btn ps-btn--ghost ps-btn--sm"
                  title={t('rules.button')}
                >
                  <ScrollText size={16} />
                  {t('rules.button')}
                </button>
                <button
                  onClick={() => setIsTutorialOpen(true)}
                  className="ps-btn ps-btn--ghost ps-btn--sm"
                  title={t('tutorial.howToPlay')}
                >
                  <HelpCircle size={16} />
                  {t('tutorial.howToPlay')}
                </button>
              </div>
            </div>

            <div className="ps-hand-area w-full flex justify-center items-end flex-1 min-h-0 pb-2 gap-4">
               {/* My Hand */}
               <AnimatePresence>
                   {displayedHand.map((card, idx) => {
                       // Identify if this is the "newly drawn" card (index 1) for animation
                       // Only animate index 1 if we are in "drawn" state and it's my turn
                       const isNewCard = idx === 1 && !waitingToDraw && isMyTurn;

                       return (
                           <motion.div
                              key={`card-${card}-${idx}`}
                              layoutId={isNewCard ? "drawing-card" : undefined}
                              initial={isNewCard ? { opacity: 0, scale: 0.5 } : { opacity: 1, scale: 1 }}
                              animate={{ opacity: 1, scale: selectedCardIndex === idx ? 1.1 : 1, y: selectedCardIndex === idx ? -15 : 0 }}
                              exit={{ opacity: 0, y: -50, scale: 0.5 }}
                              transition={{ type: "spring", stiffness: 300, damping: 25 }}
                              className={`
                                 relative group
                                 ${!isMyTurn || amEliminated ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}
                              `}
                              onClick={() => isMyTurn && !waitingToDraw && !amEliminated && setSelectedCardIndex(idx)}
                           >
                              <CardHoverZone card={card}>
                                <DynamicCard
                                    cardType={card}
                                    selected={selectedCardIndex === idx}
                                    ownerCardStyle={me?.cardStyle}
                                    className="hg-hand-card"
                                />
                              </CardHoverZone>
                           </motion.div>
                       );
                   })}
               </AnimatePresence>
            </div>

        </div>

        {/* Context Actions Menu (Floating above game; avoids section clipping) */}
        <AnimatePresence mode="wait">
          {(isMyTurn || isSpectator) && selectedCard && !waitingToDraw && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`
                hg-context-actions
                absolute bottom-5 right-5
                bg-[rgba(0,0,0,0.92)] text-white p-3 rounded-xl
                shadow-2xl border border-[rgba(var(--accent-color-rgb),0.30)] z-40
                w-[560px] max-w-[calc(100%-2.5rem)]
                ${isSpectator ? 'pointer-events-none opacity-95' : ''}
              `}
            >
              {/* Inner wrapper holds the scroll so the menu box can stay
                  overflow:visible and its top decorations (ACTION tab + wax seal)
                  are never clipped. */}
              <div
                className={`hg-context-actions-inner w-full ${selectedCard === 1 ? 'flex flex-col gap-3' : 'flex flex-wrap items-center gap-4'}`}
              >
              {/* Row 1: Playing + Target */}
              <div className={`flex items-center gap-4 ${selectedCard === 1 ? 'w-full' : ''}`}>
                <div className="flex flex-col">
                  <span className="text-xs text-[var(--parchment-dark)] uppercase font-bold">{t('game.playing')}</span>
                  <span className="font-bold text-[var(--royal-gold-light)]">{getTranslatedCardName(selectedCard as any, language)}</span>
                </div>

                <div className="h-8 w-px bg-[rgba(var(--accent-color-rgb),0.25)]"></div>

                {/* Dynamic Inputs based on Card */}
                {[1, 2, 3, 5, 6].includes(selectedCard) && (
                  <div className="flex flex-col">
                    <span className="text-xs text-[var(--parchment-dark)] uppercase font-bold">{t('game.target')}</span>
                    {selectedCard === 5 && !allOpponentsProtected ? (
                      <select
                        className="bg-[var(--velvet-dark)] border border-[rgba(var(--accent-color-rgb),0.30)] rounded px-2 py-1 text-sm outline-none focus:border-[var(--royal-gold)] text-white"
                        value={targetId || ''}
                        onChange={e => setTargetId(e.target.value)}
                      >
                        <option value="">{t('game.selectTargetPlaceholder')}</option>
                        <option value={me?.id}>{t('game.self')}</option>
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
                    ) : allOpponentsProtected ? (
                      <span className="font-bold text-[var(--royal-gold-light)]">
                        {selectedCard === 5 ? t('game.selfForced') : t('game.noneAllProtected')}
                      </span>
                    ) : (
                      <span
                        className={`font-bold ${
                          targetId ? 'text-[var(--royal-gold-light)]' : 'text-[var(--royal-crimson-light)] animate-pulse'
                        }`}
                      >
                        {targetId ? lobby.players.find(p => p.id === targetId)?.name : t('game.selectPlayerAbove')}
                      </span>
                    )}
                  </div>
                )}

                {/* Confirm/Cancel for non-Inspector cards */}
                {selectedCard !== 1 && (
                  <>
                    <button
                      onClick={handlePlayCard}
                      disabled={[2, 3, 5, 6].includes(selectedCard) && !allOpponentsProtected && !targetId}
                      className="ps-btn ps-btn--primary"
                    >
                      {t('game.confirm')}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCardIndex(null);
                        setTargetId(null);
                        setGuessCard(null);
                      }}
                      className="ps-btn ps-btn--subtle"
                    >
                      {t('common.cancel')}
                    </button>
                  </>
                )}
              </div>

              {/* Row 2: Inspector card selection grid */}
              {selectedCard === 1 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-[var(--parchment-dark)] uppercase font-bold">{t('game.guessCard')}</span>
                  <div className="grid grid-cols-4 gap-3 justify-items-center">
                    {[2, 3, 4, 5, 6, 7, 8].map(cardNum => (
                      <div
                        key={cardNum}
                        onClick={() => !allOpponentsProtected && setGuessCard(cardNum as CardType)}
                        className={`
                          cursor-pointer transition-all
                          ${
                            guessCard === cardNum
                              ? 'scale-110 shadow-[0_0_20px_rgba(var(--accent-color-rgb),0.6)] z-10'
                              : 'hover:scale-105 opacity-80 hover:opacity-100'
                          }
                          ${allOpponentsProtected ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <CardHoverZone card={cardNum as CardType}>
                          <DynamicCard
                            cardType={cardNum as CardType}
                            selected={guessCard === cardNum}
                            className="hg-guard-select-card"
                          />
                        </CardHoverZone>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Row 3: Inspector Confirm/Cancel buttons */}
              {selectedCard === 1 && (
                <div className="flex items-center justify-center gap-4 pt-2 border-t border-[rgba(var(--accent-color-rgb),0.18)]">
                  <button
                    onClick={handlePlayCard}
                    disabled={(!allOpponentsProtected && !targetId) || (!allOpponentsProtected && !guessCard)}
                    className="ps-btn ps-btn--primary"
                  >
                    {t('game.confirm')}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCardIndex(null);
                      setTargetId(null);
                      setGuessCard(null);
                    }}
                    className="ps-btn ps-btn--subtle"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Elimination Alert Card — positioned above Case Notes (bottom-left) */}
      <AnimatePresence>
        {eliminationMessage && (
          <motion.div
            className="absolute bottom-56 left-4 w-72 z-[55] hg-panel border-2 border-[var(--royal-crimson-light)] rounded-xl p-4 shadow-[0_0_30px_rgba(168,52,74,0.35)]"
            style={{ background: 'linear-gradient(135deg, rgba(30,10,10,0.95), rgba(60,15,15,0.95))' }}
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Skull className="w-8 h-8 text-[var(--danger-500)] flex-shrink-0 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
              <h3 className="text-lg font-black text-[var(--danger-500)] uppercase tracking-widest">
                {t('game.eliminated')}
              </h3>
            </div>
            <p className="text-sm text-[var(--parchment)] leading-relaxed opacity-90">
              {eliminationMessage}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Victory / Round-Over Overlay */}
      {(lobby.gameData.roundWinner || lobby.gameData.winner) && (
        <VictoryScreen lobby={lobby} socket={socket} viewMode={viewMode} />
      )}

      {/* Discard Viewer */}
      <AnimatePresence>
        {isDiscardViewerOpen && (
          <Portal>
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setIsDiscardViewerOpen(false);
            }}
          >
            <motion.div
              className="hg-panel hg-candlelight w-full max-w-4xl rounded-2xl shadow-[0_0_50px_rgba(var(--accent-color-rgb),0.20)] overflow-hidden"
              initial={{ scale: 0.98, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 8 }}
              transition={{ duration: 0.15 }}
              role="dialog"
              aria-modal="true"
              aria-label={t('evidence.openEvidenceLocker')}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(var(--accent-color-rgb),0.18)]">
                <div>
                  <div className="hg-meta text-xs tracking-widest text-[rgba(var(--accent-color-rgb),0.85)] font-bold">{t('evidence.locker')}</div>
                  <div className="text-sm text-[rgba(246,240,230,0.9)]">{totalDiscardedCount} {t('evidence.itemsLogged')}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex bg-white/5 rounded-lg p-1">
                      <button
                        disabled={!discardTimeline}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                            !discardTimeline
                              ? 'text-[rgba(246,240,230,0.4)] cursor-not-allowed'
                            : discardViewerMode === 'timeline'
                              ? 'bg-[var(--royal-gold)] text-[var(--velvet-dark)]'
                              : 'text-[var(--parchment-dark)] hover:text-white'
                        }`}
                          onClick={() => discardTimeline && setDiscardViewerMode('timeline')}
                          title={discardTimeline ? 'Show evidence in order' : 'Chronology requires updated server evidence history'}
                        >
                          {t('evidence.chronology')}
                        </button>
                        <button
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                          discardViewerMode === 'by-player' ? 'bg-[var(--royal-gold)] text-[var(--velvet-dark)]' : 'text-[var(--parchment-dark)] hover:text-white'
                        }`}
                          onClick={() => setDiscardViewerMode('by-player')}
                        >
                          {t('evidence.byPlayer')}
                      </button>
                    </div>

                    {discardViewerMode === 'timeline' && discardTimeline && (
                      <div className="flex bg-white/5 rounded-lg p-1">
                        <button
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                            discardViewerOrder === 'newest' ? 'bg-white/10 text-white' : 'text-[var(--parchment-dark)] hover:text-white'
                          }`}
                          onClick={() => setDiscardViewerOrder('newest')}
                        >
                          {t('evidence.newestFirst')}
                        </button>
                        <button
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                            discardViewerOrder === 'oldest' ? 'bg-white/10 text-white' : 'text-[var(--parchment-dark)] hover:text-white'
                          }`}
                          onClick={() => setDiscardViewerOrder('oldest')}
                        >
                          {t('evidence.oldestFirst')}
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    className="text-[var(--parchment-dark)] hover:text-white px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    onClick={() => setIsDiscardViewerOpen(false)}
                  >
                    {t('evidence.close')}
                  </button>
                </div>
              </div>

              <div className="p-5 max-h-[70vh] overflow-y-auto">
                {totalDiscardedCount === 0 ? (
                  <div className="text-[rgba(246,240,230,0.88)] italic text-center py-10">{t('evidence.noEvidenceLogged')}</div>
                ) : (
                  <div className="space-y-6">
                    {/* Face-up cards (2-player) */}
                    {faceUpCards.length > 0 && (
                      <div className="border-b border-[rgba(var(--accent-color-rgb),0.2)] pb-4">
                        <div className="text-center text-sm text-[rgba(246,240,230,0.8)] mb-3">
                          <span className="text-[var(--royal-gold-light)] font-bold">{t('evidence.removedAtStart')}</span>
                          <span className="text-[rgba(246,240,230,0.85)]"> {t('evidence.outOfPlay')}</span>
                        </div>
                        <div className="flex flex-wrap gap-3 justify-center">
                          {faceUpCards.map((card, idx) => (
                            <div key={`faceup-${idx}`} className="flex flex-col items-center gap-1">
                              <DynamicCard
                                cardType={card}
                                className="hg-evidence-card opacity-75"
                              />
                              <span className="text-[10px] text-[var(--parchment-dark)]">{getTranslatedCardName(card as any, language)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {discardTimelineDisplay ? (
                      <>
                        {lastDiscardEvent && (
                          <div className="text-center text-sm text-[rgba(246,240,230,0.8)]">
                            {t('evidence.latestEvidence')}: <span className="text-white font-bold">{getTranslatedCardName(lastDiscardEvent.card as any, language)}</span>
                            {typeof lastDiscardOrder === 'number' ? (
                              <span className="hg-meta ml-2 text-[rgba(246,240,230,0.8)]">#{lastDiscardOrder}</span>
                            ) : null}
                            <span className="text-[rgba(246,240,230,0.8)]"> - {lastDiscardEvent.playerName}</span>
                          </div>
                        )}

                        {discardViewerMode === 'timeline' ? (
                          <div className="flex flex-wrap gap-4 justify-center">
                            {discardTimelineDisplay.map((evt, idx) => {
                              const isMostRecent = !!lastDiscardEvent
                                && evt.timestamp === lastDiscardEvent.timestamp
                                && evt.playerId === lastDiscardEvent.playerId
                                && evt.card === lastDiscardEvent.card;
                              const actionLabel = evt.kind === 'forced-discard' ? t('evidence.compelledDiscard') : t('evidence.played');

                              return (
                                <div key={`discard-timeline-${evt.playerId}-${evt.timestamp}-${evt.card}`} className="flex flex-col items-center gap-2">
                                  <CardTooltip
                                    card={evt.card}
                                    cardImage={CARD_IMAGES[evt.card]}
                                    cardName={getTranslatedCardName(evt.card as any, language)}
                                    cardDescription={getTranslatedCardDescription(evt.card as any, language)}
                                    useDynamicCard={true}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => openZoom({ title: t('evidence.chronology'), cards: buildZoomCardsFromTimeline(discardTimelineDisplay), index: idx })}
                                      className={`relative transition-all cursor-zoom-in ${
                                        isMostRecent ? 'ring-2 ring-[var(--royal-gold)]' : ''
                                      }`}
                                      aria-label={t('evidence.inspectCard').replace('{cardName}', getTranslatedCardName(evt.card as any, language))}
                                    >
                                      <DynamicCard
                                        cardType={evt.card}
                                        className="hg-evidence-card"
                                      />
                                      <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-black px-2 py-1 rounded-full border border-white/10 z-20">
                                        #{evt.order}
                                      </div>
                                    {isMostRecent && (
                                      <div className="hg-stamp absolute top-2 left-2 text-[10px] font-black px-2 py-1 rounded-full z-20">
                                        {t('evidence.latest')}
                                      </div>
                                    )}
                                  </button>
                                </CardTooltip>
                                <div className="text-[11px] text-[rgba(246,240,230,0.8)] text-center max-w-[220px]">
                                  <span className="text-white font-bold">{evt.playerName}</span> - {actionLabel}
                                </div>
                              </div>
                            );
                            })}
                          </div>
                        ) : (
                          <div className="space-y-8">
                            {(() => {
                              const byPlayer = new Map<string, { playerName: string; events: typeof discardTimelineDisplay }>();
                              for (const evt of discardTimeline!) {
                                const existing = byPlayer.get(evt.playerId);
                                if (existing) existing.events.push(evt);
                                else byPlayer.set(evt.playerId, { playerName: evt.playerName, events: [evt] });
                              }

                              return lobby.players
                                .map(p => ({ id: p.id || '', name: p.name }))
                                .filter(p => p.id && byPlayer.has(p.id))
                                .map(p => {
                                  const entry = byPlayer.get(p.id)!;
                                  const events = entry.events; // chronological for that player
                                  return (
                                    <div key={`discard-by-player-${p.id}`} className="space-y-3">
                                      <div className="flex items-baseline justify-between">
                                        <div className="text-white font-bold">{entry.playerName}</div>
                                        <div className="text-xs text-[rgba(246,240,230,0.88)]">{events.length} {t('evidence.items')}</div>
                                      </div>
                                      <div className="flex flex-wrap gap-3 justify-center">
                                        {events.map((evt, eventIdx) => {
                                          const isMostRecent = !!lastDiscardEvent
                                            && evt.timestamp === lastDiscardEvent.timestamp
                                            && evt.playerId === lastDiscardEvent.playerId
                                            && evt.card === lastDiscardEvent.card;

                                          return (
                                            <CardTooltip
                                              key={`discard-by-player-card-${evt.playerId}-${evt.timestamp}-${evt.card}`}
                                              card={evt.card}
                                              cardImage={CARD_IMAGES[evt.card]}
                                              cardName={getTranslatedCardName(evt.card as any, language)}
                                              cardDescription={getTranslatedCardDescription(evt.card as any, language)}
                                              useDynamicCard={true}
                                            >
                                              <button
                                                type="button"
                                                onClick={() => openZoom({ title: t('evidence.playerEvidence').replace('{playerName}', entry.playerName), cards: buildZoomCardsFromTimeline(events as DiscardEventWithOrder[]), index: eventIdx })}
                                                className={`relative transition-all cursor-zoom-in ${isMostRecent ? 'ring-2 ring-[var(--royal-gold)]' : ''}`}
                                                aria-label={t('evidence.inspectCard').replace('{cardName}', getTranslatedCardName(evt.card as any, language))}
                                              >
                                                <DynamicCard
                                                  cardType={evt.card}
                                                  className="hg-evidence-card"
                                                />
                                                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-black px-2 py-1 rounded-full border border-white/10 z-20">
                                                  #{evt.order}
                                                </div>
                      {isMostRecent && (
                        <div className="hg-stamp absolute top-2 left-2 text-[10px] font-black px-2 py-1 rounded-full z-20">
                          LATEST
                        </div>
                      )}
                                              </button>
                                            </CardTooltip>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                });
                            })()}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="space-y-8">
                        {lobby.players
                          .filter(p => (p.discarded?.length || 0) > 0)
                          .map(p => (
                            <div key={`discard-section-${p.id}`} className="space-y-3">
                              <div className="flex items-baseline justify-between">
                                <div className="text-white font-bold">{p.name}</div>
                                <div className="text-xs text-[rgba(246,240,230,0.88)]">{p.discarded.length} items</div>
                              </div>
                              <div className="flex flex-wrap gap-3 justify-center">
                                {p.discarded.map((card, idx) => (
                                  <CardTooltip
                                    key={`discard-${p.id}-${idx}-${card}`}
                                    card={card}
                                    cardImage={CARD_IMAGES[card]}
                                    cardName={getTranslatedCardName(card as any, language)}
                                    cardDescription={getTranslatedCardDescription(card as any, language)}
                                    useDynamicCard={true}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const cards: ZoomCard[] = p.discarded.map((c, i) => ({
                                          key: `zoom-discarded-${p.id}-${i}-${c}`,
                                          card: c,
                                          image: CARD_IMAGES[c],
                                          caption: getTranslatedCardName(c as any, language),
                                          meta: `#${i + 1} - ${p.name}`
                                        }));
                                        openZoom({ title: t('evidence.playerEvidence').replace('{playerName}', p.name), cards, index: idx });
                                      }}
                                      className="relative transition-all cursor-zoom-in hover:ring-2 hover:ring-[rgba(var(--accent-color-rgb),0.35)]"
                                      aria-label={t('evidence.inspectCard').replace('{cardName}', getTranslatedCardName(card as any, language))}
                                    >
                                      <DynamicCard
                                        cardType={card}
                                        className="hg-evidence-card"
                                      />
                                    </button>
                                  </CardTooltip>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>

            <AnimatePresence>
              {zoomContext && (
                <Portal>
                <motion.div
                  className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onPointerDown={(e) => {
                    if (e.target === e.currentTarget) setZoomContext(null);
                  }}
                  role="dialog"
                  aria-modal="true"
                  aria-label={t('evidence.evidenceInspector')}
                >
                  <motion.div
                    className="hg-panel hg-candlelight w-full max-w-[640px] rounded-2xl overflow-hidden"
                    initial={{ scale: 0.985, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.985, y: 10 }}
                    transition={{ duration: 0.12 }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(var(--accent-color-rgb),0.18)]">
                      <div className="min-w-0">
                        <div className="hg-meta text-xs font-bold text-[rgba(var(--accent-color-rgb),0.85)]">{t('evidence.inspector')}</div>
                        <div className="text-sm text-[rgba(246,240,230,0.9)] truncate">{zoomContext.title}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="hg-meta text-[10px] text-[rgba(246,240,230,0.9)]">
                          {zoomContext.index + 1}/{zoomContext.cards.length}
                        </span>
                        <button
                          className="text-[var(--parchment-dark)] hover:text-white px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                          onClick={() => setZoomContext(null)}
                        >
                          {t('evidence.close')}
                        </button>
                      </div>
                    </div>

                    {(() => {
                      const active = zoomContext.cards[zoomContext.index];
                      return (
                        <div className="p-5 flex flex-col items-center gap-4">
                          <div className="flex items-center justify-between w-full gap-3">
                            <button
                              type="button"
                              className="hg-stamp px-4 py-2 rounded-xl text-xs font-black text-[var(--parchment)] hover:bg-black/60 transition-colors"
                              onClick={() => setZoomContext(prev => {
                                if (!prev) return prev;
                                const nextIndex = (prev.index - 1 + prev.cards.length) % prev.cards.length;
                                return { ...prev, index: nextIndex };
                              })}
                            >
                              {t('evidence.prev')}
                            </button>

                            <div className="text-center min-w-0">
                              <div className="text-white font-bold truncate">{active.caption}</div>
                              {active.meta && <div className="hg-meta text-[10px] mt-1">{active.meta}</div>}
                              <div className="hg-meta text-[10px] mt-1 text-[rgba(246,240,230,0.88)]">{t('evidence.tipUseArrowKeys')}</div>
                            </div>

                            <button
                              type="button"
                              className="hg-stamp px-4 py-2 rounded-xl text-xs font-black text-[var(--parchment)] hover:bg-black/60 transition-colors"
                              onClick={() => setZoomContext(prev => {
                                if (!prev) return prev;
                                const nextIndex = (prev.index + 1) % prev.cards.length;
                                return { ...prev, index: nextIndex };
                              })}
                            >
                              {t('evidence.next')}
                            </button>
                          </div>

                          <div className="relative">
                            {active.stamp && (
                              <div className="hg-stamp absolute top-3 left-3 text-[10px] font-black px-3 py-1 rounded-full z-20">
                                {active.stamp}
                              </div>
                            )}
                            <DynamicCard
                              cardType={active.card}
                              className="hg-inspector-card"
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </motion.div>
                </motion.div>
                </Portal>
              )}
            </AnimatePresence>
          </motion.div>
          </Portal>
        )}
      </AnimatePresence>

      {/* Card Play Animation */}
      <AnimatePresence>
        {playingCard && (
          <motion.div
            initial={{ scale: 1, opacity: 1 }}
            animate={{
              scale: 1.3,
              opacity: 0,
              y: -100
            }}
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
    </div>
   </CardHoverProvider>
  );
};

export default HeartsGambitGame;
