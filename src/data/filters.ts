import {
  endOfDay,
  endOfMonth,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
  differenceInCalendarDays,
} from 'date-fns';
import type { Channel, OrderStatus } from '@/types/domain';

/** Inclusive at both ends, stored as ISO instants. */
export interface DateRange {
  from: string;
  to: string;
}

export type RangePreset = '7d' | '30d' | '90d' | 'mtd' | 'last-month' | '12m';

export const RANGE_PRESETS: { id: RangePreset; label: string }[] = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: 'mtd', label: 'Month to date' },
  { id: 'last-month', label: 'Last month' },
  { id: '12m', label: 'Last 12 months' },
];

export const DEFAULT_PRESET: RangePreset = '30d';

export function resolvePreset(preset: RangePreset, now = new Date()): DateRange {
  const today = endOfDay(now);
  switch (preset) {
    case '7d':
      return { from: startOfDay(subDays(now, 6)).toISOString(), to: today.toISOString() };
    case '30d':
      return { from: startOfDay(subDays(now, 29)).toISOString(), to: today.toISOString() };
    case '90d':
      return { from: startOfDay(subDays(now, 89)).toISOString(), to: today.toISOString() };
    case 'mtd':
      return { from: startOfMonth(now).toISOString(), to: today.toISOString() };
    case 'last-month': {
      const previous = subMonths(now, 1);
      return {
        from: startOfMonth(previous).toISOString(),
        to: endOfMonth(previous).toISOString(),
      };
    }
    case '12m':
      return { from: startOfDay(subMonths(now, 12)).toISOString(), to: today.toISOString() };
  }
}

/**
 * The immediately preceding window of equal length, used for every
 * period-over-period delta. Comparing a 30-day span against the 30 days before
 * it is the only comparison that does not mislead — matching against "same
 * period last year" would fold a year of growth into every number.
 */
export function precedingRange(range: DateRange): DateRange {
  const from = new Date(range.from);
  const to = new Date(range.to);
  const days = differenceInCalendarDays(to, from) + 1;
  return {
    from: startOfDay(subDays(from, days)).toISOString(),
    to: endOfDay(subDays(to, days)).toISOString(),
  };
}

export interface OrderFilters {
  range: DateRange;
  /** Empty means "all channels" rather than "no channels". */
  channels: Channel[];
  /** Empty means "all statuses". */
  statuses: OrderStatus[];
  /** Matches order reference, case-insensitive. */
  search: string;
}

export type SortDirection = 'asc' | 'desc';

export type OrderSortField = 'placedAt' | 'net' | 'subtotal' | 'prepMinutes' | 'rating';

export interface OrderSort {
  field: OrderSortField;
  direction: SortDirection;
}

export const DEFAULT_SORT: OrderSort = { field: 'placedAt', direction: 'desc' };

export interface PageRequest {
  page: number;
  pageSize: number;
}

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export function emptyFilters(range: DateRange): OrderFilters {
  return { range, channels: [], statuses: [], search: '' };
}
