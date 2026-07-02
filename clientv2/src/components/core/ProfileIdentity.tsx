/**
 * ProfileIdentity — cosmetic-aware avatar + name renderers.
 *
 * Small wrappers around the player avatar / the player-name span that apply
 * the player's equipped platform cosmetics (frame ring, name flair) once their
 * profile arrives via `gb:player:profile`. Safe to use everywhere a player is
 * shown: without a profile they render exactly like the plain markup.
 */

import React from 'react';
import { usePlayerProfile } from '../../services/playerProfiles';
import { cosmeticClass } from '../../utils/cosmetics';
import type { Player } from '../../types';

interface ProfileAvatarProps {
  player: Player;
  className?: string;
  onClick?: () => void;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ player, className = '', onClick }) => {
  const profile = usePlayerProfile(player.id);
  const frameClass = cosmeticClass(profile?.cosmetics.frameId);

  // Same markup as the plain player-list avatar (img or initial placeholder).
  const avatar = player.avatarUrl ? (
    <img src={player.avatarUrl} alt="" className={className} />
  ) : (
    <div className={`${className} placeholder`.trim()}>
      {player.name.charAt(0).toUpperCase()}
    </div>
  );

  if (!frameClass && !onClick) return avatar;

  return (
    <span
      className={`avatar-frame-wrap ${frameClass}`}
      style={{ ['--frame-ring' as string]: '2px', cursor: onClick ? 'pointer' : undefined }}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
    >
      {avatar}
    </span>
  );
};

interface FlairNameProps {
  player: Player;
  className?: string;
  children?: React.ReactNode;
}

export const FlairName: React.FC<FlairNameProps> = ({ player, className = '', children }) => {
  const profile = usePlayerProfile(player.id);
  const flairClass = cosmeticClass(profile?.cosmetics.flairId);

  return (
    <span className={`${className} ${flairClass}`.trim()}>
      {children ?? player.name}
    </span>
  );
};
