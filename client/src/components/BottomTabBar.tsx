import React, { useMemo } from 'react';
import { MessageCircle, Gamepad2, Users, Video, Settings, History } from 'lucide-react';

export type TabType = 'game' | 'players' | 'chat' | 'video' | 'settings' | 'history';

interface TabItem {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface BottomTabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  className?: string;
  showHistory?: boolean;
  videoCount?: number;
}

export const BottomTabBar = React.memo<BottomTabBarProps>(
  ({ activeTab, onTabChange, className = '', showHistory = false, videoCount = 0 }) => {
    // Memoize tab items to prevent recreation on every render
    const tabItems = useMemo<TabItem[]>(
      () => {
        const items: TabItem[] = [
          {
            id: 'game' as const,
            label: 'Game',
            icon: <Gamepad2 className="w-5 h-5" />,
          },
          {
            id: 'players' as const,
            label: 'Players',
            icon: <Users className="w-5 h-5" />,
          },
          {
            id: 'chat' as const,
            label: 'Chat',
            icon: <MessageCircle className="w-5 h-5" />,
          },
          {
            id: 'video' as const,
            label: 'Video',
            icon: <Video className="w-5 h-5" />,
            badge: videoCount > 0 ? videoCount : undefined,
          },
          {
            id: 'settings' as const,
            label: 'Settings',
            icon: <Settings className="w-5 h-5" />,
          },
        ];

        // Only add history tab if showHistory is true
        if (showHistory) {
          items.push({
            id: 'history' as const,
            label: 'History',
            icon: <History className="w-5 h-5" />,
          });
        }

        return items;
      },
      [showHistory, videoCount]
    );

    return (
      <nav className={`bottom-tab-bar ${className}`}>
        <ul className="bottom-tab-list">
          {tabItems.map((tab) => (
            <li key={tab.id} className="bottom-tab-item">
              <button
                className={`bottom-tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => onTabChange(tab.id)}
                aria-label={tab.label}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="tab-badge">{tab.badge}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if these props change
    return (
      prevProps.activeTab === nextProps.activeTab &&
      prevProps.className === nextProps.className &&
      prevProps.showHistory === nextProps.showHistory &&
      prevProps.videoCount === nextProps.videoCount &&
      prevProps.onTabChange === nextProps.onTabChange
    );
  }
);
