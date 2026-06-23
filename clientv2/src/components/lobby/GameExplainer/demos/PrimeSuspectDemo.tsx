/**
 * Prime Suspect GameExplainer demo — 22s loop. Mirrors the actual mechanic
 * mined from `components/hearts-gambit/cardDatabase.ts`. Uses the real card
 * artwork from /primesuspect/images/N.webp (1..8).
 *
 *   A noir deduction game. Each player holds 1 secret role-card. On your turn:
 *   draw 1 (now 2 in hand), play 1 (resolve its effect), keep the other.
 *   Cards range from value 1 (Inspector — accuse) up to 8 (The Murderer —
 *   never let it leave your hand). Survive accusations until you're the only
 *   detective left, OR end the round holding the highest card.
 *
 *   Card values & roles in the deck (from cardDatabase.ts):
 *     1 Inspector   — accuse: name a specific card a target holds
 *     2 Butler      — peek at another player's hand
 *     3 Witness     — compare alibis; lower value is out
 *     4 Lawyer      — immunity for the round
 *     5 Blackmailer — force someone to discard + redraw
 *     6 Double Agent— swap hands with another player
 *     7 Accomplice  — auto-reveal with 5 or 6
 *     8 The Murderer — never discard this; getting forced to discard = OUT
 *
 *   Demo round (5 beats):
 *     1. 4 detectives, each with a face-down card. Deck centre.
 *     2. Mei plays INSPECTOR (1) → accuses Lou of being THE MURDERER.
 *        WRONG — Lou holds Witness (3).
 *     3. Lou plays BUTLER (2) → peeks at Eli's hand. Sees MURDERER (8).
 *     4. Tomi plays INSPECTOR (1) → accuses Eli of being THE MURDERER.
 *        CORRECT. Eli's card flips face-up. ARRESTED stamp.
 *     5. Three detectives survive. CASE CLOSED.
 */
import React from 'react';
import type { DemoProps, DemoSpec } from '../types';
import cardBackImg from '../../../../assets/cards/back.png';
import { t } from '../../../../utils/translations';

const VIEW_W = 640;
const VIEW_H = 360;

const VELVET = '#0c0c10';
const VELVET_2 = '#1a0a14';
const CRIMSON = '#6a1623';
const CRIMSON_LIGHT = '#a02436';
const GOLD = '#d2b25a';
const GOLD_BRIGHT = '#f5d57a';
const PARCHMENT = '#f6f0e6';
const TEXT_DARK = '#2a1810';
const TEXT_DIM = '#bb9b6e';
const RED = '#dc2626';
const CYAN = '#7df9ff';

const DURATION_MS = 22000;
const BEAT2_AT = 4500;
const BEAT3_AT = 9000;
const BEAT4_AT = 13500;
const BEAT5_AT = 18500;
const LOOP_FADE_START = 21400;

const PLAYERS = ['Mei', 'Tomi', 'Eli', 'Lou'] as const;
const LOCAL_IDX = 3;

const easeOutCubic = (x: number): number => 1 - Math.pow(1 - x, 3);
const easeOutBack = (x: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

export const PrimeSuspectDemo: React.FC<DemoProps> = ({ t: tClock }) => {
  const ms = tClock * DURATION_MS;

  const PLAYER_X_LEFT = 80;
  const PLAYER_X_STEP = 165;
  const PLAYER_Y = 100;
  const playerX = (idx: number) => PLAYER_X_LEFT + idx * PLAYER_X_STEP;

  const DECK_X = VIEW_W / 2;
  const DECK_Y = 230;

  const CARD_W = 56;
  const CARD_H = 80;

  const setupOp = ms < 200 ? 0 : ms < 1000 ? easeOutCubic((ms - 200) / 800) : 1;

  const renderCardBack = (cx: number, cy: number, opacity = 1, scale = 1, rotate = 0) => (
    <g transform={`translate(${cx} ${cy}) rotate(${rotate}) scale(${scale})`} opacity={opacity}>
      <rect x={-CARD_W / 2} y={-CARD_H / 2} width={CARD_W} height={CARD_H} rx={5} fill={CRIMSON} stroke={GOLD} strokeWidth={2} />
      <image
        href={cardBackImg}
        x={-CARD_W / 2 + 2}
        y={-CARD_H / 2 + 2}
        width={CARD_W - 4}
        height={CARD_H - 4}
        preserveAspectRatio="xMidYMid slice"
      />
    </g>
  );

  const renderCardFace = (cx: number, cy: number, value: number, opacity = 1, scale = 1, rotate = 0, isMurderer = false) => (
    <g transform={`translate(${cx} ${cy}) rotate(${rotate}) scale(${scale})`} opacity={opacity}>
      {/* Outer frame — gold, or crimson if it's the Murderer being publicly outed */}
      <rect
        x={-CARD_W / 2}
        y={-CARD_H / 2}
        width={CARD_W}
        height={CARD_H}
        rx={5}
        fill={PARCHMENT}
        stroke={isMurderer ? CRIMSON : GOLD}
        strokeWidth={isMurderer ? 3 : 2}
      />
      {/* Real card artwork */}
      <image
        href={`/primesuspect/images/${value}.webp`}
        x={-CARD_W / 2 + 2}
        y={-CARD_H / 2 + 2}
        width={CARD_W - 4}
        height={CARD_H - 4}
        preserveAspectRatio="xMidYMid slice"
      />
      {/* Top-left value pip */}
      <text
        x={-CARD_W / 2 + 6}
        y={-CARD_H / 2 + 13}
        fontSize={10}
        fontFamily="'Special Elite', monospace"
        fontWeight={800}
        fill={isMurderer ? CRIMSON : TEXT_DARK}
        stroke="#fff"
        strokeWidth={2.5}
        paintOrder="stroke"
      >
        {value}
      </text>
      {/* Bottom-right rotated value pip (for double-headed look) */}
      <text
        x={CARD_W / 2 - 6}
        y={CARD_H / 2 - 6}
        fontSize={10}
        fontFamily="'Special Elite', monospace"
        fontWeight={800}
        fill={isMurderer ? CRIMSON : TEXT_DARK}
        stroke="#fff"
        strokeWidth={2.5}
        paintOrder="stroke"
        textAnchor="end"
        transform={`rotate(180 ${CARD_W / 2 - 6} ${CARD_H / 2 - 6})`}
      >
        {value}
      </text>
    </g>
  );

  // Beat 2: Mei plays Inspector → wrong accusation on Lou
  const meiPlayedT = ms < BEAT2_AT
    ? 0
    : ms < BEAT2_AT + 700
      ? easeOutCubic((ms - BEAT2_AT) / 700)
      : ms < BEAT3_AT
        ? 1
        : Math.max(0, 1 - (ms - BEAT3_AT) / 400);
  const meiInspectorPos = (() => {
    const startX = playerX(0);
    const startY = PLAYER_Y;
    const centerX = VIEW_W / 2;
    const centerY = 175;
    return {
      x: startX + (centerX - startX) * meiPlayedT,
      y: startY + (centerY - startY) * meiPlayedT,
    };
  })();
  const accuseArrowT = ms < BEAT2_AT + 1100
    ? 0
    : ms < BEAT2_AT + 1900
      ? easeOutCubic((ms - (BEAT2_AT + 1100)) / 800)
      : ms < BEAT3_AT - 300
        ? 1
        : Math.max(0, 1 - (ms - (BEAT3_AT - 300)) / 300);
  const louRevealT = ms < BEAT2_AT + 2700
    ? 0
    : ms < BEAT2_AT + 3300
      ? Math.min(1, (ms - (BEAT2_AT + 2700)) / 600)
      : ms < BEAT3_AT - 200
        ? 1
        : Math.max(0, 1 - (ms - (BEAT3_AT - 200)) / 200);

  // Beat 3: Lou plays Butler → peek at Eli
  const louButlerT = ms < BEAT3_AT
    ? 0
    : ms < BEAT3_AT + 700
      ? easeOutCubic((ms - BEAT3_AT) / 700)
      : ms < BEAT4_AT
        ? 1
        : Math.max(0, 1 - (ms - BEAT4_AT) / 400);
  const louButlerPos = (() => {
    const startX = playerX(LOCAL_IDX);
    const startY = PLAYER_Y;
    const centerX = VIEW_W / 2;
    const centerY = 175;
    return {
      x: startX + (centerX - startX) * louButlerT,
      y: startY + (centerY - startY) * louButlerT,
    };
  })();
  const peekBeamT = ms < BEAT3_AT + 1100
    ? 0
    : ms < BEAT3_AT + 1700
      ? Math.min(1, (ms - (BEAT3_AT + 1100)) / 600)
      : ms < BEAT4_AT - 300
        ? 1
        : Math.max(0, 1 - (ms - (BEAT4_AT - 300)) / 300);
  const eliPeekT = ms < BEAT3_AT + 1700
    ? 0
    : ms < BEAT3_AT + 2400
      ? Math.min(1, (ms - (BEAT3_AT + 1700)) / 700)
      : ms < BEAT4_AT - 400
        ? 1
        : Math.max(0, 1 - (ms - (BEAT4_AT - 400)) / 400);

  // Beat 4: Tomi plays Inspector → correct accusation on Eli
  const tomiInspectorT = ms < BEAT4_AT
    ? 0
    : ms < BEAT4_AT + 700
      ? easeOutCubic((ms - BEAT4_AT) / 700)
      : ms < BEAT5_AT
        ? 1
        : Math.max(0, 1 - (ms - BEAT5_AT) / 400);
  const tomiAccusePos = (() => {
    const startX = playerX(1);
    const startY = PLAYER_Y;
    const centerX = VIEW_W / 2;
    const centerY = 175;
    return {
      x: startX + (centerX - startX) * tomiInspectorT,
      y: startY + (centerY - startY) * tomiInspectorT,
    };
  })();
  const tomiAccuseArrowT = ms < BEAT4_AT + 1100
    ? 0
    : ms < BEAT4_AT + 1900
      ? easeOutCubic((ms - (BEAT4_AT + 1100)) / 800)
      : ms < BEAT5_AT - 300
        ? 1
        : Math.max(0, 1 - (ms - (BEAT5_AT - 300)) / 300);
  const eliPublicRevealT = ms < BEAT4_AT + 2300
    ? 0
    : ms < BEAT4_AT + 3000
      ? Math.min(1, (ms - (BEAT4_AT + 2300)) / 700)
      : 1;
  const arrestStampT = ms < BEAT4_AT + 3000
    ? 0
    : easeOutBack(clamp01((ms - (BEAT4_AT + 3000)) / 600));
  const arrestStampOp = ms < BEAT4_AT + 3000 ? 0 : Math.min(1, (ms - (BEAT4_AT + 3000)) / 300);

  // Beat 5: Case Closed
  const caseClosedT = ms < BEAT5_AT
    ? 0
    : easeOutBack(clamp01((ms - BEAT5_AT) / 600));
  const caseClosedOp = ms < BEAT5_AT ? 0 : Math.min(1, (ms - BEAT5_AT) / 350);

  const loopFade =
    ms >= LOOP_FADE_START
      ? 1 - (ms - LOOP_FADE_START) / (DURATION_MS - LOOP_FADE_START)
      : 1;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      xmlns="http://www.w3.org/2000/svg"
      className="primesuspect-demo"
    >
      <defs>
        <linearGradient id="ps-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={VELVET_2} />
          <stop offset="100%" stopColor={VELVET} />
        </linearGradient>
        <radialGradient id="ps-vignette" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={CRIMSON} stopOpacity="0.18" />
          <stop offset="100%" stopColor={CRIMSON} stopOpacity="0" />
        </radialGradient>
        <filter id="ps-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <radialGradient id="gex-vignette" cx="50%" cy="50%" r="75%">
          <stop offset="55%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.42)" />
        </radialGradient>
        <filter id="gex-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000" floodOpacity="0.50" />
        </filter>
      </defs>

      <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="url(#ps-bg)" />
      <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="url(#ps-vignette)" />

      <text
        x={VIEW_W / 2}
        y={28}
        fontSize={11}
        fontFamily="'Special Elite', monospace"
        fontWeight={700}
        fill={GOLD}
        textAnchor="middle"
        letterSpacing={4}
        opacity={loopFade}
      >
        ONE CARD IN HAND · DRAW · PLAY · DEDUCE
      </text>

      {/* Deck centre — stacked card backs using the real back artwork */}
      <g transform={`translate(${DECK_X} ${DECK_Y})`} opacity={setupOp * loopFade}>
        {[0, 1, 2, 3].map(i => (
          <g key={`deck-${i}`} transform={`translate(${i * 0.8} ${i * 0.8})`} opacity={0.6 + 0.1 * i}>
            <rect x={-CARD_W / 2} y={-CARD_H / 2} width={CARD_W} height={CARD_H} rx={5} fill={CRIMSON} stroke={GOLD} strokeWidth={1.5} />
          </g>
        ))}
        <g transform={`translate(3.2 3.2)`}>
          <rect x={-CARD_W / 2} y={-CARD_H / 2} width={CARD_W} height={CARD_H} rx={5} fill={CRIMSON} stroke={GOLD} strokeWidth={2} />
          <image
            href={cardBackImg}
            x={-CARD_W / 2 + 2}
            y={-CARD_H / 2 + 2}
            width={CARD_W - 4}
            height={CARD_H - 4}
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
        <text
          x={0}
          y={CARD_H / 2 + 16}
          fontSize={9}
          fontFamily="'Special Elite', monospace"
          fontWeight={700}
          fill={TEXT_DIM}
          textAnchor="middle"
          letterSpacing={2}
        >
          DECK · 16 CARDS
        </text>
      </g>

      {/* Players & their face-down cards */}
      {PLAYERS.map((name, idx) => {
        const cx = playerX(idx);
        const cy = PLAYER_Y;
        const isLocal = idx === LOCAL_IDX;
        const accent = isLocal ? CYAN : GOLD;
        const isEliPublicReveal = idx === 2 && eliPublicRevealT > 0;
        const isLouRevealing = idx === LOCAL_IDX && louRevealT > 0 && louRevealT < 1.0001;
        const isEliPeek = idx === 2 && eliPeekT > 0 && ms < BEAT4_AT - 400;

        let cardEl: React.ReactNode;
        if (isEliPublicReveal) {
          cardEl = renderCardFace(cx, cy + 50, 8, eliPublicRevealT, 1, 0, true);
        } else if (isLouRevealing) {
          cardEl = renderCardFace(cx, cy + 50, 3, louRevealT);
        } else if (isEliPeek) {
          cardEl = (
            <g>
              {renderCardBack(cx, cy + 50)}
              <g opacity={eliPeekT}>
                {renderCardFace(cx + 60, cy + 30, 8, 0.95, 0.85, -8, true)}
                <line x1={cx + 18} y1={cy + 50} x2={cx + 50} y2={cy + 35} stroke={CYAN} strokeWidth={1.2} strokeDasharray="2 2" opacity={0.7} />
                <text x={cx + 60} y={cy + 80} fontSize={7} fontFamily="'Special Elite', monospace" fontWeight={700} fill={CYAN} textAnchor="middle" letterSpacing={1.5}>{t('psDemo.seenByLou')}</text>
              </g>
            </g>
          );
        } else {
          cardEl = renderCardBack(cx, cy + 50, 1);
        }

        return (
          <g key={`p-${idx}`} opacity={setupOp * loopFade}>
            <circle cx={cx} cy={cy} r={26} fill={VELVET_2} stroke={accent} strokeWidth={2.5} />
            {isLocal && <circle cx={cx} cy={cy} r={30} fill="none" stroke={CYAN} strokeWidth={2} opacity={0.8} />}
            <text x={cx} y={cy + 6} fontSize={20} fontFamily="'Special Elite', monospace" fontWeight={800} fill={accent} textAnchor="middle">
              {name[0]}
            </text>
            <text x={cx} y={cy - 36} fontSize={11} fontFamily="'Special Elite', monospace" fontWeight={700} fill={accent} textAnchor="middle" letterSpacing={1.5}>
              {isLocal ? `${name} (YOU)` : name}
            </text>
            {cardEl}
            {idx === 2 && arrestStampOp > 0 && (
              <g
                transform={`translate(${cx} ${cy + 50}) rotate(-12) scale(${arrestStampT})`}
                opacity={arrestStampOp}
              >
                <rect x={-46} y={-13} width={92} height={26} fill="#fff" stroke={RED} strokeWidth={3} />
                <text y={5} fontSize={13} fontFamily="'Special Elite', monospace" fontWeight={800} fill={RED} textAnchor="middle" letterSpacing={2.5}>{t('psDemo.arrested')}</text>
              </g>
            )}
          </g>
        );
      })}

      {/* Beat 2 */}
      {ms >= BEAT2_AT && ms < BEAT3_AT && (
        <g opacity={loopFade}>
          {renderCardFace(meiInspectorPos.x, meiInspectorPos.y, 1, meiPlayedT, 0.85)}
          {accuseArrowT > 0 && (() => {
            const srcX = playerX(0);
            const srcY = PLAYER_Y + 80;
            const dstX = playerX(LOCAL_IDX);
            const dstY = PLAYER_Y + 30;
            const curX = srcX + (dstX - srcX) * accuseArrowT;
            const curY = srcY + (dstY - srcY) * accuseArrowT - 30 * Math.sin(accuseArrowT * Math.PI);
            const angle = Math.atan2(dstY - srcY, dstX - srcX);
            return (
              <g>
                <line x1={srcX} y1={srcY} x2={curX} y2={curY} stroke={CRIMSON_LIGHT} strokeWidth={2.5} strokeDasharray="4 3" opacity={0.85} />
                <polygon points="0,-5 10,0 0,5" fill={CRIMSON_LIGHT} transform={`translate(${curX} ${curY}) rotate(${(angle * 180) / Math.PI})`} />
              </g>
            );
          })()}
          {ms >= BEAT2_AT + 1900 && ms < BEAT3_AT - 300 && (
            <text x={VIEW_W / 2} y={205} fontSize={12} fontFamily="'Special Elite', monospace" fontWeight={800} fill={CRIMSON_LIGHT} textAnchor="middle" letterSpacing={2}>
              "I ACCUSE LOU OF BEING THE MURDERER!"
            </text>
          )}
          {louRevealT >= 1 && (
            <text x={VIEW_W / 2} y={225} fontSize={11} fontFamily="'Special Elite', monospace" fontWeight={800} fill={GOLD} textAnchor="middle" letterSpacing={2}>
              ✗ WRONG — LOU IS A WITNESS
            </text>
          )}
        </g>
      )}

      {/* Beat 3 */}
      {ms >= BEAT3_AT && ms < BEAT4_AT && (
        <g opacity={loopFade}>
          {renderCardFace(louButlerPos.x, louButlerPos.y, 2, louButlerT, 0.85)}
          {peekBeamT > 0 && (() => {
            const srcX = VIEW_W / 2;
            const srcY = 175;
            const dstX = playerX(2);
            const dstY = PLAYER_Y + 50;
            return (
              <g opacity={peekBeamT}>
                <line x1={srcX} y1={srcY} x2={dstX} y2={dstY} stroke={CYAN} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.7} />
                <text x={(srcX + dstX) / 2} y={(srcY + dstY) / 2 - 6} fontSize={10} fontFamily="'Special Elite', monospace" fontWeight={700} fill={CYAN} textAnchor="middle" letterSpacing={2}>{t('psDemo.peek')}</text>
              </g>
            );
          })()}
        </g>
      )}

      {/* Beat 4 */}
      {ms >= BEAT4_AT && ms < BEAT5_AT && (
        <g opacity={loopFade}>
          {tomiInspectorT > 0 && tomiInspectorT < 1 && renderCardFace(tomiAccusePos.x, tomiAccusePos.y, 1, tomiInspectorT, 0.85)}
          {tomiAccuseArrowT > 0 && (() => {
            const srcX = playerX(1);
            const srcY = PLAYER_Y + 80;
            const dstX = playerX(2);
            const dstY = PLAYER_Y + 30;
            const curX = srcX + (dstX - srcX) * tomiAccuseArrowT;
            const curY = srcY + (dstY - srcY) * tomiAccuseArrowT - 30 * Math.sin(tomiAccuseArrowT * Math.PI);
            const angle = Math.atan2(dstY - srcY, dstX - srcX);
            return (
              <g>
                <line x1={srcX} y1={srcY} x2={curX} y2={curY} stroke={CRIMSON_LIGHT} strokeWidth={2.5} strokeDasharray="4 3" opacity={0.85} />
                <polygon points="0,-5 10,0 0,5" fill={CRIMSON_LIGHT} transform={`translate(${curX} ${curY}) rotate(${(angle * 180) / Math.PI})`} />
              </g>
            );
          })()}
          {ms >= BEAT4_AT + 1900 && ms < BEAT5_AT - 300 && (
            <text x={VIEW_W / 2} y={205} fontSize={12} fontFamily="'Special Elite', monospace" fontWeight={800} fill={CRIMSON_LIGHT} textAnchor="middle" letterSpacing={2}>
              "ELI IS THE MURDERER!"
            </text>
          )}
          {ms >= BEAT4_AT + 2600 && ms < BEAT5_AT - 300 && (
            <text x={VIEW_W / 2} y={225} fontSize={11} fontFamily="'Special Elite', monospace" fontWeight={800} fill={GOLD_BRIGHT} textAnchor="middle" letterSpacing={2}>
              {t('psDemo.correctArrested')}
            </text>
          )}
        </g>
      )}

      {/* Beat 5 banner */}
      {caseClosedOp > 0 && (
        <g
          transform={`translate(${VIEW_W / 2} ${VIEW_H - 30}) scale(${caseClosedT})`}
          opacity={caseClosedOp * loopFade}
        >
          <rect x={-150} y={-22} width={300} height={44} rx={5} fill={GOLD} stroke={CRIMSON} strokeWidth={3} filter="url(#ps-glow)" />
          <text y={-2} fontSize={9} fontFamily="'Special Elite', monospace" fontWeight={700} fill={CRIMSON} textAnchor="middle" letterSpacing={3}>
            DETECTIVES WIN
          </text>
          <text y={14} fontSize={16} fontFamily="'Special Elite', monospace" fontWeight={800} fill={CRIMSON} textAnchor="middle" letterSpacing={4}>
            CASE CLOSED
          </text>
        </g>
      )}
      <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="url(#gex-vignette)" pointerEvents="none" />
    </svg>
  );
};

export const primeSuspectDemoSpec: DemoSpec = {
  Component: PrimeSuspectDemo,
  durationMs: DURATION_MS,
  aspectRatio: 16 / 9,
  beats: [
    { atMs: 0, captionKey: 'explainer.prime-suspect.beat1' },
    { atMs: BEAT2_AT, captionKey: 'explainer.prime-suspect.beat2' },
    { atMs: BEAT3_AT, captionKey: 'explainer.prime-suspect.beat3' },
    { atMs: BEAT4_AT, captionKey: 'explainer.prime-suspect.beat4' },
    { atMs: BEAT5_AT, captionKey: 'explainer.prime-suspect.beat5' },
  ],
};

export default PrimeSuspectDemo;
