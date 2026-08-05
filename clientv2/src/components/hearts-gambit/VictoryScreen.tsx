import React, { useEffect, useRef, useState } from 'react';
import type { Lobby } from '../../types';
import type { Socket } from 'socket.io-client';
import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import { Confetti, ScoreCountUp } from '../juice';
import { FlairName } from '../core/ProfileIdentity';
import { usePlayerProfile } from '../../services/playerProfiles';
import { cosmeticClass } from '../../utils/cosmetics';
import { soundEffects } from '../../utils/soundEffects';
import { getTranslation, getCurrentLanguage } from '../../utils/gameTranslations';
import { Portal } from '../../utils/portal';
import { usePostgame, resetPostgame } from '../../services/postgame';
import { trackGameFinishedNow } from '../../services/analyticsService';
import { GameAdRectangle } from '../ads';
import PostGameShareCta from '../ui/PostGameShareCta';

/** Flair for reward/unlock rows, which only carry a platform playerId + name
 *  string (gb:postgame:summary) — same rendering as FlairName, keyed by id. */
const FlairNameById: React.FC<{ playerId?: string; name: string; className?: string }> = ({ playerId, name, className = '' }) => {
  const profile = usePlayerProfile(playerId);
  const flairClass = cosmeticClass(profile?.cosmetics.flairId);
  return <span className={`${className} ${flairClass}`.trim()}>{name}</span>;
};

/**
 * Shared platform rewards strip on the results screen: per-player +XP/+GP,
 * level-up badges, achievement unlocks, and the crew-streak banner. Data
 * arrives via gb:postgame:summary / gb:postgame:crewstreak (see App.tsx).
 */
const PostGameRewards: React.FC = () => {
  const { rewards, crewStreak, unlocks } = usePostgame();
  if (rewards.length === 0 && !crewStreak && unlocks.length === 0) return null;

  return (
    <div className="my-3 text-sm">
      {crewStreak && (
        <div className="font-bold text-[var(--royal-gold-light)] mb-1.5">
          🔥 {crewStreak.gamesTonight > 1 ? `Game ${crewStreak.gamesTonight} tonight!` : 'First game tonight!'}
          {crewStreak.weekStreak > 1 ? ` · Crew streak: ${crewStreak.weekStreak} weeks` : ''}
        </div>
      )}
      {unlocks.length > 0 && (
        <div className="flex flex-col gap-0.5 mb-1.5">
          {unlocks.slice(0, 4).map((u) => (
            <div
              key={`${u.playerId}:${u.achievement.id}`}
              title={u.achievement.description}
              className="font-bold text-[var(--royal-gold-light)]"
            >
              🏅 <FlairNameById playerId={u.playerId} name={u.playerName} /> unlocked “{u.achievement.name}”!
            </div>
          ))}
        </div>
      )}
      {rewards.length > 0 && (
        <div className="flex flex-col gap-0.5 max-h-28 overflow-y-auto">
          {rewards.map((r) => (
            <div key={r.playerId} className="flex items-center justify-center gap-2 text-[var(--parchment)]">
              <FlairNameById playerId={r.playerId} name={r.playerName} className="truncate max-w-[120px]" />
              <span className="text-[#4ea7ea] font-semibold whitespace-nowrap">+{r.totalXp} XP</span>
              {r.gabuPoints > 0 && <span className="text-[var(--royal-gold)] font-semibold whitespace-nowrap">+{r.gabuPoints} GP</span>}
              {r.leveledUp && r.newLevel != null && <span className="text-[#7cffb2] font-semibold whitespace-nowrap">⬆ Lv {r.newLevel}</span>}
              {r.achievements.map((a) => (
                <span key={a.id} title={a.name}>🏅</span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Rematch vote controls: every player can vote (gb:postgame:rematch-vote); a
 * majority triggers gb:postgame:rematch-go, on which the HOST fires the game's
 * own `game:start` restart flow. The store resets when the victory screen
 * leaves (component unmount).
 */
const RematchControls: React.FC<{ socket: Socket; isHost: boolean }> = ({ socket, isHost }) => {
  const { rematch, rematchGo } = usePostgame();
  const [voted, setVoted] = useState(false);
  const firedRef = useRef(false);

  // Host: majority reached → fire the existing restart flow exactly once.
  useEffect(() => {
    if (rematchGo && isHost && !firedRef.current) {
      firedRef.current = true;
      if (socket.connected) socket.emit('game:start', {});
    }
  }, [rematchGo, isHost, socket]);

  // Leaving the results screen (rematch started / back to lobby): clear state.
  useEffect(() => () => { resetPostgame(); }, []);

  const handleVote = () => {
    setVoted((v) => !v);
    if (socket.connected) socket.emit('gb:postgame:rematch-vote');
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-1">
      <button
        onClick={handleVote}
        className="ps-victory-btn--primary w-full px-6 py-3 text-sm sm:text-base min-h-[48px]"
        type="button"
      >
        {voted ? 'Voted ✓' : 'Rematch!'}
      </button>
      {rematch && rematch.votes > 0 && (
        <div className="text-sm font-bold text-[var(--parchment)]">
          {rematch.votes}/{rematch.needed} want a rematch
        </div>
      )}
      {!isHost && !rematch?.votes && (
        <div className="text-xs text-[var(--parchment-dark)] opacity-70">Majority vote starts the rematch</div>
      )}
    </div>
  );
};

interface VictoryScreenProps {
  lobby: Lobby;
  socket: Socket;
  viewMode?: 'player' | 'broadcast';
}

function getTokensToWin(playerCount: number): number {
  if (playerCount === 2) return 7;
  if (playerCount === 3) return 5;
  return 4;
}

export const VictoryScreen: React.FC<VictoryScreenProps> = ({
  lobby,
  socket,
  viewMode = 'player',
}) => {
  const lang = getCurrentLanguage();
  const t = (key: Parameters<typeof getTranslation>[0]) => getTranslation(key, lang);
  const me = lobby.players.find(p => p.socketId === lobby.mySocketId);
  const isHost = me?.isHost || false;
  const isGameWin = !!lobby.gameData?.winner;
  const isBroadcastMirror = viewMode === 'broadcast';
  const winnerId = lobby.gameData?.winner || lobby.gameData?.roundWinner;
  const winnerPlayer = lobby.players.find(p => p.id === winnerId);
  const tokensToWin = getTokensToWin(lobby.players.length);
  const lastMessage = lobby.messages?.[lobby.messages.length - 1]?.message;

  const handleTryAnotherGame = () => {
    if (!socket.connected) return;
    socket.emit('gamebuddies:return', {
      roomCode: lobby.code,
      playerId: me?.id,
      mode: isHost ? 'group' : 'individual',
      reason: 'try_another_game'
    });
  };

  // Sort players by tokens descending
  const sortedPlayers = [...lobby.players].sort((a, b) => b.tokens - a.tokens);

  // Play win sound on game victory
  useEffect(() => {
    if (isGameWin && !isBroadcastMirror) {
      soundEffects.play('win');
    }
  }, [isBroadcastMirror, isGameWin]);

  // Explicit game_finished: Prime Suspect returns to lobby with no terminal
  // room-state phase (LOBBY/PLAYING only), so the phase tracker never fires it
  // and the game showed 0 finishes despite 16 starts (audit 2026-07-22). Fire
  // from the real player client on the actual game win; trackGameFinishedNow is
  // internally double-fire-guarded.
  useEffect(() => {
    if (isGameWin && !isBroadcastMirror) {
      trackGameFinishedNow(1, { room_code: lobby.code });
    }
  }, [isGameWin, isBroadcastMirror, lobby.code]);

  // ── Round-Over Mode (no game winner yet) ──
  if (!isGameWin) {
    return (
      <Portal>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="hg-panel hg-candlelight border border-[rgba(var(--accent-color-rgb),0.35)] p-6 sm:p-10 rounded-2xl max-w-md w-full text-center shadow-[0_0_50px_rgba(var(--accent-color-rgb),0.25)]">
          <h2 className="text-2xl sm:text-4xl font-black mb-3 sm:mb-4 text-[var(--royal-gold-light)] uppercase tracking-widest drop-shadow-md">
            {t('victory.roundOver')}
          </h2>

          <div className="my-4 sm:my-6">
            <div className="text-[var(--parchment-dark)] mb-1 uppercase text-xs tracking-widest">{t('game.winner')}</div>
            <div className="text-xl sm:text-3xl font-bold text-white">
              {winnerPlayer && <FlairName player={winnerPlayer} />}
            </div>
            {lastMessage && (
              <div className="text-sm text-[var(--parchment)] opacity-80 mt-2 italic leading-relaxed px-4">
                {lastMessage}
              </div>
            )}
          </div>

          {/* Token Progress */}
          <div className="my-4 sm:my-6 space-y-2">
            <div className="text-[var(--parchment-dark)] uppercase text-xs tracking-widest mb-2">{t('victory.caseProgress')}</div>
            {sortedPlayers.map(p => (
              <div
                key={p.id}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-sm ${
                  p.id === winnerId ? 'bg-[rgba(var(--accent-color-rgb),0.15)] text-[var(--royal-gold-light)] font-bold' : 'text-[var(--parchment-dark)]'
                }`}
              >
                <FlairName player={p} className="truncate mr-2" />
                <span className="font-mono whitespace-nowrap">{p.tokens} / {tokensToWin}</span>
              </div>
            ))}
          </div>

          <div className="text-sm text-[var(--parchment-dark)] opacity-70 italic">
            {t('victory.nextRoundIn')}
          </div>
        </div>
      </div>
      </Portal>
    );
  }

  // ── Game Victory Mode ──
  return (
    <Portal>
      {/* Noir/gold palette carried over from the retired animations/Confetti. */}
      <Confetti colors={['#d2b25a', '#e7cc7a', '#8a2233', '#f6f0e6', '#a77e22']} />
      <motion.div
        className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="hg-panel hg-candlelight border border-[rgba(var(--accent-color-rgb),0.35)] p-6 sm:p-10 rounded-2xl max-w-md w-full text-center shadow-[0_0_60px_rgba(var(--accent-color-rgb),0.3)]"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
        >
          {/* Title */}
          <motion.h2
            className="text-2xl sm:text-4xl font-black mb-2 text-[var(--royal-gold-light)] uppercase tracking-widest"
            style={{ textShadow: '0 0 20px rgba(210,178,90,0.5), 0 0 40px rgba(210,178,90,0.2)' }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          >
            {t('victory.caseSolved')}
          </motion.h2>

          {/* Crown + Winner Name */}
          <motion.div
            className="my-4 sm:my-8"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Crown size={40} color="var(--royal-gold)" className="mx-auto mb-2" strokeWidth={1.5} />
            <div className="text-2xl sm:text-3xl font-black text-white">
              {winnerPlayer && <FlairName player={winnerPlayer} />}
            </div>
          </motion.div>

          {/* Token Scoreboard */}
          <motion.div
            className="my-4 sm:my-6 space-y-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.6 }}
          >
            <div className="text-[var(--parchment-dark)] uppercase text-xs tracking-widest mb-2">{t('victory.caseProgress')}</div>
            {sortedPlayers.map((p, i) => (
              <motion.div
                key={p.id}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-sm ${
                  p.id === winnerId
                    ? 'bg-[rgba(var(--accent-color-rgb),0.2)] text-[var(--royal-gold-light)] font-bold'
                    : 'text-[var(--parchment-dark)]'
                }`}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.6 + i * 0.08 }}
              >
                <span className="flex items-center gap-1.5 truncate mr-2">
                  {p.id === winnerId && <Crown size={14} style={{flexShrink:0}} />}
                  <FlairName player={p} />
                </span>
                <span className="font-mono whitespace-nowrap"><ScoreCountUp value={p.tokens} from={0} /> / {tokensToWin}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Platform rewards (+XP/+GP, unlocks, crew streak) */}
          {!isBroadcastMirror && <PostGameRewards />}

          {/* Buttons / Waiting */}
          <motion.div
            className="mt-4 sm:mt-6"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.9 }}
          >
            {me?.isHost ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => { if (socket.connected) socket.emit('game:start', {}); }}
                  className="ps-victory-btn--primary flex-1 px-6 py-3 text-sm sm:text-base min-h-[48px]"
                >
                  {t('victory.newGame')}
                </button>
                <button
                  onClick={() => { if (socket.connected) socket.emit('game:backToLobby', {}); }}
                  className="ps-victory-btn--primary flex-1 px-6 py-3 text-sm sm:text-base min-h-[48px]"
                >
                  {t('victory.backToLobby')}
                </button>
              </div>
            ) : (
              <div className="text-sm text-[var(--parchment-dark)] opacity-70 italic">
                {t('victory.waitingForHost')}
              </div>
            )}

            {/* Rematch vote (platform-wide majority vote) */}
            {!isBroadcastMirror && <RematchControls socket={socket} isHost={isHost} />}
            {!isBroadcastMirror && <PostGameShareCta roomCode={lobby.code} gameName="Prime Suspect" />}

            {lobby.isGameBuddiesRoom && (
              <button
                onClick={handleTryAnotherGame}
                className="ps-victory-btn--primary w-full mt-3 px-6 py-3 text-sm sm:text-base min-h-[48px]"
              >
                {t('lobby.returnAll')}
              </button>
            )}
          </motion.div>

          {/* Game-over ad — below the victory actions. Non-premium players only
              (Prime Suspect has no big-screen mode). */}
          {!isBroadcastMirror && <GameAdRectangle placement="game_over" />}
        </motion.div>
      </motion.div>
    </Portal>
  );
};
