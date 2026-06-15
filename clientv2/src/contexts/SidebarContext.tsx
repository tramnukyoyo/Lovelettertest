/**
 * Sidebar Context
 *
 * Manages the desktop sidebar collapse state with localStorage persistence.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { STORAGE_KEYS } from '../config/storageKeys';

interface SidebarContextValue {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOCAL.SIDEBAR_COLLAPSED);
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOCAL.SIDEBAR_COLLAPSED, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const toggleSidebar = useCallback(() => setIsSidebarCollapsed(prev => !prev), []);
  const collapseSidebar = useCallback(() => setIsSidebarCollapsed(true), []);
  const expandSidebar = useCallback(() => setIsSidebarCollapsed(false), []);

  return (
    <SidebarContext.Provider value={{ isSidebarCollapsed, toggleSidebar, collapseSidebar, expandSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
};

export default SidebarContext;
