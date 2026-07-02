/**
 * PresenceDock — ambient player presence, visible in EVERY phase.
 * Avatar · name · score · live status (✓ done / … waiting). The game maps
 * its phase to a per-player status; the dock itself is game-agnostic.
 */
import React from 'react';
import { Avatar } from '../components/core/Avatar';

export interface DockPlayer {
  id: string;
  name: string;
  avatarUrl?: string;
  score?: number;
  isHost?: boolean;
  isMe?: boolean;
  connected?: boolean;
  /** 'done' = ✓, 'waiting' = animated …, undefined = no status shown */
  status?: 'done' | 'waiting';
}

const PresenceDock: React.FC<{ players: DockPlayer[] }> = ({ players }) => (
  <>
    {players.map(p => (
      <span
        key={p.id}
        className={`gs-chip ${p.isMe ? 'is-me' : ''} ${p.connected === false ? 'is-disconnected' : ''}`}
        title={p.name}
      >
        <span className="gs-chip-av">
          <Avatar src={p.avatarUrl} />
        </span>
        <span className="gs-chip-name">{p.name}</span>
        {p.isHost && <span className="gs-chip-host">👑</span>}
        {typeof p.score === 'number' && <span className="gs-chip-score">{p.score}</span>}
        {p.status && (
          <span className={`gs-chip-status ${p.status}`}>
            {p.status === 'done' ? '✓' : '…'}
          </span>
        )}
      </span>
    ))}
  </>
);

export default PresenceDock;
