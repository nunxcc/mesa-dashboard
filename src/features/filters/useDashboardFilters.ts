import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { CHANNELS, ORDER_STATUSES, type Channel, type OrderStatus } from '@/types/domain';
import {
  DEFAULT_PRESET,
  DEFAULT_SORT,
  RANGE_PRESETS,
  resolvePreset,
  type OrderFilters,
  type OrderSort,
  type OrderSortField,
  type PageRequest,
  type RangePreset,
  type SortDirection,
} from '@/data/filters';

/**
 * Filter state lives in the URL, not in React state.
 *
 * That is the difference between a dashboard someone can use and one they can
 * only look at: a filtered view can be linked to a colleague, survives a
 * refresh, and the back button steps through filter changes the way a user
 * already expects it to. It also removes an entire category of bug, because
 * there is exactly one copy of the state rather than one per component.
 */

const PARAM = {
  range: 'range',
  channels: 'channels',
  status: 'status',
  search: 'q',
  sort: 'sort',
  direction: 'dir',
  page: 'page',
} as const;

const VALID_PRESETS = new Set<string>(RANGE_PRESETS.map((preset) => preset.id));
const VALID_CHANNELS = new Set<string>(CHANNELS);
const VALID_STATUSES = new Set<string>(ORDER_STATUSES);
const VALID_SORT_FIELDS = new Set<string>([
  'placedAt',
  'net',
  'subtotal',
  'prepMinutes',
  'rating',
]);

export const PAGE_SIZE = 25;

/**
 * Reads a comma-separated list, discarding anything not in `allowed`.
 * URLs are user-editable, so every value here is untrusted input — a bad
 * `?channels=` must narrow to nothing rather than reach the filter logic.
 */
function readList<T extends string>(raw: string | null, allowed: Set<string>): T[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => allowed.has(value)) as T[];
}

export interface DashboardFilters {
  filters: OrderFilters;
  preset: RangePreset;
  sort: OrderSort;
  page: PageRequest;
  /** True when anything is narrowing the data beyond the date range. */
  hasActiveFilters: boolean;

  setPreset: (preset: RangePreset) => void;
  toggleChannel: (channel: Channel) => void;
  setChannels: (channels: Channel[]) => void;
  toggleStatus: (status: OrderStatus) => void;
  setSearch: (search: string) => void;
  setSort: (field: OrderSortField) => void;
  setPage: (page: number) => void;
  clearFilters: () => void;
}

export function useDashboardFilters(): DashboardFilters {
  const [params, setParams] = useSearchParams();

  const presetParam = params.get(PARAM.range);
  const preset: RangePreset =
    presetParam && VALID_PRESETS.has(presetParam) ? (presetParam as RangePreset) : DEFAULT_PRESET;

  const channels = readList<Channel>(params.get(PARAM.channels), VALID_CHANNELS);
  const statuses = readList<OrderStatus>(params.get(PARAM.status), VALID_STATUSES);
  const search = params.get(PARAM.search) ?? '';

  const sortField = params.get(PARAM.sort);
  const sortDirection = params.get(PARAM.direction);
  const sort: OrderSort = {
    field:
      sortField && VALID_SORT_FIELDS.has(sortField)
        ? (sortField as OrderSortField)
        : DEFAULT_SORT.field,
    direction: sortDirection === 'asc' || sortDirection === 'desc' ? sortDirection : DEFAULT_SORT.direction,
  };

  const pageParam = Number(params.get(PARAM.page));
  const page: PageRequest = {
    page: Number.isFinite(pageParam) && pageParam >= 1 ? Math.floor(pageParam) : 1,
    pageSize: PAGE_SIZE,
  };

  /**
   * Resolved once per preset change rather than per render. Without the memo
   * every render produces a new `range` object, which changes the query key,
   * which refetches, which renders — an infinite loop dressed up as a
   * performance problem.
   */
  const range = useMemo(() => resolvePreset(preset), [preset]);

  const filters = useMemo<OrderFilters>(
    () => ({ range, channels, statuses, search }),
    // The arrays are rebuilt each render, so compare by their serialised form
    // rather than by identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [range, channels.join(','), statuses.join(','), search],
  );

  /** Every write goes through here, so page reset is impossible to forget. */
  const update = useCallback(
    (mutate: (next: URLSearchParams) => void, { resetPage = true } = {}) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          mutate(next);
          // Changing a filter while on page 7 of a result set that now has two
          // pages would otherwise strand the user on an empty table.
          if (resetPage) next.delete(PARAM.page);
          return next;
        },
        // Filter changes replace rather than push: otherwise clicking through
        // five channel chips buries the previous page under five back presses.
        { replace: true },
      );
    },
    [setParams],
  );

  const setPreset = useCallback(
    (next: RangePreset) => {
      update((params) => {
        if (next === DEFAULT_PRESET) params.delete(PARAM.range);
        else params.set(PARAM.range, next);
      });
    },
    [update],
  );

  const writeList = useCallback(
    (key: string, values: string[]) => {
      update((params) => {
        // An empty list means "no filter", which is the absence of the param
        // rather than an empty one — keeps shared URLs clean.
        if (values.length === 0) params.delete(key);
        else params.set(key, values.join(','));
      });
    },
    [update],
  );

  const toggleChannel = useCallback(
    (channel: Channel) => {
      const next = channels.includes(channel)
        ? channels.filter((value) => value !== channel)
        : [...channels, channel];
      writeList(PARAM.channels, next);
    },
    [channels, writeList],
  );

  const setChannels = useCallback(
    (next: Channel[]) => writeList(PARAM.channels, next),
    [writeList],
  );

  const toggleStatus = useCallback(
    (status: OrderStatus) => {
      const next = statuses.includes(status)
        ? statuses.filter((value) => value !== status)
        : [...statuses, status];
      writeList(PARAM.status, next);
    },
    [statuses, writeList],
  );

  const setSearch = useCallback(
    (next: string) => {
      update((params) => {
        if (next.trim() === '') params.delete(PARAM.search);
        else params.set(PARAM.search, next);
      });
    },
    [update],
  );

  /** Clicking the active column flips direction; a new column starts descending. */
  const setSort = useCallback(
    (field: OrderSortField) => {
      update((params) => {
        const currentField = params.get(PARAM.sort) ?? DEFAULT_SORT.field;
        const currentDirection = params.get(PARAM.direction) ?? DEFAULT_SORT.direction;
        const direction: SortDirection =
          currentField === field && currentDirection === 'desc' ? 'asc' : 'desc';
        params.set(PARAM.sort, field);
        params.set(PARAM.direction, direction);
      });
    },
    [update],
  );

  const setPage = useCallback(
    (next: number) => {
      update(
        (params) => {
          if (next <= 1) params.delete(PARAM.page);
          else params.set(PARAM.page, String(next));
        },
        { resetPage: false },
      );
    },
    [update],
  );

  const clearFilters = useCallback(() => {
    update((params) => {
      params.delete(PARAM.channels);
      params.delete(PARAM.status);
      params.delete(PARAM.search);
    });
  }, [update]);

  return {
    filters,
    preset,
    sort,
    page,
    hasActiveFilters: channels.length > 0 || statuses.length > 0 || search.trim() !== '',
    setPreset,
    toggleChannel,
    setChannels,
    toggleStatus,
    setSearch,
    setSort,
    setPage,
    clearFilters,
  };
}
