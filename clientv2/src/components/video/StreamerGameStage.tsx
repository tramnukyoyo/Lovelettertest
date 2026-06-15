/**
 * Streamer Game Stage — Prime Suspect
 *
 * Phase-aware broadcast content. Prime Suspect uses a simple UPPERCASE state
 * machine (LOBBY / PLAYING / ENDED). Audience-safe info only: round, whose
 * turn, alive suspects + token counts, and the winner. All styling is
 * tokenized (uses the Paper Deduction theme variables via the cloned
 * stylesheets) so it inherits the theme for free.
 */

import React from 'react';
import { Trophy } from 'lucide-react';
import type { Lobby, Player } from '../../types';
import type { BroadcastOverlays } from './StreamerSettingsPanel';
import { getBroadcastCopy } from './broadcastCopy';

interface StreamerGameStageProps {
  lobby: Lobby;
  overlays: BroadcastOverlays;
}

const SuspectRow: React.FC<{ players: Player[]; currentTurn?: string | null }> = ({
  players,
  currentTurn,
}) => (
  <div className="sbx-progress-chips">
    {players.map(p => {
      const id = p.id ?? p.socketId;
      const active = currentTurn && (p.id === currentTurn || p.socketId === currentTurn);
      const elim = p.isEliminated;
      return (
        <span key={id} className={`sbx-chip ${elim ? 'waiting' : 'done'}`}>
          <span className="sbx-chip-state">{elim ? '✕' : active ? '▶' : '♥'}</span>
          {p.name}
          {typeof p.tokens === 'number' && p.tokens > 0 && (
            <span className="sbx-chip-score"> · {p.tokens}</span>
          )}
        </span>
      );
    })}
  </div>
);

const StreamerGameStage: React.FC<StreamerGameStageProps> = ({ lobby }) => {
  const copy = getBroadcastCopy();
  const gameData = lobby.gameData;
  const phase = lobby.state || 'LOBBY';

  const activePlayers = lobby.players.filter(p => p.connected && !p.isSpectator && !p.isBigScreen);
  const alive = activePlayers.filter(p => !p.isEliminated);
  const winnerId = gameData?.winner;
  const winner = winnerId
    ? lobby.players.find(p => p.id === winnerId || p.socketId === winnerId)
    : [...activePlayers].sort((a, b) => (b.tokens ?? 0) - (a.tokens ?? 0))[0];

  return (
    <div className="sbx-stage">
      {phase === 'PLAYING' && (
        <>
          <div className="sbx-status-row">
            {`Round ${gameData?.currentRound ?? 1} · ${alive.length} suspects remain`}
          </div>
          <SuspectRow players={activePlayers} currentTurn={gameData?.currentTurn} />
        </>
      )}

      {phase === 'ENDED' && (
        <div className="sbx-center">
          {winner && (
            <div className="sbx-winner">
              <div className="sbx-winner-label">{copy.content.winnerLabel}</div>
              <div className="sbx-winner-name">{winner.name}</div>
              {typeof winner.tokens === 'number' && (
                <div className="sbx-winner-score">
                  <Trophy className="w-4 h-4" /> {winner.tokens}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {phase === 'LOBBY' && (
        <div className="sbx-center">
          <div className="sbx-status-row">{copy.content.waitingForGameToStart}</div>
        </div>
      )}
    </div>
  );
};

export default StreamerGameStage;
