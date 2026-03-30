import React, { useMemo } from 'react';
import { MessageCircle, Gamepad2, Users, Video, Settings, History } from 'lucide-react';
import { getTranslation, getCurrentLanguage } from '../utils/translations';

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
    const language = getCurrentLanguage();
    const t = (key: string) => getTranslation(key as any, language);

    // Memoize tab items to prevent recreation on every render
    const tabItems = useMemo<TabItem[]>(
      () => {
        const items: TabItem[] = [
          {
            id: 'game' as const,
            label: t('bottomTab.game'),
            icon: <Gamepad2 size={20} />,
          },
          {
            id: 'players' as const,
            label: t('bottomTab.players'),
            icon: <Users size={20} />,
          },
          {
            id: 'chat' as const,
            label: t('bottomTab.chat'),
            icon: <MessageCircle size={20} />,
          },
          {
            id: 'video' as const,
            label: t('bottomTab.video'),
            icon: <Video size={20} />,
            badge: videoCount > 0 ? videoCount : undefined,
          },
          {
            id: 'settings' as const,
            label: t('bottomTab.settings'),
            icon: <Settings size={20} />,
          },
        ];

        // Only add history tab if showHistory is true
        if (showHistory) {
          items.push({
            id: 'history' as const,
            label: t('bottomTab.history'),
            icon: <History size={20} />,
          });
        }

        return items;
      },
      [showHistory, videoCount, language]
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
