import { useEffect, useState } from 'react';

/**
 * Trails `value` by `delay` milliseconds of quiet.
 *
 * Used for the orders search box: typing "MSA-2506" would otherwise push eight
 * separate filter states into the URL and fire eight queries, seven of which
 * are already stale by the time they resolve.
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
