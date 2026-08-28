/**
 * Player List
 *
 * Displays the list of players in the lobby/game.
 * Supports full list, compact, and avatar strip modes.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Crown, Eye, Wifi, WifiOff, UserMinus, X, Lock } from 'lucide-react';
import { PlayerCard, ProfileAvatar, FlairName } from '../core';
import type { Player, Team } from '../../types';
import { t } from '../../utils/translations';
import { usePlatformCosmetics, requestPlatformCosmetics, equipPlatformCosmetic } from '../../services/platformCosmetics';
import { usePlayerProfile, getPlayerProfile } from '../../services/playerProfiles';
import { FRAME_THEMES, frameThemeClass } from '../../utils/frameThemes';
import { setFrameTryOn, clearFrameTryOn } from '../../services/frameTryOn';
import { useAuthState } from '../../services/supabaseAuth';
import GameAuthModal from '../core/GameAuthModal';

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
  /** Host only: transfer host to this player (server event host:transfer). */
  onMakeHost?: (playerId: string) => void;
  isSpectator?: boolean;
  viewingAsSocketId?: string | null;
  onPlayerClick?: (socketId: string) => void;
  /** Lobby only: show the equip-only avatar-frame picker on the viewer's own card. */
  showCardStylePicker?: boolean;
  /** Opens the identity designer (where locked frames/flairs are bought). */
  onOpenDesigner?: () => void;
}


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
  onMakeHost,
  isSpectator = false,
  viewingAsSocketId,
  onPlayerClick,
  showCardStylePicker = false,
  onOpenDesigner
}) => {
  // Platform avatar frames (one economy for every game): equippable when
  // owned OR Premium (Premium includes everything); premium-exclusive frames
  // need live Premium. The equipped frame also themes the table card backs
  // (DynamicCard fr-theme token rule). The picker here is EQUIP + PREVIEW
  // only — buying lives in the identity designer.
  const me = players.find(p => p.socketId === mySocketId);
  const sessionPremium = !!me?.premiumTier && me.premiumTier !== 'free';
  const shop = usePlatformCosmetics();
  const isPremium = shop.status === 'ready' ? shop.premium : sessionPremium;
  const frameUnlocked = (id: string) => {
    if (!id) return true;
    const item = shop.catalog.frames.find(f => f.id === id);
    if (item?.premiumOnly) return isPremium;
    return isPremium || shop.owned.frame.includes(id);
  };
  // Logged-out guests get a sign-in nudge in the picker: GP purchases need an
  // account (owner request) — same precedence logic as the header.
  const auth = useAuthState();
  const isLoggedIn = auth.signedOutLocally
    ? false
    : auth.status === 'authed'
      ? true
      : me?.isGuest === false;
  const [authOpen, setAuthOpen] = useState(false);

  // Equipped frame source of truth: my platform profile (updates live via the
  // room-wide gb:player:profile rebroadcast after an equip). Optimistic pick
  // for instant feedback; reconciled when the profile echoes the change.
  const myProfile = usePlayerProfile(me?.id);
  const [pendingFrame, setPendingFrame] = useState<string | null>(null);
  const equippedFrame = pendingFrame ?? shop.equipped.frame ?? myProfile?.cosmetics.frameId ?? '';
  const handleEquipFrame = (frameId: string) => {
    setPendingFrame(frameId);
    equipPlatformCosmetic('frame', frameId || null);
  };
  useEffect(() => {
    if (pendingFrame !== null && (myProfile?.cosmetics.frameId ?? '') === pendingFrame) {
      setPendingFrame(null);
    }
  }, [myProfile?.cosmetics.frameId, pendingFrame]);
  // Collapsed by default so the picker stays a thin row in the player list;
  // tap the header to expand the chips + preview.
  const [cardStyleOpen, setCardStyleOpen] = useState(false);
  // Catalog + ownership are needed to know which frames are equippable here.
  useEffect(() => { if (cardStyleOpen) requestPlatformCosmetics(); }, [cardStyleOpen]);
  // Tapping a LOCKED chip previews it locally (own avatar ring) without
  // equipping — buying stays in the designer. Cleared when the picker closes.
  const [tryOnStyle, setTryOnStyle] = useState<string | null>(null);
  const frameOptions: Array<{ id: string; name: string }> = [
    { id: '', name: t('playerList.frameNone') },
    ...shop.catalog.frames.map(f => ({ id: f.id, name: f.name })),
  ];
  // The frame my OWN surfaces should display right now (a locked try-on wins
  // over the equipped one). Broadcast to the crew card + presence dock so the
  // preview paints all three identity surfaces at once (owner rule 2026-07-31).
  const myDisplayFrame = tryOnStyle ?? equippedFrame;
  useEffect(() => {
    if (cardStyleOpen) setFrameTryOn(myDisplayFrame || null);
  }, [cardStyleOpen, myDisplayFrame]);
  useEffect(() => {
    if (!cardStyleOpen) { setTryOnStyle(null); clearFrameTryOn(); }
  }, [cardStyleOpen]);
  useEffect(() => () => clearFrameTryOn(), []);
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

  // Make-host: same two-step inline confirm pattern as kick.
  const [pendingHostId, setPendingHostId] = useState<string | null>(null);
  const handleConfirmMakeHost = (playerId: string) => {
    onMakeHost?.(playerId);
    setPendingHostId(null);
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
            <ProfileAvatar player={player} className="avatar-strip-img" />
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
              <ProfileAvatar player={player} className="player-avatar compact" />
              <span className="player-name">
                <FlairName player={player} className="player-name__text" />
              </span>
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
          // A locked try-on previews the frame on my own avatar without equipping.
          const displayFrame = isMe ? myDisplayFrame : '';
          // Fleet rule 9: the frame accent IS the row's border color — for the
          // equipped frame AND for a live try-on (own row only).
          const rowFrameId = isMe ? (myDisplayFrame || null) : getPlayerProfile(player.id)?.cosmetics.frameId;

          return (
            <li
              key={player.id ?? player.socketId}
              className={`player-list-item ${isMe ? 'is-me' : ''} ${!isConnected ? 'disconnected' : ''} ${newPlayerIds.has(player.socketId) ? 'player-entering' : ''} ${isSpectator && !isMe ? 'spectator-player-clickable' : ''} ${viewingAsSocketId === player.socketId ? 'spectator-player-active' : ''} ${withStylePicker ? 'has-cardstyle-picker' : ''} ${frameThemeClass(rowFrameId)}`}
              onClick={() => isSpectator && !isMe && onPlayerClick?.(player.socketId)}
            >
              {/* Avatar (tap opens the platform profile card, cosmetics-aware) */}
              <div className="player-avatar-container">
                <ProfileAvatar player={player} className="player-avatar" frameOverride={isMe && withStylePicker ? (displayFrame || null) : undefined} onClick={() => setCardPlayer(player)} />
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
                {/* The flair rides its OWN span, never the row: gradient flairs
                    set -webkit-text-fill-color:transparent, which every child
                    inherits — with the tag inside, "(You)" painted transparent
                    over no background and vanished. A flex row also kills
                    text-overflow, so long names were cut mid-glyph. */}
                <span className="player-name">
                  <FlairName player={player} className="player-name__text" />
                  {isMe && <span className="player-me-tag">({t('lobby.you')})</span>}
                </span>
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

              {/* Disconnect removal countdown — intentional returns to
                  GameBuddies show a label instead of a countdown */}
              {!isConnected && (player.leftReason === 'returned_to_platform' ? (
                <span className="player-disconnect-timer">{t('playerList.returnedToLobby')}</span>
              ) : (player.disconnectedAt ? (
                <DisconnectedTimer disconnectedAt={player.disconnectedAt} />
              ) : null))}
              {/* Platform avatar-frame picker — own card, lobby only. One economy
                  for every game: locked frames preview on the avatar; buying
                  lives in the identity designer. The equipped frame also themes
                  your table card backs (fr-theme token rule on DynamicCard). */}
              {withStylePicker && (
                <div className={`lr-cardstyle-picker ${cardStyleOpen ? 'is-open' : ''}`}>
                  {/* Thin header row — collapsed by default, tap to expand. */}
                  <button
                    type="button"
                    className="lr-cardstyle-toggle"
                    aria-expanded={cardStyleOpen}
                    onClick={(e) => { e.stopPropagation(); setCardStyleOpen(o => !o); }}
                  >
                    <span className="lr-cardstyle-label">{t('playerList.frameLabel')}</span>
                    <span className="lr-cardstyle-current">
                      <span
                        className="lr-cardstyle-swatch"
                        style={equippedFrame && FRAME_THEMES[equippedFrame] ? { background: FRAME_THEMES[equippedFrame].accent } : undefined}
                      />
                      {frameOptions.find(o => o.id === equippedFrame)?.name ?? t('playerList.frameNone')}
                    </span>
                    <span className="lr-cardstyle-chevron">{cardStyleOpen ? '▾' : '▸'}</span>
                  </button>
                  {cardStyleOpen && (
                    <>
                      {shop.status === 'loading' || (shop.status === 'ready' && frameOptions.length === 1) ? (
                        <span className="lr-cardstyle-designer-hint">…</span>
                      ) : null}
                      <div className="lr-cardstyle-chips">
                        {frameOptions.map((opt) => {
                          const locked = !!opt.id && !frameUnlocked(opt.id);
                          const active = (tryOnStyle ?? equippedFrame) === opt.id;
                          const isEquipped = tryOnStyle === null && equippedFrame === opt.id;
                          const theme = opt.id ? FRAME_THEMES[opt.id] : undefined;
                          return (
                            <button
                              key={opt.id || 'none'}
                              type="button"
                              className={`lr-cardstyle-chip ${active ? 'selected' : ''} ${locked ? 'locked' : ''}`}
                              style={theme ? { borderColor: theme.accent, boxShadow: `inset 0 0 6px ${theme.glow}` } : undefined}
                              title={opt.name}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (locked) { setTryOnStyle(opt.id); return; }
                                setTryOnStyle(null);
                                handleEquipFrame(opt.id);
                              }}
                            >
                              {locked ? <><Lock size={9} style={{ verticalAlign: -1, marginRight: 3 }} aria-hidden="true" />{opt.name}</> : isEquipped ? `✓ ${opt.name}` : opt.name}
                            </button>
                          );
                        })}
                      </div>
                      {/* Locked try-on: guests are nudged to sign in (GP buys need
                          an account); logged-in players are pointed to the designer. */}
                      {tryOnStyle !== null && (
                        !isLoggedIn ? (
                          <button
                            type="button"
                            className="lr-cardstyle-designer-hint lr-cardstyle-designer-link"
                            onClick={(e) => { e.stopPropagation(); setAuthOpen(true); }}
                          >
                            {t('playerList.signInToBuyStyles')}
                          </button>
                        ) : onOpenDesigner ? (
                          <button
                            type="button"
                            className="lr-cardstyle-designer-hint lr-cardstyle-designer-link"
                            onClick={(e) => { e.stopPropagation(); onOpenDesigner(); }}
                          >
                            {t('playerList.previewUnlockHint')}
                          </button>
                        ) : (
                          <span className="lr-cardstyle-designer-hint">{t('playerList.buyStyleInDesigner')}</span>
                        )
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Make-Host Button (host only, not self, connected non-host,
                  not spectators — the server rejects those targets anyway).
                  Reuses the kick button/confirm styles so no CSS changes are
                  needed; the crown icon distinguishes it. */}
              {isHost && !isMe && isConnected && !player.isHost && !player.isSpectator && onMakeHost && (
                pendingHostId === player.id ? (
                  <div className="kick-confirm-buttons">
                    <button
                      className="kick-confirm-btn confirm"
                      onClick={() => handleConfirmMakeHost(player.id!)}
                      title={t('playerList.confirmMakeHost')}
                      type="button"
                    >
                      <Crown className="w-3 h-3" />
                    </button>
                    <button
                      className="kick-confirm-btn cancel"
                      onClick={() => setPendingHostId(null)}
                      title={t('playerList.cancel')}
                      type="button"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    className="kick-button make-host-button"
                    onClick={() => setPendingHostId(player.id!)}
                    title={t('playerList.makeHost')}
                    type="button"
                  >
                    <Crown className="w-4 h-4" />
                  </button>
                )
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

      {/* In-place login/signup so guests can buy styles with GP (owner). */}
      {authOpen && (
        <GameAuthModal onClose={() => setAuthOpen(false)} playerName={me?.name} />
      )}
    </div>
  );
};

// memo: lobby.players keeps reference identity across unrelated state updates
// (structural sharing in App.tsx), so this skips re-rendering on timer ticks etc.
export default React.memo(PlayerList);
