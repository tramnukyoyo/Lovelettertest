import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Shield, Crown, Skull, Bot, ChevronRight } from 'lucide-react';
import type { CardType, Player } from '../../types';
import DynamicCard from './DynamicCard';
import { getTranslation, getCurrentLanguage } from '../../utils/gameTranslations';
import { Avatar } from '../core/Avatar';
import { FlairName } from '../core/ProfileIdentity';
import { getPlayerProfile } from '../../services/playerProfiles';
import { frameThemeClass } from '../../utils/frameThemes';

interface MobileOpponentStripProps {
  /** Other players to display */
  players: Player[];
  /** Current turn player ID */
  currentTurnId: string | undefined;
  /** Currently selected card (for immune highlighting) */
  selectedCard: CardType | null;
  /** Currently targeted player ID */
  targetId: string | null;
  /** Callback when player is selected as target */
  onSelectTarget: (playerId: string) => void;
  /** Callback to inspect an opponent's cards */
  onInspectOpponent?: (player: Player) => void;
  /** Callback to show card preview */
  onPreviewCard?: (card: CardType | null) => void;
}

const MobileOpponentStrip: React.FC<MobileOpponentStripProps> = ({
  players,
  currentTurnId,
  selectedCard,
  targetId,
  onSelectTarget,
  onInspectOpponent,
  onPreviewCard,
}) => {
  // Translation helper
  const language = getCurrentLanguage();
  const t = (key: Parameters<typeof getTranslation>[0]) => getTranslation(key, language);

  // Horizontal overflow tracking — the strip runs full-width across the top of
  // the portrait table; with 4+ suspects it scrolls, so it needs a real
  // affordance (edge fades + a tappable chevron), never a silent clip.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setOverflow({
      left: el.scrollLeft > 4,
      right: max > 4 && el.scrollLeft < max - 4,
    });
  }, []);

  useEffect(() => {
    measure();
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, players.length]);

  const scrollForward = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: Math.round(el.clientWidth * 0.7), behavior: 'smooth' });
  }, []);

  if (players.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--parchment-dark)] italic text-sm">
        {t('game.waitingForOpponents')}
      </div>
    );
  }

  return (
    <div className="hg-suspects-strip relative w-full h-full">
      {/* Scroll container with snap */}
      <div
        ref={scrollRef}
        onScroll={measure}
        className="hg-suspects-track flex h-full items-start overflow-x-auto overflow-y-hidden snap-x snap-mandatory gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 scrollbar-hide"
      >
        {players.map((player) => {
          const isCurrentTurn = currentTurnId === player.id;
          const isTargeted = targetId === player.id;
          const isEliminated = player.isEliminated;
          const isImmune = player.isImmune;
          // Inspector (card 1) can target immune players
          const canTarget = !isEliminated && (!isImmune || selectedCard === 1);

          return (
            <div
              key={player.id}
              className={`
                hg-suspect-tile snap-center flex-shrink-0 flex flex-col items-center p-1.5 sm:p-2 rounded-xl
                min-w-[80px] sm:min-w-[100px] max-w-[100px] sm:max-w-[120px]
                ${isEliminated ? 'is-out' : ''}
                ${!canTarget && !isEliminated ? 'is-protected' : ''}
                ${isTargeted ? 'is-targeted' : ''}
                ${isCurrentTurn ? 'is-turn' : ''}
                ${isImmune && selectedCard === 1 ? 'is-piercable' : ''}
                ${canTarget ? 'is-targetable' : 'is-locked'}
              `}
              onClick={() => {
                if (canTarget && player.id) {
                  onSelectTarget(player.id);
                }
              }}
            >
              {/* Avatar with status indicators */}
              <div className="relative mb-1">
                <div className="hg-suspect-avatar w-10 h-10 rounded-full bg-gradient-to-br from-[var(--royal-gold)] to-[var(--royal-crimson)] p-0.5 overflow-hidden">
                  <div className="w-full h-full rounded-full bg-[var(--velvet-dark)] overflow-hidden">
                    <Avatar
                      src={player.avatarUrl}
                      alt={`${player.name} avatar`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Immunity shield badge */}
                {isImmune && !isEliminated && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--royal-gold)] rounded-full flex items-center justify-center shadow-lg">
                    <Shield className="w-3 h-3 text-[var(--velvet-dark)]" />
                  </div>
                )}

                {/* Eliminated skull */}
                {isEliminated && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                    <Skull className="w-6 h-6 text-[#a8344a]" />
                  </div>
                )}
              </div>

              {/* Player name */}
              <div className="flex items-center gap-1 max-w-full">
                <FlairName player={player} className="hg-suspect-name text-xs font-bold text-[var(--parchment)] truncate" />
                {player.isHost && <Crown size={12} color="var(--royal-gold)" style={{ flexShrink: 0 }} />}
                {player.isBot && <Bot size={12} color="var(--parchment-dark)" style={{ flexShrink: 0 }} />}
              </div>

              {/* Tokens */}
              <div className="hg-suspect-tokens text-xs text-[var(--parchment-dark)] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--royal-crimson)]" />
                {t('game.tokens').replace('{count}', String(player.tokens))}
              </div>

              {/* Card count / preview */}
              <div
                className="hg-suspect-cards mt-1 relative"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onInspectOpponent) {
                    onInspectOpponent(player);
                  }
                }}
              >
                <div className="flex justify-center -space-x-4">
                  {Array.from({ length: Math.min(player.handCount, 2) }).map((_, i) => {
                    const cardToDisplay = player.hand?.[i];
                    const isFaceUp = cardToDisplay !== undefined && cardToDisplay !== 0;

                    return (
                      <div
                        key={`opponent-card-${player.id}-${i}`}
                        style={{
                          transform: `rotate(${(i - 0.5) * 8}deg)`,
                          zIndex: i,
                        }}
                      >
                        {isFaceUp ? (
                          <div
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              onPreviewCard?.(cardToDisplay);
                            }}
                            onTouchEnd={() => onPreviewCard?.(null)}
                            onMouseEnter={() => onPreviewCard?.(cardToDisplay)}
                            onMouseLeave={() => onPreviewCard?.(null)}
                          >
                            <DynamicCard
                              cardType={cardToDisplay}
                              showFace={true}
                              className="hg-mobile-suspect-card"
                            />
                          </div>
                        ) : (
                          /* ONE card language on the table: the suspects' hidden
                             hands are the same DynamicCard back as the CASE FILE
                             deck stack (gold hairline + candle drop), not a raw
                             <img> in a borderless slate box. */
                          <DynamicCard
                            cardType={0 as CardType}
                            showFace={false}
                            ownerFrameClass={frameThemeClass(getPlayerProfile(player.id)?.cosmetics.frameId)}
                            className="hg-mobile-opponent-card"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Card count badge if more than shown */}
                {player.handCount > 2 && (
                  <div className="absolute -top-1 -right-1 bg-[var(--velvet-dark)] text-[var(--parchment)] text-[10px] font-bold px-1 py-0.5 rounded-full border border-[rgba(var(--accent-color-rgb),0.3)]">
                    +{player.handCount - 2}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edge fades — only when the strip actually overflows in that direction */}
      {overflow.left && <div className="hg-suspects-fade hg-suspects-fade--left" aria-hidden="true" />}
      {overflow.right && <div className="hg-suspects-fade hg-suspects-fade--right" aria-hidden="true" />}

      {/* Tappable "more suspects" chevron (never a silent clip) */}
      {overflow.right && (
        <button
          type="button"
          className="hg-suspects-more"
          onClick={scrollForward}
          aria-label={t('mobile.moreSuspects')}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default MobileOpponentStrip;
