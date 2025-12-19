import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Crown, Skull } from 'lucide-react';
import type { CardType, Player } from '../../types';
import DynamicCard from './DynamicCard';
import { CARD_BACK_IMAGE } from './cardDatabase';

const FALLBACK_AVATAR_URL = 'https://dwrhhrhtsklskquipcci.supabase.co/storage/v1/object/public/game-thumbnails/Gabu.webp';

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
  if (players.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-[var(--parchment-dark)] italic text-sm">
        Waiting for opponents...
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden">
      {/* Scroll container with snap */}
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 px-4 py-2 scrollbar-hide">
        {players.map((player) => {
          const isCurrentTurn = currentTurnId === player.id;
          const isTargeted = targetId === player.id;
          const isEliminated = player.isEliminated;
          const isImmune = player.isImmune;
          // Inspector (card 1) can target immune players
          const canTarget = !isEliminated && (!isImmune || selectedCard === 1);

          return (
            <motion.div
              key={player.id}
              className={`
                snap-center flex-shrink-0 flex flex-col items-center p-2 rounded-xl transition-all
                min-w-[100px] max-w-[120px]
                ${isEliminated ? 'opacity-50 grayscale' : ''}
                ${!canTarget && !isEliminated ? 'opacity-70' : ''}
                ${isTargeted ? 'bg-[rgba(var(--accent-color-rgb),0.2)] ring-2 ring-[var(--royal-gold)] scale-105' : ''}
                ${isCurrentTurn ? 'ring-2 ring-[var(--royal-crimson)] bg-[rgba(var(--primary-rgb),0.10)]' : ''}
                ${isImmune && selectedCard === 1 ? 'ring-1 ring-yellow-500/50' : ''}
                ${canTarget ? 'cursor-pointer active:scale-95' : 'cursor-not-allowed'}
              `}
              onClick={() => {
                if (canTarget && player.id) {
                  onSelectTarget(player.id);
                }
              }}
              whileTap={canTarget ? { scale: 0.95 } : undefined}
            >
              {/* Avatar with status indicators */}
              <div className="relative mb-2">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--royal-gold)] to-[var(--royal-crimson)] p-0.5 overflow-hidden">
                  <div className="w-full h-full rounded-full bg-[var(--velvet-dark)] overflow-hidden">
                    <img
                      src={player.avatarUrl || FALLBACK_AVATAR_URL}
                      alt={`${player.name} avatar`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        if (e.currentTarget.src !== FALLBACK_AVATAR_URL) {
                          e.currentTarget.src = FALLBACK_AVATAR_URL;
                        }
                      }}
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
                    <Skull className="w-6 h-6 text-red-500" />
                  </div>
                )}
              </div>

              {/* Player name */}
              <div className="flex items-center gap-1 max-w-full">
                <span className="text-xs font-bold text-[var(--parchment)] truncate">{player.name}</span>
                {player.isHost && <Crown className="w-3 h-3 text-[var(--royal-gold)] flex-shrink-0" />}
              </div>

              {/* Tokens */}
              <div className="text-xs text-[var(--parchment-dark)] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--royal-crimson)]" />
                {player.tokens} Tokens
              </div>

              {/* Card count / preview */}
              <div
                className="mt-2 relative"
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
                        className="transition-all"
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
                              className="hg-mobile-hand-card"
                            />
                          </div>
                        ) : (
                          <div className="hg-mobile-opponent-card rounded-lg overflow-hidden shadow-lg">
                            <img
                              src={CARD_BACK_IMAGE}
                              alt="Hidden card"
                              className="w-full h-full object-cover"
                            />
                          </div>
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
            </motion.div>
          );
        })}
      </div>

      {/* Fade edges to indicate scrollability */}
      {players.length > 3 && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[var(--velvet-dark)] to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--velvet-dark)] to-transparent pointer-events-none" />
        </>
      )}
    </div>
  );
};

export default MobileOpponentStrip;
