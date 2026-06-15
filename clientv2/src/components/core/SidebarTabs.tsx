/**
 * SidebarTabs - Reusable tabs for sidebar content switching
 * Used by both LobbyPage and GamePage for Players/Chat tabs
 */

import React, { useCallback } from 'react';
import { t } from '../../utils/translations';

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
          <span className="tab-icon">👥</span>
          <span className="tab-label">{t('lobby.players')}</span>
          <span className="tab-count">{playerCount}</span>
        </button>
        <button
          className={`sidebar-tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={handleChatTab}
        >
          <span className="tab-icon">💬</span>
          <span className="tab-label">{t('lobby.chat')}</span>
          {unreadCount > 0 && activeTab !== 'chat' && (
            <span className="tab-badge">{unreadCount}</span>
          )}
        </button>
      </div>
      <div className="sidebar-content">
        {children}
      </div>
    </div>
  );
};

export default React.memo(SidebarTabs);
