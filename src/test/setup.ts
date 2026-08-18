import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * Registered explicitly because this suite runs without `globals: true`.
 * React Testing Library only auto-registers its cleanup when a global
 * `afterEach` exists, so without this every test inherits the previous test's
 * DOM - and `screen` queries start matching elements from a render that was
 * supposed to be long gone.
 */
afterEach(cleanup);

// jsdom implements neither of these, and both are used by the chart primitives
// (ResizeObserver) and the command palette / drawer (matchMedia).
class ResizeObserverStub implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver ??= ResizeObserverStub;

if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
