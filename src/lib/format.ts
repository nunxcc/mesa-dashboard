import type { Cents } from '@/types/domain';

/**
 * Constructing an `Intl.NumberFormat` is comparatively expensive, and a table
 * of 50 rows x 6 numeric columns would otherwise build 300 of them per render.
 * They are immutable and safe to share, so cache by argument signature.
 */
const numberFormatters = new Map<string, Intl.NumberFormat>();

function numberFormatter(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = locale + JSON.stringify(options);
  let formatter = numberFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    numberFormatters.set(key, formatter);
  }
  return formatter;
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function dateFormatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = locale + JSON.stringify(options);
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    dateFormatters.set(key, formatter);
  }
  return formatter;
}

/** Portuguese conventions: 1.234,56 € with the symbol trailing. */
export const LOCALE = 'pt-PT';
const CURRENCY = 'EUR';

export function toEuros(cents: Cents): number {
  return cents / 100;
}

export function formatCurrency(cents: Cents, { decimals = 2 } = {}): string {
  return numberFormatter(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(toEuros(cents));
}

/**
 * Axis ticks and KPI tiles need to stay narrow, so anything from a thousand up
 * is abbreviated. Below that the full value is clearer than "0,4 mil".
 */
export function formatCompactCurrency(cents: Cents): string {
  const euros = toEuros(cents);
  if (Math.abs(euros) < 1000) {
    return numberFormatter(LOCALE, {
      style: 'currency',
      currency: CURRENCY,
      maximumFractionDigits: 0,
    }).format(euros);
  }
  return numberFormatter(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(euros);
}

export function formatNumber(value: number, { decimals = 0 } = {}): string {
  return numberFormatter(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatCompactNumber(value: number): string {
  if (Math.abs(value) < 1000) return formatNumber(value);
  return numberFormatter(LOCALE, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

/** `ratio` is 0-1, not 0-100. */
export function formatPercent(ratio: number, { decimals = 1 } = {}): string {
  return numberFormatter(LOCALE, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(ratio);
}

/** Signed, for period-over-period deltas: "+12,4 %" / "−3,1 %". */
export function formatSignedPercent(ratio: number, { decimals = 1 } = {}): string {
  return numberFormatter(LOCALE, {
    style: 'percent',
    signDisplay: 'exceptZero',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(ratio);
}

/**
 * Relative change between two periods.
 *
 * Returns null when the baseline is zero: "up from nothing" is not a
 * percentage, and rendering Infinity in a KPI tile is how dashboards lose
 * their credibility. Callers show an em dash instead.
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${formatNumber(minutes, { decimals: minutes % 1 === 0 ? 0 : 1 })} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function formatRating(rating: number | null): string {
  return rating === null ? '—' : formatNumber(rating, { decimals: 2 });
}

export function formatDate(iso: string): string {
  return dateFormatter(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(iso),
  );
}

export function formatDateShort(iso: string): string {
  return dateFormatter(LOCALE, { day: '2-digit', month: 'short' }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return dateFormatter(LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatTime(iso: string): string {
  return dateFormatter(LOCALE, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

/** "14h" - compact enough for a heatmap axis. */
export function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}h`;
}

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;

/** `weekday` is 0 = Monday, matching the domain model rather than JS. */
export function formatWeekday(weekday: number): string {
  return WEEKDAY_LABELS[weekday] ?? '';
}
