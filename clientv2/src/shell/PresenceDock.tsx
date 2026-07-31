/**
 * PresenceDock — ambient player presence, visible in EVERY phase.
 * Avatar · name · score · live status (✓ done / … waiting). The game maps
 * its phase to a per-player status; the dock itself is game-agnostic.
 * Chips are platform-cosmetics-aware: the equipped avatar frame rings the
 * chip avatar and the name flair colors the chip name (gb:player:profile).
 */
import React from 'react';
import { Avatar } from '../components/core/Avatar';
import { usePlayerProfile } from '../services/playerProfiles';
import { cosmeticClass } from '../utils/cosmetics';

export interface DockPlayer {
  id: string;
  name: string;
  avatarUrl?: string;
  score?: number;
  isHost?: boolean;
  isMe?: boolean;
  connected?: boolean;
  /** Equipped premium card style (neon/gold/holo/ink) — frames the chip. */
  cardStyle?: string;
  /** 'done' = ✓, 'waiting' = animated …, undefined = no status shown */
  status?: 'done' | 'waiting';
}

const DockChip: React.FC<{ p: DockPlayer }> = ({ p }) => {
  const profile = usePlayerProfile(p.id);
  const frameClass = cosmeticClass(profile?.cosmetics.frameId);
  const flairClass = cosmeticClass(profile?.cosmetics.flairId);
  return (
    <span
      className={`gs-chip ${p.isMe ? 'is-me' : ''} ${p.connected === false ? 'is-disconnected' : ''} ${p.cardStyle ? `lr-cardstyle-${p.cardStyle}` : ''}`.trim()}
      title={p.name}
    >
      <span className={`gs-chip-av ${frameClass ? `avatar-frame-wrap ${frameClass}` : ''}`.trim()}>
        <Avatar src={p.avatarUrl} />
      </span>
      <span className={`gs-chip-name ${flairClass}`.trim()}>{p.name}</span>
      {p.isHost && <span className="gs-chip-host">👑</span>}
      {typeof p.score === 'number' && <span className="gs-chip-score">{p.score}</span>}
      {p.status && (
        <span className={`gs-chip-status ${p.status}`}>
          {p.status === 'done' ? '✓' : '…'}
        </span>
      )}
    </span>
  );
};

const PresenceDock: React.FC<{ players: DockPlayer[] }> = ({ players }) => (
  <>
    {players.map(p => (
      <DockChip key={p.id} p={p} />
    ))}
  </>
);

export default PresenceDock;
