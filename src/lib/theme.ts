import { createContext, use } from 'react';

/**
 * Theme context and its hook, kept apart from the provider component.
 *
 * A module that exports both components and plain values breaks React Fast
 * Refresh — it can no longer tell whether to remount or re-run, so it reloads
 * the whole page and loses state on every edit. Splitting them is the fix.
 */
export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'mesa.theme';

export interface ThemeContextValue {
  /** What the user chose, including "follow the OS". */
  preference: ThemePreference;
  /** What that resolves to right now. */
  theme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  /** Flips between light and dark, leaving "system" behind. */
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = use(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside a ThemeProvider');
  return context;
}

export function systemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // Safari in private mode throws on localStorage access rather than
    // returning null. A theme preference is not worth crashing the app over.
  }
  return 'system';
}

export function storePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // See readStoredPreference.
  }
}
