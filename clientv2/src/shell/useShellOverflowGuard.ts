/**
 * Dev-only stage overflow sentinel. The GameShell stage must never scroll
 * (fit is designed-in); if a scene's content overflows the stage box this
 * logs a console warning so regressions surface during development.
 * No-op in production builds.
 */
import { useEffect, useRef } from 'react';

export function useShellOverflowGuard() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const check = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // The ≤420px-tall ladder step sanctions internal scroll — skip then.
        if (el.clientHeight <= 420) return;
        const inner = el.firstElementChild as HTMLElement | null;
        const target = inner ?? el;
        if (target.scrollHeight > target.clientHeight + 1) {
          console.warn(
            `[GameShell] stage overflow: content ${target.scrollHeight}px > stage ${target.clientHeight}px — fix the scene's fit (see styles/shell/stage.css ladder)`
          );
        }
      });
    };

    const ro = new ResizeObserver(check);
    ro.observe(el);
    const mo = new MutationObserver(check);
    mo.observe(el, { childList: true, subtree: true });
    check();

    return () => {
      ro.disconnect();
      mo.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return ref as React.RefObject<HTMLElement | null>;
}
