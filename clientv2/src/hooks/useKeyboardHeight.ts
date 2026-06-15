/**
 * Keyboard Height Hook
 *
 * Detects virtual keyboard height on mobile devices.
 * Useful for positioning input fields above the keyboard.
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

import { useState, useEffect, useRef } from 'react';

interface KeyboardHeightState {
  keyboardHeight: number;
  isKeyboardVisible: boolean;
  viewportHeight: number;
  adjustedHeight: number;
}

export const useKeyboardHeight = (): KeyboardHeightState => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    // Keyboard height = layout viewport minus visual viewport. The layout
    // viewport (window.innerHeight) is read at event time, so orientation
    // changes don't register as a phantom keyboard.
    const measure = () => {
      const vv = window.visualViewport;
      const visualHeight = vv ? vv.height + vv.offsetTop : window.innerHeight;
      const height = Math.max(0, window.innerHeight - visualHeight);
      setKeyboardHeight(height);
      setViewportHeight(vv?.height ?? window.innerHeight);
    };

    const handleResize = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    };

    // Some browsers settle visualViewport only after focus; re-measure then.
    const handleFocusChange = () => {
      setTimeout(measure, 300);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }
    window.addEventListener('resize', handleResize);
    document.addEventListener('focusin', handleFocusChange);
    document.addEventListener('focusout', handleFocusChange);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('focusin', handleFocusChange);
      document.removeEventListener('focusout', handleFocusChange);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
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

export default useKeyboardHeight;
