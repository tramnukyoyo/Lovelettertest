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

const ScrollHint: React.FC<{ watch?: 'parent' | 'prev' }> = ({ watch = 'parent' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [canDown, setCanDown] = useState(false);
  const [canUp, setCanUp] = useState(false);

  useEffect(() => {
    const el = watch === 'prev'
      ? (ref.current?.previousElementSibling as HTMLElement | null)
      : ref.current?.parentElement;
    if (!el) return;

    const update = () => {
      setCanDown(el.scrollHeight - el.clientHeight - el.scrollTop > BOTTOM_THRESHOLD_PX);
      setCanUp(el.scrollTop > BOTTOM_THRESHOLD_PX);
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
        <span className="gs-scroll-hint-chevron">▾</span>
      </div>
      {/* The ▴ tab needs the out-of-scroller (absolute) placement; in legacy
          sticky mode it would just sit in the content flow — skip it there. */}
      {watch === 'prev' && (
        <div className={`gs-scroll-hint gs-scroll-hint-up ${canUp ? 'is-visible' : ''}`} aria-hidden="true">
          <span className="gs-scroll-hint-chevron">▴</span>
        </div>
      )}
    </>
  );
};

export default ScrollHint;
