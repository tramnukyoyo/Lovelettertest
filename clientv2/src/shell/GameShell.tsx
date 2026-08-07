/**
 * GameShell — universal viewport-fit layout root.
 *
 * Grid:  hud / stage+rail / dock+rail. The video filmstrip remains an
 * app-root flex sibling BELOW the shell; when it grows, the shell shrinks
 * and the stage's container queries adapt the content (stage.css).
 *
 * Slots: hud (GameHeader + banners), rail (chat/players, desktop ≥1024px,
 * collapsible), dock (PresenceDock), children (the active scene).
 *
 * Copy-paste contract for other game clients: see src/shell/README.md.
 */
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useShellOverflowGuard } from './useShellOverflowGuard';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { useIsMobile } from '../hooks/useIsMobile';
import { t } from '../utils/translations';

const RAIL_COLLAPSED_KEY = 'gs_rail_collapsed';

interface GameShellProps {
  hud: React.ReactNode;
  rail?: React.ReactNode;
  dock?: React.ReactNode;
  /** Unread count shown on the collapsed-rail edge tab. */
  railUnread?: number;
  /** Label on the collapsed-rail edge tab (e.g. t('chat.title')). */
  railLabel?: string;
  /** In-game only (GamePage passes it): enable mobile immersive auto-hide of header+dock. */
  chromeAutoHide?: boolean;
  children: React.ReactNode;
}

const GameShell: React.FC<GameShellProps> = ({
  hud,
  rail,
  dock,
  railUnread = 0,
  // railLabel is accepted for API compatibility but the collapsed-rail tab now
  // shows a hide/show chevron instead of a text label.
  chromeAutoHide = false,
  children,
}) => {
  const [railCollapsed, setRailCollapsed] = useState(
    () => localStorage.getItem(RAIL_COLLAPSED_KEY) === '1'
  );

  // F11 browser-fullscreen: auto-collapse the rail so the stage goes immersive
  // together with the vanished browser chrome (owner). F11 fires NO
  // fullscreenchange (browser- not element-fullscreen), so detect it via
  // viewport === screen on resize. The previous rail state is restored on
  // exit; the localStorage preference is never touched (only toggleRail
  // persists). Manual re-open inside fullscreen stays possible via the tab.
  const railBeforeFullscreenRef = useRef<boolean | null>(null);
  useEffect(() => {
    const check = () => {
      const fs = window.innerHeight === window.screen.height
        && window.innerWidth === window.screen.width;
      if (fs && railBeforeFullscreenRef.current === null) {
        railBeforeFullscreenRef.current = railCollapsed;
        setRailCollapsed(true);
      } else if (!fs && railBeforeFullscreenRef.current !== null) {
        setRailCollapsed(railBeforeFullscreenRef.current);
        railBeforeFullscreenRef.current = null;
      }
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [railCollapsed]);

  const stageRef = useShellOverflowGuard();

  // On-screen keyboard compensation: shrink the shell by the keyboard height
  // and hide the dock so SceneActions (submit buttons) stay visible above the
  // keyboard. iOS Safari does NOT shrink the layout viewport (100dvh) when the
  // keyboard opens — without this the bottom of the stage sits under the keys.
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();

  // Mobile immersive mode: on phones (≤1024px) the top header AND the bottom
  // presence dock are HIDDEN by default while in-game so the stage gets the full
  // screen. A floating toggle (▾ reveal / ▴ hide) brings them back together — the
  // header carries the menu (settings / leave / chat), so the toggle must always
  // be reachable. Desktop (≥1024px) is unaffected: everything stays visible.
  const isMobile = useIsMobile();
  const [chromeHidden, setChromeHidden] = useState(true);
  const immersive = isMobile && chromeAutoHide && chromeHidden;

  const toggleRail = useCallback(() => {
    setRailCollapsed(prev => {
      localStorage.setItem(RAIL_COLLAPSED_KEY, prev ? '0' : '1');
      return !prev;
    });
  }, []);

  return (
    <div
      className={`gs-shell ${railCollapsed ? 'gs-rail-collapsed' : ''} ${
        (isKeyboardVisible ? 'gs-kb-open' : '') + (immersive ? ' gs-immersive' : '')
      }`}
      style={
        isKeyboardVisible
          ? ({ '--gs-keyboard-inset': `${keyboardHeight}px` } as React.CSSProperties)
          : undefined
      }
    >
      <div className="gs-hud-wrap">{hud}</div>

      <main className="gs-stage" ref={stageRef}>
        {children}
      </main>

      {/* Fleet standard: the edge arrow tab (.gs-rail-collapse-btn) is the ONLY
          collapse control — the in-rail strip is gone. It is dropped from the DOM
          rather than hidden in shell.css because the prime-suspect theme layer
          loads last and forces `.gs-rail-hide-btn { display: inline-flex !important }`
          (styles/game/prime-suspect-ingame.css icon tier), which no rule in this
          layer can beat without an out-specificity hack. */}
      {rail && <aside className="gs-rail">{rail}</aside>}

      {rail && (
        <button
          type="button"
          className="gs-rail-collapse-btn"
          onClick={toggleRail}
          aria-label={railCollapsed ? t('shell.showSidebar') : t('shell.hideSidebar')}
          title={railCollapsed ? t('shell.showSidebar') : t('shell.hideSidebar')}
        >
          <span className="gs-rail-collapse-icon" aria-hidden="true">
            {railCollapsed ? '◂' : '▸'}
          </span>
          {railUnread > 0 && <span className="gs-unread">{railUnread}</span>}
        </button>
      )}

      {dock && <div className="gs-dock">{dock}</div>}

      {/* Mobile-only chrome toggle: reveal/hide the header + dock together. Always
          on top so the menu (in the header) stays reachable while immersive. */}
      {isMobile && chromeAutoHide && (
        <button
          type="button"
          className={`gs-chrome-toggle ${chromeHidden ? 'is-hidden' : 'is-shown'}`}
          onClick={() => setChromeHidden(prev => !prev)}
          aria-label={chromeHidden ? t('shell.showMenu') : t('shell.hideMenu')}
          title={chromeHidden ? t('shell.showMenu') : t('shell.hideMenu')}
          aria-pressed={!chromeHidden}
        >
          <span className="gs-chrome-toggle-icon" aria-hidden="true">
            {chromeHidden ? '▾' : '▴'}
          </span>
        </button>
      )}
    </div>
  );
};

export default GameShell;
