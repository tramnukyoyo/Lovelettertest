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
  const tClock = useExplainerClock(demoSpec.durationMs, paused);
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

        <button
          type="button"
          className="game-explainer-skip"
          onClick={handleClose}
        >
          {t('gameExplainer.skip')}
        </button>
      </div>
    </div>,
    document.body
  );
};

export default GameExplainerModal;
