/**
 * ScrollHint — "there's more below" affordance for hidden-scrollbar panes.
 *
 * Place as the LAST child inside a scrollable container (e.g. the lobby
 * waiting cards). Renders a sticky bottom fade + bouncing ▾ that is only
 * visible while the parent has unscrolled content below the fold.
 * Styles: .gs-scroll-hint in styles/shell/stage.css.
 */

import React, { useEffect, useRef, useState } from 'react';

const BOTTOM_THRESHOLD_PX = 12;

const ScrollHint: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;

    const update = () => {
      setVisible(el.scrollHeight - el.clientHeight - el.scrollTop > BOTTOM_THRESHOLD_PX);
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
  }, []);

  return (
    <div ref={ref} className={`gs-scroll-hint ${visible ? 'is-visible' : ''}`} aria-hidden="true">
      <span className="gs-scroll-hint-chevron">▾</span>
    </div>
  );
};

export default ScrollHint;
