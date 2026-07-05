/* gb-juice-kit v1 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { synthSfx } from '../../utils/audio/synthSfx';

export interface RoundInterstitialProps {
  /** Fires the interstitial whenever this changes to a new non-null value. */
  trigger: string | number | null | undefined;
  title: string;
  subtitle?: string;
  /** ms the card holds before auto-dismiss (default 1600). */
  durationMs?: number;
  /** Play the phase-change cue when shown (default true). */
  playSfx?: boolean;
  /** Never fire for the value present on first mount — reconnect safety (default true). */
  skipFirst?: boolean;
  onDone?: () => void;
  className?: string;
}

// Sentinel so a skipFirst=false first render still fires for a real trigger.
const NONE = Symbol('gbj-interstitial-none');

/**
 * RoundInterstitial — a brief full-screen "Round N" / phase card that flashes
 * when `trigger` changes. `skipFirst` (default) stops a rejoining player from
 * getting a replay of the phase they reconnected into. Motion is transform +
 * opacity only (no backdrop-filter); reduced motion collapses to a plain fade.
 */
export const RoundInterstitial: React.FC<RoundInterstitialProps> = ({
  trigger,
  title,
  subtitle,
  durationMs = 1600,
  playSfx = true,
  skipFirst = true,
  onDone,
  className,
}) => {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const seenRef = useRef<string | number | null | undefined | typeof NONE>(skipFirst ? trigger : NONE);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (trigger == null) return;
    if (trigger === seenRef.current) return;
    seenRef.current = trigger;

    setVisible(true);
    if (playSfx) synthSfx.phaseChange();

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const hold = reduced ? 500 : durationMs;
    timeoutRef.current = setTimeout(() => {
      setVisible(false);
      timeoutRef.current = null;
      onDone?.();
    }, hold);
    // `onDone` intentionally excluded so a parent re-render doesn't re-arm the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, durationMs, playSfx, reduced]);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          className={className ? `gbj-interstitial ${className}` : 'gbj-interstitial'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.25 : 0.35 }}
        >
          {reduced ? (
            <div className="gbj-interstitial-title">{title}</div>
          ) : (
            <motion.div
              className="gbj-interstitial-title"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            >
              {title}
            </motion.div>
          )}
          {subtitle && <div className="gbj-interstitial-sub">{subtitle}</div>}
          {!reduced && (
            <motion.div
              className="gbj-interstitial-bar"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default RoundInterstitial;
