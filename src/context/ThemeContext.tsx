import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

type Theme = 'dark' | 'purple' | 'midnight' | 'neon' | 'rose';

const themes: Record<Theme, { bg: string; surface: string; border: string; accent: string; text: string; label: string }> = {
  dark:     { bg: '#0a0010', surface: '#12001f', border: '#9333ea33', accent: '#9333ea', text: '#fff', label: 'Dark Purple' },
  purple:   { bg: '#0d0020', surface: '#1a0035', border: '#a855f740', accent: '#a855f7', text: '#fff', label: 'Deep Purple' },
  midnight: { bg: '#000814', surface: '#001233', border: '#3b82f640', accent: '#3b82f6', text: '#fff', label: 'Midnight Blue' },
  neon:     { bg: '#001a00', surface: '#002200', border: '#22c55e40', accent: '#22c55e', text: '#fff', label: 'Neon Green' },
  rose:     { bg: '#1a000a', surface: '#2a0015', border: '#f43f5e40', accent: '#f43f5e', text: '#fff', label: 'Rose' },
};

interface ThemeContextType {
  theme: Theme;
  themeConfig: typeof themes.dark;
  setTheme: (t: Theme) => void;
  allThemes: typeof themes;
}

const ThemeContext = createContext<ThemeContextType>(null!);
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('neonbeat_theme') as Theme;
    if (saved && themes[saved]) setThemeState(saved);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/extras?route=settings&user_id=${user.id}`).then(r => r.json()).then(d => {
      if (d?.theme && themes[d.theme as Theme]) setThemeState(d.theme as Theme);
    }).catch(() => {});
  }, [user]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('neonbeat_theme', t);
    if (user) {
      fetch('/api/extras?route=settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, theme: t }) }).catch(() => {});
    }
  };

  // Apply CSS variables ke root
  useEffect(() => {
    const cfg = themes[theme];
    const root = document.documentElement;
    root.style.setProperty('--bg', cfg.bg);
    root.style.setProperty('--surface', cfg.surface);
    root.style.setProperty('--border', cfg.border);
    root.style.setProperty('--accent', cfg.accent);
    document.body.style.backgroundColor = cfg.bg;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, themeConfig: themes[theme], setTheme, allThemes: themes }}>
      {children}
    </ThemeContext.Provider>
  );
}
