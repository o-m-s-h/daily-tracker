import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';

export const accents = { violet: 'Violet', blue: 'Ocean', green: 'Forest', rose: 'Rose', amber: 'Amber' } as const;
type Preferences = { theme: 'system' | 'light' | 'dark'; accent: keyof typeof accents; reducedMotion: boolean };
const defaults: Preferences = { theme: 'system', accent: 'violet', reducedMotion: false };
const storageKey = 'daymark-appearance';
function readPreferences(): Preferences {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || '{}');
    return { theme: ['system', 'light', 'dark'].includes(value?.theme) ? value.theme : 'system', accent: Object.hasOwn(accents, value?.accent) ? value.accent : 'violet', reducedMotion: value?.reducedMotion === true };
  } catch { return defaults; }
}
const ThemeContext = createContext<{ preferences: Preferences; update: (value: Partial<Preferences>) => void } | null>(null);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(readPreferences);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const change = () => setSystemDark(media.matches);
    media.addEventListener('change', change);
    const sync = (event: StorageEvent) => { if (event.key === storageKey || event.key === null) setPreferences(readPreferences()); };
    window.addEventListener('storage', sync);
    return () => { media.removeEventListener('change', change); window.removeEventListener('storage', sync); };
  }, []);
  useLayoutEffect(() => {
    const dark = preferences.theme === 'dark' || (preferences.theme === 'system' && systemDark);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.accent = preferences.accent;
    document.documentElement.dataset.motion = preferences.reducedMotion ? 'reduce' : 'system';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#14151e' : '#f7f8fc');
  }, [preferences, systemDark]);
  function update(value: Partial<Preferences>) {
    const next = { ...preferences, ...value };
    setPreferences(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Preferences still work for this session. */ }
  }
  return <ThemeContext.Provider value={{ preferences, update }}>{children}</ThemeContext.Provider>;
}
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('ThemeProvider is required');
  return context;
}
