import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useExplainerClock } from './useExplainerClock';
import { closeExplainer } from './explainerStore';
import type { DemoSpec } from './types';
import useFocusTrap from '../../../hooks/useFocusTrap';

interface Props {
  gameId: string;
  demoSpec: DemoSpec;
  /** Translate caption keys. Pass project's t() helper from utils/gameTranslations. */
  t: (key: string) => string;
  /** Auto-close after one full loop if user doesn't interact. Default true. */
  autoCloseOnLoop?: boolean;
  /** Called whenever the modal closes (used by orchestrator to stamp localStorage). */
  onClose?: () => void;
}

const prefersReduced = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const GameExplainerModal: React.FC<Props> = ({
  gameId,
  demoSpec,
  t,
  autoCloseOnLoop = true,
  onClose,
}) => {
  const [paused, setPaused] = useState(false);
  // Manual seek channel for the NEXT control (see useExplainerClock).
  const seekRef = useRef<number | null>(null);
  const tClock = useExplainerClock(demoSpec.durationMs, paused, seekRef);
  const reducedMotion = prefersReduced();
  const lastTRef = useRef(0);
  const closedRef = useRef(false);

  const handleClose = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    closeExplainer(gameId);
    onClose?.();
  };

  const { containerRef } = useFocusTrap<HTMLDivElement>({
    isActive: true,
    onEscape: () => handleClose(),
    closeOnEscape: true,
    autoFocus: true,
  });

  // Auto-close after exactly one full loop (detect when t wraps from ~1 to ~0)
  useEffect(() => {
    if (!autoCloseOnLoop || reducedMotion) return;
    if (lastTRef.current > 0.95 && tClock < 0.05) {
      handleClose();
    }
    lastTRef.current = tClock;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tClock, autoCloseOnLoop, reducedMotion]);

  // Keyboard: Space toggles pause. Esc handled by useFocusTrap.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Determine current beat (linear scan of small array)
  const elapsedMs = tClock * demoSpec.durationMs;
  let activeBeat = demoSpec.beats[0];
  for (const b of demoSpec.beats) {
    if (b.atMs <= elapsedMs) activeBeat = b;
    else break;
  }

  const Demo = demoSpec.Component;
  // Step pips: without them the reader cannot tell how long the briefing is.
  const activeBeatIndex = Math.max(0, demoSpec.beats.indexOf(activeBeat));
  const isLastBeat = activeBeatIndex >= demoSpec.beats.length - 1;

  /**
   * Forward affordance. The briefing had five pips and a SKIP and nothing that
   * said "advance" — a reader who already understood a beat could only wait
   * out the clock. NEXT seeks to the following beat; on the last beat it opens
   * the case (i.e. dismisses the briefing), so the two ends of the row are
   * "leave now" and "carry on", never two ways of quitting.
   */
  const handleNext = () => {
    if (isLastBeat) {
      handleClose();
      return;
    }
    const next = demoSpec.beats[activeBeatIndex + 1];
    // +1ms so the beat scan lands ON the next beat, never a rounding tick short.
    seekRef.current = Math.min(0.999, (next.atMs + 1) / demoSpec.durationMs);
  };

  return createPortal(
    <div
      className="game-explainer-overlay"
      onClick={handleClose}
      role="presentation"
    >
      <div
        ref={containerRef}
        className="game-explainer-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-explainer-caption"
      >
        <button
          type="button"
          className="game-explainer-close"
          onClick={handleClose}
          aria-label="Close how-to-play"
        >
          <X size={20} />
        </button>

        <div
          className="game-explainer-stage"
          style={{ aspectRatio: demoSpec.aspectRatio }}
        >
          <Demo t={tClock} />
        </div>

        <div className="game-explainer-caption-strip">
          {reducedMotion ? (
            <ul className="game-explainer-captions-list">
              {demoSpec.beats.map((b) => (
                <li key={b.captionKey}>{t(b.captionKey)}</li>
              ))}
            </ul>
          ) : (
            <AnimatePresence mode="wait">
              <motion.p
                key={activeBeat.captionKey}
                id="game-explainer-caption"
                className="game-explainer-caption"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
              >
                {t(activeBeat.captionKey)}
              </motion.p>
            </AnimatePresence>
          )}
        </div>

        {/* Navigation row: quiet SKIP · step pips · gold NEXT. The pips used to
            float on their own line above a lone right-aligned SKIP, so the only
            control in the briefing was a way OUT of it. */}
        <div className="game-explainer-footer game-explainer-nav">
          <button
            type="button"
            className="game-explainer-skip"
            onClick={handleClose}
          >
            {t('gameExplainer.skip')}
          </button>

          {/* Candlelit step pips — how many beats there are, and where we are. */}
          {!reducedMotion && demoSpec.beats.length > 1 ? (
            <div className="game-explainer-pips" aria-hidden="true">
              {demoSpec.beats.map((b, i) => (
                <span
                  key={b.captionKey}
                  className={`game-explainer-pip${i === activeBeatIndex ? ' is-active' : ''}`}
                />
              ))}
            </div>
          ) : (
            <span className="game-explainer-nav-spacer" aria-hidden="true" />
          )}

          {!reducedMotion && demoSpec.beats.length > 1 && (
            <button
              type="button"
              className="game-explainer-next"
              onClick={handleNext}
            >
              {isLastBeat ? t('gameExplainer.openCase') : t('common.next')}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GameExplainerModal;
