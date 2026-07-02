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
}

// Normalize tier values (API returns 'lifetime' but CSS uses 'premium')
const getNormalizedTier = (tier?: string): 'premium' | 'pro' | null => {
  if (!tier || tier === 'free') return null;
  if (tier === 'pro') return 'pro';
  // lifetime and monthly are both "premium" tier
  if (tier === 'lifetime' || tier === 'monthly' || tier === 'premium') return 'premium';
  return null; // unknown tier
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
  onPlayerClick
}) => {
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
            {player.avatarUrl ? (
              <img src={player.avatarUrl} alt={player.name} className="avatar-strip-img" />
            ) : (
              <div className="avatar-strip-placeholder">
                {player.name.charAt(0).toUpperCase()}
              </div>
            )}
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
              {player.avatarUrl && (
                <img src={player.avatarUrl} alt="" className="player-avatar compact" />
              )}
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

          return (
            <li
              key={player.id ?? player.socketId}
              className={`player-list-item ${isMe ? 'is-me' : ''} ${!isConnected ? 'disconnected' : ''} ${newPlayerIds.has(player.socketId) ? 'player-entering' : ''} ${isSpectator && !isMe ? 'spectator-player-clickable' : ''} ${viewingAsSocketId === player.socketId ? 'spectator-player-active' : ''}`}
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
