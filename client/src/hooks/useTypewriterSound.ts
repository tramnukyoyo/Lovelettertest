import { useCallback } from 'react';
import { playTypewriterSound } from '../utils/soundEffects';

/**
 * Hook that provides an onKeyDown handler for typewriter sound effects.
 * Plays a random typewriter key sound on each keypress.
 */
export const useTypewriterSound = () => {
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Only play for printable characters, backspace, space
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === ' ') {
      playTypewriterSound();
    }
  }, []);

  return { onKeyDown: handleKeyDown };
};
