/**
 * Keyboard Height Hook
 *
 * Detects the virtual-keyboard height on mobile and, just as importantly, pins
 * the app's viewport height to a reliable JS-measured value.
 *
 * iOS Safari (WebKit) mismanages raw `100dvh` and `visualViewport` after the
 * on-screen keyboard or URL bar changes: the values settle late / short, so the
 * full-height app container ends up shorter than the screen and a band of page
 * background shows at the bottom. (Chromium — Brave/Chrome on Android/desktop —
 * doesn't have this.) The app-root CSS reads `var(--dvh-adjusted)` /
 * `var(--vh-adjusted)`; we set those from `window.innerHeight` (the layout
 * viewport, which stays correct) and re-measure on every relevant event, with a
 * scroll-flush after blur to clear Safari's stale offset.
 *
 * @example
 * const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();
 */

import { useState, useEffect, useRef } from 'react';

interface KeyboardHeightState {
  keyboardHeight: number;
  isKeyboardVisible: boolean;
  viewportHeight: number;
  adjustedHeight: number;
}

/** A text field is focused → the keyboard can legitimately be open. */
const isEditing = (): boolean => {
  const ae = document.activeElement as HTMLElement | null;
  return (
    !!ae &&
    (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)
  );
};

export const useKeyboardHeight = (): KeyboardHeightState => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const measure = () => {
      const vv = window.visualViewport;
      const fullH = window.innerHeight;

      // Pin the app height to a reliable value (fixes the iOS Safari 100dvh gap).
      const el = document.documentElement;
      el.style.setProperty('--vh-adjusted', `${fullH}px`);
      el.style.setProperty('--dvh-adjusted', `${fullH}px`);

      // Keyboard inset only while a field is focused. iOS leaves visualViewport
      // slightly short after dismiss; without this guard that residual kept
      // GameShell's .gs-kb-open margin-bottom and showed a bottom background band.
      if (!isEditing()) {
        setKeyboardHeight(0);
        setViewportHeight(vv?.height ?? fullH);
        return;
      }

      const visualHeight = vv ? vv.height + vv.offsetTop : fullH;
      const height = Math.max(0, fullH - visualHeight);
      setKeyboardHeight(height);
      setViewportHeight(vv?.height ?? fullH);
    };

    const handleResize = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    };

    // visualViewport settles late after focus/blur on iOS — re-measure after a
    // beat, and nudge the scroll to flush Safari's stale viewport offset.
    const handleFocusChange = () => {
      setTimeout(() => {
        measure();
        if (!isEditing()) window.scrollTo(0, 0);
      }, 300);
    };

    measure();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    }
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    document.addEventListener('focusin', handleFocusChange);
    document.addEventListener('focusout', handleFocusChange);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      document.removeEventListener('focusin', handleFocusChange);
      document.removeEventListener('focusout', handleFocusChange);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const adjustedHeight = viewportHeight - keyboardHeight;

  return {
    keyboardHeight,
    isKeyboardVisible: keyboardHeight > 50,
    viewportHeight,
    adjustedHeight,
  };
};

export default useKeyboardHeight;
