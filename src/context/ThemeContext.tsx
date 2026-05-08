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

function applyTheme(theme: Theme) {
  const cfg = themes[theme];
  const root = document.documentElement;

  // Set data-theme for CSS selector overrides
  root.setAttribute('data-theme', theme);

  // Set CSS custom properties
  root.style.setProperty('--neon-bg', cfg.bg);
  root.style.setProperty('--neon-surface', cfg.surface);
  root.style.setProperty('--neon-accent', cfg.accent);
  root.style.setProperty('--neon-border', cfg.border);

  // Apply body background directly
  document.body.style.backgroundColor = cfg.bg;

  // Inject/update a dynamic <style> tag for Tailwind class overrides
  let styleTag = document.getElementById('neonbeat-theme') as HTMLStyleElement | null;
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'neonbeat-theme';
    document.head.appendChild(styleTag);
  }

  if (theme === 'dark') {
    styleTag.textContent = '';
    return;
  }

  const bg = cfg.bg;
  const surface = cfg.surface;
  const accent = cfg.accent;
  const accentAlpha33 = accent + '33';
  const accentAlpha4d = accent + '4d';
  const accentAlpha66 = accent + '66';

  styleTag.textContent = `
    body, #root { background-color: ${bg} !important; }
    [data-theme="${theme}"] .bg-\\[\\#0a0010\\] { background-color: ${bg} !important; }
    [data-theme="${theme}"] .bg-\\[\\#12001f\\] { background-color: ${surface} !important; }
    [data-theme="${theme}"] .bg-\\[\\#12001f\\]\\/80 { background-color: ${surface}cc !important; }
    [data-theme="${theme}"] .bg-\\[\\#12001f\\]\\/60 { background-color: ${surface}99 !important; }
    [data-theme="${theme}"] .from-\\[\\#0a0010\\] { --tw-gradient-from: ${bg} !important; }
    [data-theme="${theme}"] .via-\\[\\#1a0030\\] { --tw-gradient-via: ${surface} !important; }
    [data-theme="${theme}"] .to-\\[\\#0a0010\\] { --tw-gradient-to: ${bg} !important; }
    [data-theme="${theme}"] .border-purple-500\\/20 { border-color: ${accentAlpha33} !important; }
    [data-theme="${theme}"] .border-purple-500\\/30 { border-color: ${accentAlpha4d} !important; }
    [data-theme="${theme}"] .text-purple-400 { color: ${accent} !important; }
    [data-theme="${theme}"] .text-purple-300 { color: ${accent}cc !important; }
    [data-theme="${theme}"] .text-purple-500 { color: ${accent} !important; }
    [data-theme="${theme}"] .bg-purple-600 { background-color: ${accent} !important; }
    [data-theme="${theme}"] .from-purple-600 { --tw-gradient-from: ${accent} !important; }
    [data-theme="${theme}"] .ring-purple-500 { --tw-ring-color: ${accent} !important; }
    [data-theme="${theme}"] .shadow-\\[0_0_30px_\\#9333ea\\] { box-shadow: 0 0 30px ${accent} !important; }
    [data-theme="${theme}"] .shadow-\\[0_0_15px_rgba\\(147\\,51\\,234\\,0\\.4\\)\\] { box-shadow: 0 0 15px ${accentAlpha66} !important; }
  `;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('neonbeat_theme') as Theme;
    if (saved && themes[saved]) {
      setThemeState(saved);
      applyTheme(saved);
    } else {
      applyTheme('dark');
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/extras?route=settings&user_id=${user.id}`)
      .then(r => r.json())
      .then(d => {
        if (d?.theme && themes[d.theme as Theme]) {
          setThemeState(d.theme as Theme);
          applyTheme(d.theme as Theme);
        }
      })
      .catch(() => {});
  }, [user]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('neonbeat_theme', t);
    applyTheme(t);
    if (user) {
      fetch('/api/extras?route=settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, theme: t }),
      }).catch(() => {});
    }
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, themeConfig: themes[theme], setTheme, allThemes: themes }}>
      {children}
    </ThemeContext.Provider>
  );
}
