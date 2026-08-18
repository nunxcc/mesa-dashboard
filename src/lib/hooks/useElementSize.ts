import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export interface Size {
  width: number;
  height: number;
}

/**
 * Measures an element and keeps the measurement current.
 *
 * SVG charts need real pixel dimensions to compute scales, and CSS percentages
 * cannot supply them. A ResizeObserver is the only approach that also catches
 * container changes with no window resize behind them - a sidebar collapsing,
 * a drawer opening, a font finally loading.
 *
 * The ref is a callback ref so it re-attaches correctly when the observed node
 * is swapped out, which a plain `useRef` + `useEffect` pairing gets wrong.
 */
export function useElementSize<T extends Element>(): [(node: T | null) => void, Size] {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: T | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;

    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      // `contentRect` is already border-box-corrected here and, unlike
      // getBoundingClientRect, is not affected by CSS transforms.
      const { width, height } = entry.contentRect;

      // Sub-pixel jitter would otherwise re-render the chart on every scroll
      // in browsers that report fractional sizes.
      setSize((current) =>
        Math.abs(current.width - width) < 1 && Math.abs(current.height - height) < 1
          ? current
          : { width, height },
      );
    });

    observer.observe(node);
    observerRef.current = observer;
    const rect = node.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });
  }, []);

  useLayoutEffect(() => () => observerRef.current?.disconnect(), []);

  return [ref, size];
}
