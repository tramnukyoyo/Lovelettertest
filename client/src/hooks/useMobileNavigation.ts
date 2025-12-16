import { useState, useCallback, useEffect, useMemo } from 'react';
import type { TabType } from '../components/BottomTabBar';

interface MobileNavigationState {
  activeTab: TabType;
  isDrawerOpen: boolean;
  drawerContent: 'players' | 'chat' | 'video' | 'settings' | 'history' | null;
  chatBadge: number;
}

interface MobileNavigationActions {
  setActiveTab: (tab: TabType) => void;
  openDrawer: (content: 'players' | 'chat' | 'video' | 'settings' | 'history') => void;
  closeDrawer: () => void;
  setChatBadge: (count: number) => void;
  clearChatBadge: () => void;
}

export const useMobileNavigation = (): MobileNavigationState & MobileNavigationActions => {
  // Split state to prevent unnecessary re-renders
  const [activeTab, setActiveTabState] = useState<TabType>('game');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerContent, setDrawerContent] = useState<'players' | 'chat' | 'video' | 'settings' | 'history' | null>(null);
  const [chatBadge, setChatBadgeState] = useState(0);

  // Memoized callback: Handle tab change
  const setActiveTab = useCallback((tab: TabType) => {
    setActiveTabState(tab);
    setIsDrawerOpen(tab !== 'game');
    setDrawerContent(
      tab === 'game'
        ? null
        : tab === 'players'
        ? 'players'
        : tab === 'video'
        ? 'video'
        : tab === 'settings'
        ? 'settings'
        : tab === 'history'
        ? 'history'
        : 'chat'
    );
  }, []);

  // Memoized callback: Open drawer with specific content
  const openDrawer = useCallback((content: 'players' | 'chat' | 'video' | 'settings' | 'history') => {
    setIsDrawerOpen(true);
    setDrawerContent(content);
    setActiveTabState(
      content === 'players' ? 'players' :
      content === 'video' ? 'video' :
      content === 'settings' ? 'settings' :
      content === 'history' ? 'history' :
      'chat'
    );
  }, []);

  // Memoized callback: Close drawer
  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setDrawerContent(null);
  }, []);

  // Memoized callback: Set chat badge count
  const setChatBadge = useCallback((count: number) => {
    setChatBadgeState(Math.max(0, count));
  }, []);

  // Memoized callback: Clear chat badge
  const clearChatBadge = useCallback(() => {
    setChatBadgeState(0);
  }, []);

  // Memoized callback: Handle escape key (only recreate if closeDrawer changes)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        closeDrawer();
      }
    },
    [isDrawerOpen, closeDrawer]
  );

  // Only update listener when drawer state changes
  useEffect(() => {
    if (isDrawerOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isDrawerOpen, handleKeyDown]);

  // Return memoized object to prevent reference changes
  // Only include state values in dependencies, not callbacks (they're already memoized)
  return useMemo(
    () => ({
      activeTab,
      isDrawerOpen,
      drawerContent,
      chatBadge,
      setActiveTab,
      openDrawer,
      closeDrawer,
      setChatBadge,
      clearChatBadge,
    }),
    [
      activeTab,
      isDrawerOpen,
      drawerContent,
      chatBadge,
      // Callbacks are memoized with useCallback and don't need to be in dependencies
    ]
  );
};
