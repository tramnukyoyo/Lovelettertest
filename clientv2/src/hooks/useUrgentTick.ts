/* gb-juice-kit v1 */
import { useEffect, useRef } from 'react';
import { synthSfx } from '../utils/audio/synthSfx';

/**
 * useUrgentTick — reports whether a countdown is in its urgent window
 * (0 < seconds <= threshold) and, while it is, plays a soft urgent tick at most
 * once per distinct integer second. Drive urgency styling off the returned bool
 * (e.g. toggle `.gbj-timer-urgent`); the sound self-throttles and honours the
 * SFX settings via synthSfx.
 */
export function useUrgentTick(
  secondsRemaining: number | null | undefined,
  opts?: { threshold?: number; sound?: boolean }
): boolean {
  const threshold = opts?.threshold ?? 10;
  const sound = opts?.sound !== false;
  const lastTickSecond = useRef<number | null>(null);

  const s = typeof secondsRemaining === 'number' ? secondsRemaining : null;
  const isUrgent = s != null && s > 0 && s <= threshold;

  useEffect(() => {
    if (!isUrgent || s == null) {
      lastTickSecond.current = null; // reset when leaving urgency
      return;
    }
    const whole = Math.ceil(s);
    if (lastTickSecond.current === whole) return;
    lastTickSecond.current = whole;
    if (sound) synthSfx.tickUrgent();
  }, [isUrgent, s, sound]);

  return isUrgent;
}

export default useUrgentTick;
