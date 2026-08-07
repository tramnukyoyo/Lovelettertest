import React, { useEffect, useRef, useState } from 'react';
import type { Lobby, Player, CardType } from '../../types';
import type { Socket } from 'socket.io-client';
import { motion } from 'framer-motion';
import { Crown, Flame, Award, ChevronUp } from 'lucide-react';
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
import DynamicCard from './DynamicCard';
import '../../styles/game/surface-victory.css';

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
 *
 * Icons are lucide glyphs, never emoji (owner directive): full-colour system
 * emoji against the gold/parchment front page read as unfinished.
 */
const PostGameRewards: React.FC = () => {
  const { rewards, crewStreak, unlocks } = usePostgame();
  if (rewards.length === 0 && !crewStreak && unlocks.length === 0) return null;

  return (
    <div className="my-3 text-sm">
      {crewStreak && (
        <div className="ps-reward-line mb-1.5">
          <Flame size={14} strokeWidth={2.2} className="ps-reward-ico" aria-hidden="true" />
          <span>
            {crewStreak.gamesTonight > 1 ? `Game ${crewStreak.gamesTonight} tonight!` : 'First game tonight!'}
            {crewStreak.weekStreak > 1 ? ` · Crew streak: ${crewStreak.weekStreak} weeks` : ''}
          </span>
        </div>
      )}
      {unlocks.length > 0 && (
        <div className="flex flex-col gap-0.5 mb-1.5">
          {unlocks.slice(0, 4).map((u) => (
            <div
              key={`${u.playerId}:${u.achievement.id}`}
              title={u.achievement.description}
              className="ps-reward-line"
            >
              <Award size={14} strokeWidth={2.2} className="ps-reward-ico" aria-hidden="true" />
              <span>
                <FlairNameById playerId={u.playerId} name={u.playerName} /> unlocked “{u.achievement.name}”!
              </span>
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
              {r.leveledUp && r.newLevel != null && (
                <span className="text-[#7cffb2] font-semibold whitespace-nowrap inline-flex items-center gap-0.5">
                  <ChevronUp size={13} strokeWidth={3} aria-hidden="true" /> Lv {r.newLevel}
                </span>
              )}
              {r.achievements.map((a) => (
                <Award key={a.id} size={13} strokeWidth={2.2} className="ps-reward-ico" aria-label={a.name} />
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
 *
 * This is the ONE primary CTA on the results screen (retention action) — every
 * other action is demoted to the theme's secondary `.ps-btn--ghost` tier.
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
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={handleVote}
        className="ps-victory-btn--primary w-full px-6 py-3 text-sm sm:text-base min-h-[52px]"
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

/**
 * The server logs the round narration as one blob, e.g.
 *   "No cards left! Cards revealed — Falco held Lawyer (highest card wins the round)!"
 * The dramatic clause belongs in the hero slot; the set-up and the rules
 * parenthetical belong in a hairline caption. Split rather than dump the raw
 * system-log string into the drama slot.
 */
function splitNarration(raw?: string): { hero: string; caption: string } {
  if (!raw) return { hero: '', caption: '' };
  let rest = raw.trim();
  let paren = '';

  const trailing = rest.match(/\s*\(([^()]*)\)\s*([!.?]*)\s*$/);
  if (trailing && trailing.index != null) {
    paren = trailing[1].trim();
    rest = (rest.slice(0, trailing.index).trim() + (trailing[2] || '')).trim();
  }

  const parts = rest.split(/\s+[—–]\s+/);
  const hero = (parts.pop() || rest).trim();
  const lead = parts.join(' — ').trim();
  const caption = [lead, paren].filter(Boolean).join(' — ');

  return { hero, caption };
}

/**
 * Reports whether the results panel actually overflows, so the bottom scroll
 * vignette is only shown when there IS more case file below (owner directive:
 * a visible scroll affordance wherever content cannot fit — but never a false
 * one). Local to this panel; the shared shell ScrollHint is untouched.
 */
function useOverflowFlag(innerRef: React.RefObject<HTMLDivElement | null>, scrollRef: React.RefObject<HTMLDivElement | null>) {
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const scroller = scrollRef.current;
    const inner = innerRef.current;
    if (!scroller || !inner) return;

    const check = () => setOverflowing(scroller.scrollHeight - scroller.clientHeight > 6);
    check();

    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(check);
    ro.observe(scroller);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [innerRef, scrollRef]);

  return overflowing;
}

/** Wax-seal token pips: filled seals earned, hollow seals still to win. */
const TokenPips: React.FC<{ tokens: number; total: number; stampLast?: boolean }> = ({ tokens, total, stampLast }) => (
  <span className="ps-pips" role="img" aria-label={`${tokens} / ${total}`}>
    {Array.from({ length: total }, (_, i) => {
      const filled = i < tokens;
      const isNew = !!stampLast && filled && i === tokens - 1;
      return <i key={i} className={`ps-pip${filled ? ' is-filled' : ''}${isNew ? ' is-new' : ''}`} aria-hidden="true" />;
    })}
  </span>
);

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

  // Prefer the system narration over whatever chat happened to land last.
  const systemMessages = (lobby.messages || []).filter(m => m.isSystem);
  const lastMessage = (systemMessages.length > 0 ? systemMessages : (lobby.messages || []))
    .slice(-1)[0]?.message;
  const narration = splitNarration(lastMessage);

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

  // Flag the document while a results overlay owns the screen. The platform XP
  // toast is `position:fixed; top:100px; right:20px` and landed straight on the
  // modal (375/768/1920); surface-victory.css re-docks it and reserves its strip.
  useEffect(() => {
    document.body.classList.add('ps-results-open');
    return () => { document.body.classList.remove('ps-results-open'); };
  }, []);

  // The evidence spread: one card per suspect. Revealed hands go face up
  // (the server reveals every hand once roundWinner is set); eliminated seats
  // keep a face-down back so the row always reads as a full spread.
  const tablePlayers = lobby.players.filter(p => !p.isSpectator && !p.isBigScreen);
  const evidenceCount = Math.max(tablePlayers.length, 1);
  const evidenceCardW = `clamp(44px, ${Math.min(20, 80 / evidenceCount).toFixed(1)}vw, ${Math.min(104, Math.round(372 / (1 + 0.84 * (evidenceCount - 1))))}px)`;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const isScrollable = useOverflowFlag(innerRef, scrollRef);

  const renderProgressRow = (p: Player, stampWinner: boolean) => (
    <div key={p.id} className={`ps-progress-row${p.id === winnerId ? ' is-winner' : ''}`}>
      <span className="ps-progress-name">
        {p.id === winnerId && <Crown size={14} style={{ flexShrink: 0 }} aria-hidden="true" />}
        <FlairName player={p} className="ps-truncate" />
      </span>
      <TokenPips tokens={p.tokens} total={tokensToWin} stampLast={stampWinner && p.id === winnerId} />
    </div>
  );

  // ── Round-Over Mode (no game winner yet) ──
  // Contract: NO buttons here — the server auto-advances after 5s.
  if (!isGameWin) {
    return (
      <Portal>
        <div className="ps-victory-scrim">
          <div className={`ps-victory-panel is-roundover hg-panel hg-candlelight${isScrollable ? ' is-scrollable' : ''}`}>
            <div className="ps-victory-scroll" ref={scrollRef}>
              <div ref={innerRef}>
              {/* The label is the footnote; the suspect is the headline. */}
              <div className="ps-eyebrow">{t('victory.roundOver')}</div>

              {/* Evidence laid out */}
              <div
                className="ps-evidence-row"
                aria-hidden="true"
                style={{ ['--psv-card-w' as string]: evidenceCardW } as React.CSSProperties}
              >
                {tablePlayers.map((p, i) => {
                  const offset = i - (tablePlayers.length - 1) / 2;
                  const held: CardType | undefined = p.hand?.[0];
                  const isWinnerCard = p.id === winnerId;
                  return (
                    <div
                      key={p.id}
                      className={`ps-evidence-card${isWinnerCard ? ' is-winner' : ''}${held ? '' : ' is-out'}`}
                      style={{
                        ['--psv-rot' as string]: `${(isWinnerCard ? 0 : offset * 4.5).toFixed(1)}deg`,
                        ['--psv-lift' as string]: `${(Math.abs(offset) * 2.5).toFixed(1)}px`,
                        ['--psv-delay' as string]: `${(i * 0.06).toFixed(2)}s`,
                        zIndex: isWinnerCard ? 3 : 1,
                      } as React.CSSProperties}
                    >
                      <DynamicCard cardType={(held ?? 0) as CardType} showFace={!!held} />
                    </div>
                  );
                })}
              </div>

              <div className="ps-eyebrow">{t('game.winner')}</div>
              <div className="ps-winner-name">
                {winnerPlayer && <FlairName player={winnerPlayer} />}
              </div>

              {narration.hero && <div className="ps-hero-line">{narration.hero}</div>}
              {narration.caption && <div className="ps-caption">{narration.caption}</div>}

              {/* Case progress — wax-seal pips, the round winner's newest seal stamped in */}
              <div className="ps-progress-head ps-eyebrow">{t('victory.caseProgress')}</div>
              <div className="ps-progress-list">
                {sortedPlayers.map(p => renderProgressRow(p, true))}
              </div>

              <div className="ps-next-note">{t('victory.nextRoundIn')}</div>
              </div>
            </div>

            <div className="ps-victory-fade" aria-hidden="true" />
            {/* The 5s auto-advance made visible. */}
            <div className="ps-round-tick-track" aria-hidden="true">
              <div className="ps-round-tick" />
            </div>
          </div>
        </div>
      </Portal>
    );
  }

  // ── Game Victory Mode — CASE SOLVED, the conviction front page ──
  return (
    <Portal>
      {/* Noir/gold palette carried over from the retired animations/Confetti. */}
      <div className="ps-victory-confetti">
        <Confetti colors={['#d2b25a', '#e7cc7a', '#8a2233', '#f6f0e6', '#a77e22']} />
      </div>
      <motion.div
        className="ps-victory-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className={`ps-victory-panel is-gameover hg-panel hg-candlelight${isScrollable ? ' is-scrollable' : ''}`}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
        >
          <div className="ps-victory-scroll" ref={scrollRef}>
            <div ref={innerRef}>
            {/* Masthead */}
            <header className="ps-masthead">
              <div className="ps-dateline">{lobby.code}</div>
              <motion.h2
                className="ps-headline"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
              >
                {t('victory.caseSolved')}
              </motion.h2>
              <div className="ps-masthead-rule" aria-hidden="true" />
            </header>

            <div className="ps-victory-grid">
              {/* Left: the convicted */}
              <motion.section
                className="ps-verdict"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <div className="ps-crown" aria-hidden="true">
                  <Crown size={56} color="var(--royal-gold)" strokeWidth={1.5} />
                </div>
                <div className="ps-eyebrow">{t('victory.winner')}</div>
                <div className="ps-winner-name">
                  {winnerPlayer && <FlairName player={winnerPlayer} />}
                </div>
              </motion.section>

              {/* Right: the dossier */}
              <motion.section
                className="ps-dossier"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.6 }}
              >
                <div className="ps-progress-head ps-eyebrow">{t('victory.caseProgress')}</div>
                <div className="ps-progress-list">
                  {sortedPlayers.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ x: -16, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.2, delay: 0.6 + i * 0.08 }}
                      className={`ps-progress-row${p.id === winnerId ? ' is-winner' : ''}`}
                    >
                      <span className="ps-progress-name">
                        {p.id === winnerId && <Crown size={14} style={{ flexShrink: 0 }} aria-hidden="true" />}
                        <FlairName player={p} className="ps-truncate" />
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <TokenPips tokens={p.tokens} total={tokensToWin} />
                        <span className="font-mono text-xs opacity-70 whitespace-nowrap">
                          <ScoreCountUp value={p.tokens} from={0} />/{tokensToWin}
                        </span>
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* Platform rewards (+XP/+GP, unlocks, crew streak). The slot is
                    reserved so a late gb:postgame:summary can't shove the CTAs. */}
                {!isBroadcastMirror && (
                  <div className="ps-rewards-slot">
                    <PostGameRewards />
                  </div>
                )}
              </motion.section>
            </div>

            {/* CTAs — ONE primary (Rematch), hairline, then the secondary tier */}
            <motion.div
              className="ps-cta-block"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.9 }}
            >
              {!isBroadcastMirror && <RematchControls socket={socket} isHost={isHost} />}

              <hr className="ps-cta-divider" />

              <div className="ps-cta-secondary">
                {me?.isHost ? (
                  <div className="ps-cta-pair">
                    <button
                      type="button"
                      onClick={() => { if (socket.connected) socket.emit('game:start', {}); }}
                      className="ps-btn ps-btn--ghost"
                    >
                      {t('victory.newGame')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (socket.connected) socket.emit('game:backToLobby', {}); }}
                      className="ps-btn ps-btn--ghost"
                    >
                      {t('victory.backToLobby')}
                    </button>
                  </div>
                ) : (
                  <div className="ps-waiting-note">{t('victory.waitingForHost')}</div>
                )}

                {!isBroadcastMirror && (
                  <div className="ps-victory-share">
                    <PostGameShareCta roomCode={lobby.code} gameName="Prime Suspect" />
                  </div>
                )}

                {lobby.isGameBuddiesRoom && (
                  <button
                    type="button"
                    onClick={handleTryAnotherGame}
                    className="ps-btn ps-btn--ghost"
                  >
                    {t('lobby.returnAll')}
                  </button>
                )}
              </div>
            </motion.div>

            {/* Game-over ad — below the victory actions. Non-premium players only
                (Prime Suspect has no big-screen mode). */}
            {!isBroadcastMirror && <GameAdRectangle placement="game_over" />}
            </div>
          </div>

          <div className="ps-victory-fade" aria-hidden="true" />
        </motion.div>
      </motion.div>
    </Portal>
  );
};
