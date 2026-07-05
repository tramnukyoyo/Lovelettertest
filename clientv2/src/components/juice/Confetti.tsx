/* gb-juice-kit v1 */
import React, { useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

export interface ConfettiProps {
  count?: number;
  colors?: string[];
  durationMs?: number;
  mode?: 'rain' | 'burst';
  /** Burst origin as viewport percentages (default centre). */
  origin?: { xPct: number; yPct: number };
  onDone?: () => void;
}

// Shared palette from the existing LetterRush / HeartsGambit implementations.
const DEFAULT_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#ef4444', '#f59e0b'];

interface Piece {
  id: number;
  color: string;
  size: number;
  left: number;
  top: number;
  duration: number;
  delay: number;
  dx: number;
  dy: number;
  rotate: number;
}

/**
 * Confetti — asset-free celebratory particles. Consolidates the hand-rolled
 * LetterRush / HeartsGambit confetti into one component with a `rain` (fall
 * from top) and a `burst` (radial pop from origin) mode. Mount-based: renders
 * particles immediately and auto-unmounts after durationMs. Renders null under
 * reduced motion (still calls onDone). Namespaced classes avoid colliding with
 * the legacy `.confetti-container`.
 */
export const Confetti: React.FC<ConfettiProps> = ({
  count = 50,
  colors = DEFAULT_COLORS,
  durationMs = 3500,
  mode = 'rain',
  origin = { xPct: 50, yPct: 50 },
  onDone,
}) => {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(true);

  const pieces = useMemo<Piece[]>(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 120 + Math.random() * 220;
      return {
        id: i,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 6,
        left: mode === 'burst' ? origin.xPct : Math.random() * 100,
        top: mode === 'burst' ? origin.yPct : -5,
        duration: mode === 'burst' ? 0.8 + Math.random() * 0.7 : 2 + Math.random() * 1.5,
        delay: mode === 'burst' ? Math.random() * 0.08 : Math.random() * 0.5,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        rotate: Math.random() * 720 - 360,
      };
    });
    // Regenerate only when the visual inputs change; `colors` is intentionally
    // excluded so an inline array prop can't reshuffle particles mid-flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, mode, origin.xPct, origin.yPct]);

  useEffect(() => {
    if (reduced) {
      const t = setTimeout(() => onDone?.(), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, durationMs);
    return () => clearTimeout(t);
    // `onDone` excluded — a new closure each render must not restart the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, durationMs]);

  if (reduced || !visible) return null;

  return (
    <div className="gbj-confetti-container" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className={`gbj-confetti-particle ${mode === 'burst' ? 'is-burst' : 'is-rain'}`}
          style={{
            left: `${p.left}%`,
            top: mode === 'burst' ? `${p.top}%` : undefined,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            ['--gbj-dx' as string]: `${p.dx}px`,
            ['--gbj-dy' as string]: `${p.dy}px`,
            ['--gbj-rot' as string]: `${p.rotate}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

export default Confetti;
