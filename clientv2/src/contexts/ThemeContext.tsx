/**
 * Theme Context — Prime Suspect (Heart's Gambit)
 *
 * Single fixed theme: the murder-mystery "primesuspect" royal-noir look.
 * On mount it sets `data-theme="primesuspect"` on <html>. The animated
 * noir scenery is painted by <PaperDeductionBackdrop/> (pure CSS) — there is
 * no longer a generated background image.
 */

import React, { createContext, useContext, useEffect } from 'react';

export type Theme = 'primesuspect';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Murder mystery theme for Prime Suspect
  const theme: Theme = 'primesuspect';

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

export default ThemeContext;
