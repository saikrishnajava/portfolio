import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const THEME_COLOR: Record<Theme, string> = {
  light: '#F7F6F2',
  dark: '#0B0F14',
};

function storedTheme(): Theme | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* storage can be blocked */
  }

  return null;
}

function systemTheme(): Theme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readInitialTheme(): Theme {
  if (typeof document !== 'undefined') {
    // The inline bootstrap in index.html already resolved the theme.
    const root = document.documentElement;
    if (root.classList.contains('dark')) return 'dark';
    if (root.classList.contains('light')) return 'light';
  }

  return storedTheme() ?? systemTheme();
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
    root.style.colorScheme = theme;

    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', THEME_COLOR[theme]);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      // An explicit choice wins over later system changes.
      if (storedTheme()) return;
      setTheme(event.matches ? 'dark' : 'light');
    };

    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';

    try {
      window.localStorage.setItem('theme', next);
    } catch {
      /* storage can be blocked */
    }

    setTheme(next);
  };

  return { theme, toggleTheme };
}
