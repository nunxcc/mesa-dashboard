import type { SVGProps } from 'react';

/**
 * A small hand-drawn icon set.
 *
 * Pulling in an icon library for eighteen glyphs would add a dependency, a
 * bundle cost and a second visual language to keep in step with the type
 * scale. Everything here shares one 24x24 grid, one 1.6 stroke weight and
 * round joins, so the set reads as one family.
 */
const PATHS = {
  overview: (
    <>
      <rect x="3" y="3" width="7.5" height="9" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="5" rx="1.5" />
      <rect x="13.5" y="12" width="7.5" height="9" rx="1.5" />
      <rect x="3" y="16" width="7.5" height="5" rx="1.5" />
    </>
  ),
  orders: (
    <>
      <path d="M6 2h12a1 1 0 0 1 1 1v18l-3-2-3 2-3-2-3 2V3a1 1 0 0 1 1-1Z" />
      <path d="M9 7.5h6M9 11.5h6" />
    </>
  ),
  menu: (
    <>
      <path d="M7 2v7a2 2 0 1 0 4 0V2" />
      <path d="M9 9v13" />
      <path d="M17.5 2c-1.9 1.3-2.8 3.4-2.8 5.8s.9 4.2 2.8 4.2" />
      <path d="M17.5 2v20" />
    </>
  ),
  channels: (
    <>
      <circle cx="18" cy="5" r="2.8" />
      <circle cx="6" cy="12" r="2.8" />
      <circle cx="18" cy="19" r="2.8" />
      <path d="m8.5 13.4 7 4.2M15.5 6.4l-7 4.2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
  system: (
    <>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8.5 21h7M12 17v4" />
    </>
  ),
  chevronDown: <path d="m5 9 7 7 7-7" />,
  chevronUp: <path d="m5 15 7-7 7 7" />,
  chevronLeft: <path d="m15 5-7 7 7 7" />,
  chevronRight: <path d="m9 5 7 7-7 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  hamburger: <path d="M3 6h18M3 12h18M3 18h18" />,
  arrowUp: <path d="M12 19V5M6 11l6-6 6 6" />,
  arrowDown: <path d="M12 5v14M6 13l6 6 6-6" />,
  alert: (
    <>
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 9.5v5M12 17.6v.01" />
    </>
  ),
  refresh: (
    <>
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <path d="M21 4v5h-5" />
    </>
  ),
  inbox: (
    <>
      <path d="M22 12.5h-6l-2 3h-4l-2-3H2" />
      <path d="M5.6 4.5h12.8L22 12.5V18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5.5l3.6-8Z" />
    </>
  ),
  filters: (
    <>
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="9" cy="6" r="2.2" />
      <circle cx="15" cy="12" r="2.2" />
      <circle cx="7" cy="18" r="2.2" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.5l3.5 2" />
    </>
  ),
  star: <path d="m12 3 2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.3 6.4 20.3l1.2-6.3L3 9.6l6.3-.8L12 3Z" />,
  trending: (
    <>
      <path d="m3 16.5 5.5-5.5 3.5 3.5L21 5.5" />
      <path d="M15 5.5h6v6" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  /** Rendered size in pixels. Stroke width scales to stay optically even. */
  size?: number;
}

export function Icon({ name, size = 16, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      // Thinner strokes at small sizes would disappear; thicker ones at large
      // sizes would look heavy. This keeps the optical weight constant.
      strokeWidth={size <= 16 ? 1.75 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      // Decorative by default: these sit next to a text label almost
      // everywhere. Icon-only buttons supply their own accessible name.
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}

/**
 * The wordmark. A plate viewed from above with a fork to its left — legible at
 * 20px in the sidebar, which is the only size that matters here.
 */
export function Logo({ size = 24, ...props }: Omit<SVGProps<SVGSVGElement>, 'name'> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <circle cx="14" cy="12" r="7.5" />
      <circle cx="14" cy="12" r="3.6" />
      <path d="M3.5 3.5v5a1.8 1.8 0 0 0 3.6 0v-5" />
      <path d="M5.3 10.3V20.5" />
    </svg>
  );
}
