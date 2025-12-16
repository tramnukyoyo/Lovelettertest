import { useState, useEffect, useRef } from 'react';

interface KeyboardHeightState {
  keyboardHeight: number;
  isKeyboardVisible: boolean;
  viewportHeight: number;
  adjustedHeight: number;
}

/**
 * Custom hook to detect virtual keyboard height on mobile devices
 * Useful for positioning input fields above the keyboard
 *
 * @returns KeyboardHeightState object with keyboard metrics and helper values
 *
 * @example
 * const { keyboardHeight, isKeyboardVisible, adjustedHeight } = useKeyboardHeight();
 *
 * return (
 *   <input
 *     style={{
 *       position: 'fixed',
 *       bottom: `${keyboardHeight}px`
 *     }}
 *   />
 * );
 */
export const useKeyboardHeight = (): KeyboardHeightState => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const initialHeightRef = useRef(window.innerHeight);
  const keyboardTimeoutRef = useRef<number | undefined>(undefined);

  // Detect keyboard visibility by checking viewport height changes
  useEffect(() => {
    const handleResize = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const previousHeight = initialHeightRef.current;

      // Clear any pending timeout
      if (keyboardTimeoutRef.current) {
        clearTimeout(keyboardTimeoutRef.current);
      }

      // Calculate keyboard height
      const calculatedKeyboardHeight = Math.max(0, previousHeight - currentHeight);
      setKeyboardHeight(calculatedKeyboardHeight);
      setViewportHeight(currentHeight);

      // Reset keyboard height after a delay if no more resize events
      // This helps with dismissing the keyboard
      keyboardTimeoutRef.current = setTimeout(() => {
        setKeyboardHeight(0);
      }, 500);
    };

    // Use visualViewport for better mobile detection
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => {
        if (window.visualViewport) {
          window.visualViewport.removeEventListener('resize', handleResize);
        }
        if (keyboardTimeoutRef.current) {
          clearTimeout(keyboardTimeoutRef.current);
        }
      };
    }

    // Fallback for older browsers
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (keyboardTimeoutRef.current) {
        clearTimeout(keyboardTimeoutRef.current);
      }
    };
  }, []);

  // Alternative detection using focusin/focusout events
  useEffect(() => {
    const handleFocusIn = () => {
      // Schedule a check after a small delay to let the keyboard appear
      setTimeout(() => {
        const currentHeight = window.visualViewport?.height || window.innerHeight;
        const calculatedHeight = Math.max(0, initialHeightRef.current - currentHeight);
        if (calculatedHeight > 50) {
          // Only register if keyboard is reasonably sized (>50px)
          setKeyboardHeight(calculatedHeight);
        }
      }, 300);
    };

    const handleFocusOut = () => {
      // Reset keyboard height when focus leaves input
      setKeyboardHeight(0);
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Calculate adjusted height (viewport - keyboard)
  const adjustedHeight = viewportHeight - keyboardHeight;

  return {
    keyboardHeight,
    isKeyboardVisible: keyboardHeight > 50,
    viewportHeight,
    adjustedHeight,
  };
};
