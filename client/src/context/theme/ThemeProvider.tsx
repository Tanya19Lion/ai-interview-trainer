import { useLayoutEffect, useState, type ReactNode } from 'react';
import { ThemeContext, type Theme } from './ThemeContext';

const STORAGE_KEY = 'diff-theme';

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark';
}

export function resolveInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (isTheme(stored)) {
    return stored;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(resolveInitialTheme);

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  function setTheme(next: Theme) {
    localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
