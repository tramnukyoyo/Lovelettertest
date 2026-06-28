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
import React, { useCallback, useState } from 'react';
import { useShellOverflowGuard } from './useShellOverflowGuard';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { useIsMobile } from '../hooks/useIsMobile';

const RAIL_COLLAPSED_KEY = 'gs_rail_collapsed';

interface GameShellProps {
  hud: React.ReactNode;
  rail?: React.ReactNode;
  dock?: React.ReactNode;
  /** Unread count shown on the collapsed-rail edge tab. */
  railUnread?: number;
  /** Label on the collapsed-rail edge tab (e.g. t('chat.title')). */
  railLabel?: string;
  children: React.ReactNode;
}

const GameShell: React.FC<GameShellProps> = ({
  hud,
  rail,
  dock,
  railUnread = 0,
  // railLabel is accepted for API compatibility but the collapsed-rail tab now
  // shows a hide/show chevron instead of a text label.
  children,
}) => {
  const [railCollapsed, setRailCollapsed] = useState(
    () => localStorage.getItem(RAIL_COLLAPSED_KEY) === '1'
  );

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
  const immersive = isMobile && chromeHidden;

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

      {rail && (
        <aside className="gs-rail">
          <button
            type="button"
            className="gs-rail-hide-btn"
            onClick={toggleRail}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            ▸
          </button>
          {rail}
        </aside>
      )}

      {rail && (
        <button
          type="button"
          className="gs-rail-collapse-btn"
          onClick={toggleRail}
          aria-label={railCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          title={railCollapsed ? 'Show sidebar' : 'Hide sidebar'}
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
      {isMobile && (
        <button
          type="button"
          className={`gs-chrome-toggle ${chromeHidden ? 'is-hidden' : 'is-shown'}`}
          onClick={() => setChromeHidden(prev => !prev)}
          aria-label={chromeHidden ? 'Show menu' : 'Hide menu'}
          title={chromeHidden ? 'Show menu' : 'Hide menu'}
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
