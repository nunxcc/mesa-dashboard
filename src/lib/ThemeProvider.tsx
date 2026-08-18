import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ThemeContext,
  readStoredPreference,
  storePreference,
  systemTheme,
  type ResolvedTheme,
  type ThemeContextValue,
  type ThemePreference,
} from './theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);
  const [systemValue, setSystemValue] = useState<ResolvedTheme>(() =>
    typeof window === 'undefined' ? 'light' : systemTheme(),
  );

  // Tracked even while an explicit preference is active, so switching back to
  // "system" is immediately correct rather than stale.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (): void => setSystemValue(media.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const theme: ResolvedTheme = preference === 'system' ? systemValue : preference;

  useEffect(() => {
    document.documentElement.dataset['theme'] = theme;
  }, [theme]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    storePreference(next);
  }, []);

  const toggle = useCallback(() => {
    setPreferenceState((current) => {
      const resolved = current === 'system' ? systemTheme() : current;
      const next: ThemePreference = resolved === 'dark' ? 'light' : 'dark';
      storePreference(next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, theme, setPreference, toggle }),
    [preference, theme, setPreference, toggle],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
