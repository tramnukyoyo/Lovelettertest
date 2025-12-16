import React, { createContext, useContext, useEffect } from 'react';

export type Theme = 'think';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Only Think theme available
  const theme: Theme = 'think';

  useEffect(() => {
    // Update root element data attribute for CSS
    document.documentElement.setAttribute('data-theme', theme);
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
