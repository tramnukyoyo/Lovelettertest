import React, { createContext, useContext, useEffect } from 'react';

export type Theme = 'heartsgambit';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Royal Romance theme for Hearts Gambit
  const theme: Theme = 'heartsgambit';

  useEffect(() => {
    // Update root element data attribute for CSS
    document.documentElement.setAttribute('data-theme', theme);

    // Theme-scoped assets (works with BASE_URL deployments)
    const base = import.meta.env.BASE_URL || '/';
    document.documentElement.style.setProperty('--hg-bg-image', `url("${base}Background.webp")`);
  }, []);

  const setTheme = (_newTheme: Theme) => {
    // No-op: only one theme available
  };

  const toggleTheme = () => {
    // No-op: only one theme available
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
