import React, { useEffect } from 'react';
import type { Lobby } from '../../types';
import type { Socket } from 'socket.io-client';
import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import { Confetti } from '../animations/Confetti';
import { soundEffects } from '../../utils/soundEffects';
import { getTranslation, getCurrentLanguage } from '../../utils/translations';

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

  // ── Round-Over Mode (no game winner yet) ──
  if (!isGameWin) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="hg-panel hg-candlelight border border-[rgba(var(--accent-color-rgb),0.35)] p-6 sm:p-10 rounded-2xl max-w-md w-full text-center shadow-[0_0_50px_rgba(var(--accent-color-rgb),0.25)]">
          <h2 className="text-2xl sm:text-4xl font-black mb-3 sm:mb-4 text-[var(--royal-gold)] uppercase tracking-widest drop-shadow-md">
            {t('victory.roundOver')}
          </h2>

          <div className="my-4 sm:my-6">
            <div className="text-[var(--parchment-dark)] mb-1 uppercase text-xs tracking-widest">{t('game.winner')}</div>
            <div className="text-xl sm:text-3xl font-bold text-white">
              {winnerPlayer?.name}
            </div>
          </div>

          {/* Token Progress */}
          <div className="my-4 sm:my-6 space-y-2">
            <div className="text-[var(--parchment-dark)] uppercase text-xs tracking-widest mb-2">{t('victory.caseProgress')}</div>
            {sortedPlayers.map(p => (
              <div
                key={p.id}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-sm ${
                  p.id === winnerId ? 'bg-[rgba(var(--accent-color-rgb),0.15)] text-[var(--royal-gold)] font-bold' : 'text-[var(--parchment-dark)]'
                }`}
              >
                <span className="truncate mr-2">{p.name}</span>
                <span className="font-mono whitespace-nowrap">{p.tokens} / {tokensToWin}</span>
              </div>
            ))}
          </div>

          <div className="text-sm text-[var(--parchment-dark)] opacity-70 italic">
            {t('victory.nextRoundIn')}
          </div>
        </div>
      </div>
    );
  }

  // ── Game Victory Mode ──
  return (
    <>
      <Confetti />
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
            className="text-2xl sm:text-4xl font-black mb-2 text-[var(--royal-gold)] uppercase tracking-widest"
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
            <Crown className="w-10 h-10 sm:w-14 sm:h-14 mx-auto mb-2 text-[var(--royal-gold)]" strokeWidth={1.5} />
            <div className="text-2xl sm:text-3xl font-black text-white">
              {winnerPlayer?.name}
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
                    ? 'bg-[rgba(var(--accent-color-rgb),0.2)] text-[var(--royal-gold)] font-bold'
                    : 'text-[var(--parchment-dark)]'
                }`}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.6 + i * 0.08 }}
              >
                <span className="flex items-center gap-1.5 truncate mr-2">
                  {p.id === winnerId && <Crown className="w-3.5 h-3.5 flex-shrink-0" />}
                  {p.name}
                </span>
                <span className="font-mono whitespace-nowrap">{p.tokens} / {tokensToWin}</span>
              </motion.div>
            ))}
          </motion.div>

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
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[var(--royal-crimson)] to-[var(--royal-crimson-dark)] hover:from-[var(--royal-crimson-light)] hover:to-[var(--royal-crimson)] text-white font-black rounded-xl text-sm sm:text-base shadow-lg transform hover:scale-105 transition-all uppercase tracking-wider min-h-[48px]"
                >
                  {t('victory.newGame')}
                </button>
                <button
                  onClick={() => { if (socket.connected) socket.emit('game:backToLobby', {}); }}
                  className="flex-1 px-6 py-3 border-2 border-[var(--royal-gold)] text-[var(--royal-gold)] hover:bg-[rgba(var(--accent-color-rgb),0.1)] font-bold rounded-xl text-sm sm:text-base transition-all uppercase tracking-wider min-h-[48px]"
                >
                  {t('victory.backToLobby')}
                </button>
              </div>
            ) : (
              <div className="text-sm text-[var(--parchment-dark)] opacity-70 italic">
                {t('victory.waitingForHost')}
              </div>
            )}

            {lobby.isGameBuddiesRoom && (
              <button
                onClick={handleTryAnotherGame}
                className="w-full mt-3 px-6 py-3 bg-gradient-to-r from-[var(--royal-crimson)] to-[var(--royal-crimson-dark)] hover:from-[var(--royal-crimson-light)] hover:to-[var(--royal-crimson)] text-white font-black rounded-xl text-sm sm:text-base shadow-lg transform hover:scale-105 transition-all uppercase tracking-wider min-h-[48px]"
              >
                Try Another Game
              </button>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
};
