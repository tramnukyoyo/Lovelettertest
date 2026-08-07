/**
 * SidebarTabs - Reusable tabs for sidebar content switching
 * Used by both LobbyPage and GamePage for Players/Chat tabs
 */

import React, { useCallback } from 'react';
import { t } from '../../utils/translations';
import ScrollHint from '../../shell/ScrollHint';

/* Owner rule: no emoji as UI chrome. The two rail tabs used 👥 / 💬, which
   rendered as full-colour system glyphs on a candlelit velvet bar. These are
   line-art stand-ins drawn in currentColor so they inherit the tab's
   inactive/active gold. */
const SuspectsIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor"
    strokeWidth="1.3" strokeLinecap="square" aria-hidden="true" focusable="false">
    <circle cx="6" cy="5" r="2.6" />
    <path d="M1.6 14c0-2.5 2-4.2 4.4-4.2S10.4 11.5 10.4 14" />
    <path d="M11 3.1a2.4 2.4 0 0 1 0 4.6M12.2 9.9c1.4.5 2.4 2 2.4 4.1" />
  </svg>
);

const CaseNotesIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor"
    strokeWidth="1.3" strokeLinecap="square" aria-hidden="true" focusable="false">
    <path d="M2.2 2.4h11.6v8.4H7.6L4.3 13.6v-2.8H2.2z" />
    <path d="M4.9 5.6h6.2M4.9 8h4.2" />
  </svg>
);

export type SidebarTab = 'players' | 'chat';

interface SidebarTabsProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  playerCount: number;
  unreadCount?: number;
  children: React.ReactNode;
}

const SidebarTabs: React.FC<SidebarTabsProps> = ({
  activeTab,
  onTabChange,
  playerCount,
  unreadCount = 0,
  children,
}) => {
  // Stable callbacks to prevent child rerenders
  const handlePlayersTab = useCallback(() => onTabChange('players'), [onTabChange]);
  const handleChatTab = useCallback(() => onTabChange('chat'), [onTabChange]);

  return (
    <div className="sidebar-tabs-container">
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${activeTab === 'players' ? 'active' : ''}`}
          onClick={handlePlayersTab}
        >
          <span className="tab-icon"><SuspectsIcon /></span>
          <span className="tab-label">{t('lobby.players')}</span>
          <span className="tab-count">{playerCount}</span>
        </button>
        <button
          className={`sidebar-tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={handleChatTab}
        >
          <span className="tab-icon"><CaseNotesIcon /></span>
          <span className="tab-label">{t('lobby.chat')}</span>
          {unreadCount > 0 && activeTab !== 'chat' && (
            <span className="tab-badge">{unreadCount}</span>
          )}
        </button>
      </div>
      {/* The roster is the scroller (shell.css: .gs-rail .sidebar-content), so
          the fleet ScrollHint mounts as its LAST child — the ▾ tab appears
          whenever the crew list runs past the fold and pages it ±0.7×height.
          Chat owns its own internal scroll, so the hint would never fire
          there. */}
      <div className="sidebar-content">
        {children}
        {activeTab === 'players' && <ScrollHint />}
      </div>
    </div>
  );
};

export default React.memo(SidebarTabs);
