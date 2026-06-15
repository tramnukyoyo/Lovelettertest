import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Drives a normalized clock value t in [0, 1) that loops every durationMs.
 *
 * One rAF source per hook call — pass the returned t to all motion children
 * of a single demo so they share a clock.
 *
 * Pauses when document.visibilityState !== 'visible' (saves CPU on bg tabs).
 * Returns 0 always when prefers-reduced-motion is set, so demos render their
 * first beat as a static frame.
 *
 * @param durationMs full loop length
 * @param paused     when true, freezes t at the current value
 */
export function useExplainerClock(durationMs: number, paused: boolean = false): number {
  const [t, setT] = useState(0);
  const tRef = useRef(0);

  useEffect(() => {
    if (paused) return;
    if (prefersReducedMotion()) {
      setT(0);
      tRef.current = 0;
      return;
    }

    let rafId = 0;
    let startMs = performance.now() - tRef.current * durationMs;

    const tick = (now: number) => {
      const elapsed = (now - startMs) % durationMs;
      const newT = elapsed / durationMs;
      tRef.current = newT;
      setT(newT);
      rafId = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
      } else {
        startMs = performance.now() - tRef.current * durationMs;
        rafId = requestAnimationFrame(tick);
      }
    };

    if (typeof document === 'undefined' || !document.hidden) {
      rafId = requestAnimationFrame(tick);
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [durationMs, paused]);

  return t;
}
