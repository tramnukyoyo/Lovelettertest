/**
 * ScrollHint — "there's more below" affordance for hidden-scrollbar panes.
 *
 * Default (`watch="parent"`): place as the LAST child inside a scrollable
 * container. Renders a sticky bottom fade + bouncing ▾ that is only visible
 * while the parent has unscrolled content below the fold.
 * `watch="prev"`: place as the SIBLING right after the scrollable element —
 * lets the hint live outside the scroller's clip (e.g. absolutely positioned
 * on the lobby card so the ▾ can straddle the card's border).
 * Styles: .gs-scroll-hint in styles/shell/stage.css.
 */

import React, { useEffect, useRef, useState } from 'react';

const BOTTOM_THRESHOLD_PX = 12;

/**
 * A hint may only arm on an element the browser will actually scroll.
 * `scrollHeight > clientHeight` is true for plain `overflow: visible` boxes
 * too — GameShell now mounts a stage-level hint whose scroller is only a
 * scroller below the rail breakpoint, and without this test the ▾ would paint
 * on desktop as a control whose click does nothing.
 */
const isScrollable = (el: HTMLElement) => {
  const oy = getComputedStyle(el).overflowY;
  return oy === 'auto' || oy === 'scroll' || oy === 'overlay';
};

const ScrollHint: React.FC<{ watch?: 'parent' | 'prev' }> = ({ watch = 'parent' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLElement | null>(null);
  const [canDown, setCanDown] = useState(false);
  const [canUp, setCanUp] = useState(false);

  // Fleet standard (owner): the chevrons are also CONTROLS — touch/no-wheel
  // users can tap them to page through the pane. Redundant affordance inside an
  // aria-hidden wrapper, so these stay plain spans: a <button> here would be
  // focusable-inside-aria-hidden AND would inherit the global `button` baseline
  // (prime-suspect-unified.css) that repaints the amber pixel tab as a padded
  // accent pill.
  const page = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const reduce = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ top: dir * el.clientHeight * 0.7, behavior: reduce ? 'auto' : 'smooth' });
  };

  useEffect(() => {
    const el = watch === 'prev'
      ? (ref.current?.previousElementSibling as HTMLElement | null)
      : ref.current?.parentElement;
    scrollerRef.current = el ?? null;
    if (!el) return;

    const update = () => {
      const scrollable = isScrollable(el);
      setCanDown(scrollable
        && el.scrollHeight - el.clientHeight - el.scrollTop > BOTTOM_THRESHOLD_PX);
      setCanUp(scrollable && el.scrollTop > BOTTOM_THRESHOLD_PX);
    };

    update();
    el.addEventListener('scroll', update, { passive: true });

    const ro = new ResizeObserver(update);
    ro.observe(el);

    // Async children (the explainer demo loads late) change scrollHeight
    // without resizing the pane. childList only — attribute mutations from
    // the animated SVG demo would fire at 60fps.
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true });

    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
      mo.disconnect();
    };
  }, [watch]);

  return (
    <>
      {/* ref must stay on the FIRST element: `watch="prev"` resolves the
          scroller via previousElementSibling. */}
      <div ref={ref} className={`gs-scroll-hint ${canDown ? 'is-visible' : ''}`} aria-hidden="true">
        <span className="gs-scroll-hint-chevron" onClick={() => page(1)}>▾</span>
      </div>
      {/* The ▴ tab needs the out-of-scroller (absolute) placement; in legacy
          sticky mode it would just sit in the content flow — skip it there. */}
      {watch === 'prev' && (
        <div className={`gs-scroll-hint gs-scroll-hint-up ${canUp ? 'is-visible' : ''}`} aria-hidden="true">
          <span className="gs-scroll-hint-chevron" onClick={() => page(-1)}>▴</span>
        </div>
      )}
    </>
  );
};

export default ScrollHint;
