/* gb-juice-kit v1 */
import React, { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

export interface ScoreCountUpProps {
  /** Final value to land on. */
  value: number;
  /** Points gained this update — start defaults to value - delta. */
  delta?: number;
  /** Explicit start value (overrides delta). */
  from?: number;
  /** Tween duration in seconds. */
  duration?: number;
  /** Tween start delay in seconds. */
  delay?: number;
  /** Format the displayed integer (default String(Math.round(n))). */
  format?: (n: number) => string;
  className?: string;
}

/**
 * ScoreCountUp — animated count-up for a score/total, generalised from
 * Bluffalo's ScoreTicker. Give it the final `value` plus either the `delta`
 * gained (starts at value - delta) or an explicit `from`. Snaps to the final
 * value under reduced motion or when start === value.
 */
export const ScoreCountUp: React.FC<ScoreCountUpProps> = ({
  value,
  delta,
  from,
  duration = 1.1,
  delay = 0.35,
  format,
  className,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const start = from ?? value - (delta ?? 0);
  const fmt = format ?? ((n: number) => String(Math.round(n)));

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduced || start === value) {
      node.textContent = fmt(value);
      return;
    }
    const controls = animate(start, value, {
      duration,
      delay,
      ease: 'easeOut',
      onUpdate: (n) => { node.textContent = fmt(Math.round(n)); },
    });
    return () => controls.stop();
    // `fmt` intentionally excluded: an inline format fn passed each render must
    // not restart the tween.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, start, duration, delay, reduced]);

  return (
    <span ref={ref} className={className ? `gbj-count ${className}` : 'gbj-count'}>
      {fmt(start)}
    </span>
  );
};

export default ScoreCountUp;
