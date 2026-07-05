/* gb-juice-kit v1 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * useScreenShake — imperative screen shake. Call `shake()` on an impactful
 * event (elimination, big score) and spread `shakeClass` onto the element you
 * want to jolt. No-op (and empty class) under prefers-reduced-motion.
 */
export function useScreenShake(durationMs = 300): { shakeClass: string; shake: () => void } {
  const reduced = useReducedMotion();
  const [shaking, setShaking] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shake = useCallback(() => {
    if (reduced) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShaking(true);
    timeoutRef.current = setTimeout(() => {
      setShaking(false);
      timeoutRef.current = null;
    }, durationMs);
  }, [reduced, durationMs]);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return { shakeClass: shaking ? 'gbj-shake' : '', shake };
}

export default useScreenShake;
