/**
 * Hook to play typewriter sounds on text input
 *
 * Usage:
 * const handleKeyDown = useTypewriterSound();
 * <input onKeyDown={handleKeyDown} />
 */

import { useCallback } from 'react';
import { soundEffects } from '../utils/audio';

export const useTypewriterSound = () => {
  return useCallback((e: React.KeyboardEvent | KeyboardEvent) => {
    // Only play for printable characters, backspace, and enter
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') {
      soundEffects.playTypewriter();
    }
  }, []);
};

export default useTypewriterSound;
