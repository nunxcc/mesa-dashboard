import { useSyncExternalStore } from 'react';

/**
 * Reads a media query reactively.
 *
 * `useSyncExternalStore` rather than useState + useEffect: it reads the
 * current value during render instead of one paint later, so the first frame
 * is already correct. With the effect-based version a mobile visitor sees the
 * desktop layout flash before the query resolves.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = (onChange: () => void): (() => void) => {
    const media = window.matchMedia(query);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  };

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    // Server snapshot: no viewport exists yet, so assume the desktop layout.
    () => false,
  );
}

/** Kept in sync with the breakpoints in `styles/tokens.css`. */
export const BREAKPOINT = {
  sm: '(min-width: 40rem)',
  md: '(min-width: 48rem)',
  lg: '(min-width: 64rem)',
  xl: '(min-width: 80rem)',
} as const;
