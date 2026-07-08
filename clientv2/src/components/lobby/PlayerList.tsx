/**
 * Player List
 *
 * Displays the list of players in the lobby/game.
 * Supports full list, compact, and avatar strip modes.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Crown, Eye, Wifi, WifiOff, UserMinus, X } from 'lucide-react';
import { PlayerCard, ProfileAvatar, FlairName } from '../core';
import type { Player, Team } from '../../types';
import { t } from '../../utils/translations';
import socketService from '../../services/socketService';
import { Avatar } from '../core/Avatar';

interface PlayerListProps {
  players: Player[];
  mySocketId: string;
  showStatus?: boolean;
  compact?: boolean;
  avatarStrip?: boolean;
  className?: string;
  teams?: Team[];
  isHost?: boolean;
  onKickPlayer?: (playerId: string) => void;
  isSpectator?: boolean;
  viewingAsSocketId?: string | null;
  onPlayerClick?: (socketId: string) => void;
  /** Lobby only: show the premium card-style picker on the viewer's own card. */
  showCardStylePicker?: boolean;
}

/** Premium card styles (ids validated server-side, see cardstyles.css). */
const CARD_STYLE_OPTIONS: Array<{ id: string; label: string }> = [
  { id: '', label: 'None' },
  { id: 'neon', label: 'Neon' },
  { id: 'gold', label: 'Gold' },
  { id: 'holo', label: 'Holo' },
  { id: 'ink', label: 'Ink' },
];

// Normalize tier values (API returns 'lifetime' but CSS uses 'premium')
const getNormalizedTier = (tier?: string): 'premium' | 'pro' | null => {
  if (!tier || tier === 'free') return null;
  if (tier === 'pro') return 'pro';
  // lifetime and monthly are both "premium" tier
  if (tier === 'lifetime' || tier === 'monthly' || tier === 'premium') return 'premium';
  return null; // unknown tier
};

// Countdown until a disconnected player is removed (30s server grace period)
const DisconnectedTimer = ({ disconnectedAt }: { disconnectedAt: number }) => {
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    const update = () => setTimeLeft(Math.max(0, 30 - Math.floor((Date.now() - disconnectedAt) / 1000)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [disconnectedAt]);

  if (timeLeft <= 0) return <span className="player-disconnect-timer">{t('playerList.removing')}</span>;
  return <span className="player-disconnect-timer">{t('playerList.removingIn', { seconds: timeLeft })}</span>;
};

const PlayerList: React.FC<PlayerListProps> = ({
  players,
  mySocketId,
  showStatus = true,
  compact = false,
  avatarStrip = false,
  className = '',
  teams = [],
  isHost = false,
  onKickPlayer,
  isSpectator = false,
  viewingAsSocketId,
  onPlayerClick,
  showCardStylePicker = false
}) => {
  // Premium detection for the card-style picker (LetterRush pattern).
  const me = players.find(p => p.socketId === mySocketId);
  const isPremium = !!me?.premiumTier && me.premiumTier !== 'free';

  // Optimistic card-style selection: reflect the click instantly, then let the
  // server broadcast (source of truth) reconcile it. Without this the only
  // feedback was a faint chip border ~200ms after the round-trip.
  const [pendingCardStyle, setPendingCardStyle] = useState<string | null>(null);
  const handleSetCardStyle = (style: string) => {
    setPendingCardStyle(style);
    socketService.getSocket()?.emit('player:set-card-style', { style });
  };
  useEffect(() => {
    if (pendingCardStyle !== null && (me?.cardStyle ?? '') === pendingCardStyle) {
      setPendingCardStyle(null);
    }
  }, [me?.cardStyle, pendingCardStyle]);
  // Collapsed by default so the picker stays a thin row in the player list;
  // tap the header to expand the chips + preview.
  const [cardStyleOpen, setCardStyleOpen] = useState(false);
  // Game is active if any player has any Bluffalo game fields set (score exists)
  const gameActive = players.some(p => 'score' in p && typeof (p as any).score === 'number' && (((p as any).hasSubmittedLie || (p as any).hasVoted || (p as any).score > 0)));
  // State for inline kick confirmation
  const [pendingKickId, setPendingKickId] = useState<string | null>(null);
  // Player whose platform profile card is open (tap on avatar)
  const [cardPlayer, setCardPlayer] = useState<Player | null>(null);

  // Track previous player IDs for join animations
  const prevPlayerIdsRef = useRef<Set<string>>(new Set());
  const [newPlayerIds, setNewPlayerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(players.map(p => p.socketId));
    const prevIds = prevPlayerIdsRef.current;

    // Find newly joined players
    const newJoins = new Set<string>();
    currentIds.forEach(id => {
      if (!prevIds.has(id)) {
        newJoins.add(id);
      }
    });

    if (newJoins.size > 0) {
      setNewPlayerIds(newJoins);
      // Remove animation class after 600ms
      const timer = setTimeout(() => setNewPlayerIds(new Set()), 600);
      prevPlayerIdsRef.current = currentIds;
      return () => clearTimeout(timer);
    }

    prevPlayerIdsRef.current = currentIds;
  }, [players]);

  // Handle kick confirmation
  const handleKickClick = (playerId: string) => {
    setPendingKickId(playerId);
  };

  const handleConfirmKick = (playerId: string) => {
    if (onKickPlayer) {
      onKickPlayer(playerId);
    } else {
    }
    setPendingKickId(null);
  };

  const handleCancelKick = () => {
    setPendingKickId(null);
  };

  // Helper to find a player's team
  const getPlayerTeam = (playerId: string): Team | undefined => {
    return teams.find(t => t.playerIds.includes(playerId));
  };

  // Sort: Host first, then by name
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.isHost && !b.isHost) return -1;
    if (!a.isHost && b.isHost) return 1;
    return a.name.localeCompare(b.name);
  });

  const connectedPlayers = sortedPlayers.filter(p => p.connected);

  // Avatar Strip Mode - overlapping circles for mobile compact view
  if (avatarStrip && compact) {
    const displayPlayers = connectedPlayers.slice(0, 8);
    const extraCount = connectedPlayers.length - 8;

    return (
      <div className={`avatar-strip ${className}`}>
        {displayPlayers.map((player, index) => (
          <div
            key={player.id ?? player.socketId}
            className={`avatar-strip-item ${newPlayerIds.has(player.socketId) ? 'player-entering' : ''}`}
            style={{ zIndex: displayPlayers.length - index }}
            title={player.name}
          >
            <Avatar src={player.avatarUrl} alt={player.name} className="avatar-strip-img" />
            {player.isHost && <Crown className="avatar-strip-crown" />}
          </div>
        ))}
        {extraCount > 0 && (
          <div className="avatar-strip-more">
            +{extraCount}
          </div>
        )}
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`player-list compact ${className}`}>
        {sortedPlayers.map((player) => {
          const playerTeam = getPlayerTeam(player.socketId);
          return (
            <div
              key={player.id ?? player.socketId}
              className={`player-list-item compact ${player.socketId === mySocketId ? 'is-me' : ''} ${!player.connected ? 'disconnected' : ''} ${newPlayerIds.has(player.socketId) ? 'player-entering' : ''}`}
            >
              <Avatar src={player.avatarUrl} className="player-avatar compact" />
              <span className="player-name">{player.name}</span>
              {player.isHost && <Crown className="w-3 h-3 host-icon" />}
              {playerTeam && (
                <span
                  className="player-team-badge compact"
                  style={{ backgroundColor: playerTeam.color }}
                >
                  {playerTeam.name.replace('Team ', '')}
                </span>
              )}
              {(() => {
                const tier = getNormalizedTier(player.premiumTier);
                return tier && (
                  <span className={`player-premium-badge compact ${tier}`}>
                    {tier === 'pro' ? 'Pro' : 'Premium'}
                  </span>
                );
              })()}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`player-list ${className}`}>
      <div className="player-list-header">
        <h3 className="player-list-title">{t('lobby.players')}</h3>
        <span className="player-list-count">
          {players.filter(p => p.connected).length}
        </span>
      </div>

      <ul className="player-list-items">
        {sortedPlayers.map((player) => {
          const isMe = player.socketId === mySocketId;
          const isConnected = player.connected;
          const playerTeam = getPlayerTeam(player.socketId);
          const withStylePicker = showCardStylePicker && isMe && !player.isSpectator;
          // Optimistic pending style applies to my own card only — other players
          // always reflect their own equipped style from the broadcast.
          const equippedCardStyle = (isMe ? pendingCardStyle : null) ?? (player.cardStyle ?? '');

          return (
            <li
              key={player.id ?? player.socketId}
              className={`player-list-item ${isMe ? 'is-me' : ''} ${!isConnected ? 'disconnected' : ''} ${newPlayerIds.has(player.socketId) ? 'player-entering' : ''} ${isSpectator && !isMe ? 'spectator-player-clickable' : ''} ${viewingAsSocketId === player.socketId ? 'spectator-player-active' : ''} ${withStylePicker ? 'has-cardstyle-picker' : ''} ${equippedCardStyle ? `lr-cardstyle-${equippedCardStyle}` : ''}`}
              onClick={() => isSpectator && !isMe && onPlayerClick?.(player.socketId)}
            >
              {/* Avatar (tap opens the platform profile card, cosmetics-aware) */}
              <div className="player-avatar-container">
                <ProfileAvatar player={player} className="player-avatar" onClick={() => setCardPlayer(player)} />
                {showStatus && (
                  <span className={`player-status ${isConnected ? 'online' : 'offline'}`}>
                    {isConnected ? (
                      <Wifi className="w-3 h-3" />
                    ) : (
                      <WifiOff className="w-3 h-3" />
                    )}
                  </span>
                )}
              </div>

              {/* Player Info */}
              <div className="player-info">
                <FlairName player={player} className="player-name">
                  {player.name}
                  {isMe && <span className="player-me-tag">({t('lobby.you')})</span>}
                </FlairName>
                {/* Show score during game (always, including 0) */}
                {gameActive && 'score' in player && typeof (player as any).score === 'number' && (
                  <span className="player-score-badge">{(player as any).score} {t('bluffalo.pts') || 'pts'}</span>
                )}
                {player.isHost && (
                  <span className="player-host-badge">
                    <Crown className="w-3 h-3" />
                    {t('lobby.host')}
                  </span>
                )}
                {player.isSpectator && (
                  <span className="player-spectator-badge">
                    <Eye className="w-3 h-3" />
                    {t('spectator.badge')}
                  </span>
                )}
                {playerTeam && (
                  <span
                    className="player-team-badge"
                    style={{ backgroundColor: playerTeam.color }}
                  >
                    {playerTeam.name.replace('Team ', '')}
                  </span>
                )}
                {(() => {
                  const tier = getNormalizedTier(player.premiumTier);
                  return tier && (
                    <span className={`player-premium-badge ${tier}`}>
                      {tier === 'pro' ? t('playerList.pro') : t('playerList.premium')}
                    </span>
                  );
                })()}
              </div>

              {/* Disconnect removal countdown */}
              {!isConnected && player.disconnectedAt && (
                <DisconnectedTimer disconnectedAt={player.disconnectedAt} />
              )}

              {/* Premium card-style picker — own card, lobby only. Premium players
                  pick a card style; free players see the options locked
                  (shown-but-locked upsell, mirrors the LetterRush package). */}
              {withStylePicker && (
                <div className={`lr-cardstyle-picker ${cardStyleOpen ? 'is-open' : ''}`}>
                  {/* Thin header row — collapsed by default, tap to expand. */}
                  <button
                    type="button"
                    className="lr-cardstyle-toggle"
                    aria-expanded={cardStyleOpen}
                    onClick={(e) => { e.stopPropagation(); setCardStyleOpen(o => !o); }}
                  >
                    <span className="lr-cardstyle-label">
                      Card style
                      {!isPremium && <span className="lr-cardstyle-hint"> · Premium</span>}
                    </span>
                    <span className="lr-cardstyle-current">
                      <span className={`lr-cardstyle-swatch ${equippedCardStyle ? `lr-cardstyle-${equippedCardStyle}` : ''}`} />
                      {CARD_STYLE_OPTIONS.find(o => o.id === equippedCardStyle)?.label ?? 'None'}
                    </span>
                    <span className="lr-cardstyle-chevron">{cardStyleOpen ? '▾' : '▸'}</span>
                  </button>
                  {cardStyleOpen && (
                    <>
                      <div className="lr-cardstyle-chips">
                        {CARD_STYLE_OPTIONS.map((opt) => {
                          const locked = !isPremium && opt.id !== '';
                          const selected = equippedCardStyle === opt.id;
                          return (
                            <button
                              key={opt.id || 'none'}
                              type="button"
                              className={`lr-cardstyle-chip ${opt.id ? `lr-cardstyle-${opt.id}` : ''} ${selected ? 'selected' : ''} ${locked ? 'locked' : ''}`}
                              title={locked ? 'Premium card style — unlock with GameBuddies Premium' : opt.label}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!locked) handleSetCardStyle(opt.id);
                              }}
                            >
                              {locked ? `🔒 ${opt.label}` : selected ? `✓ ${opt.label}` : opt.label}
                            </button>
                          );
                        })}
                      </div>
                      {/* Live preview: the equipped style frames your roster card and
                          dock chip — mirror it here so picking clearly does something. */}
                      <div className="lr-cardstyle-preview-row">
                        <span className="lr-cardstyle-preview-caption">Your player card</span>
                        <div className={`lr-cardstyle-preview ${equippedCardStyle ? `lr-cardstyle-${equippedCardStyle}` : ''}`}>
                          {player.name}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Kick Button (host only, not self, connected players) */}
              {isHost && !isMe && isConnected && onKickPlayer && (
                pendingKickId === player.id ? (
                  <div className="kick-confirm-buttons">
                    <button
                      className="kick-confirm-btn confirm"
                      onClick={() => handleConfirmKick(player.id!)}
                      title={t('playerList.confirmKick')}
                      type="button"
                    >
                      {t('playerList.kick')}
                    </button>
                    <button
                      className="kick-confirm-btn cancel"
                      onClick={handleCancelKick}
                      title={t('playerList.cancel')}
                      type="button"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    className="kick-button"
                    onClick={() => handleKickClick(player.id!)}
                    title={t('playerList.kickPlayer')}
                    type="button"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                )
              )}
            </li>
          );
        })}
      </ul>

      {cardPlayer && (
        <PlayerCard player={cardPlayer} onClose={() => setCardPlayer(null)} />
      )}
    </div>
  );
};

// memo: lobby.players keeps reference identity across unrelated state updates
// (structural sharing in App.tsx), so this skips re-rendering on timer ticks etc.
export default React.memo(PlayerList);
