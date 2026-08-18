import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { useDashboardFilters } from './useDashboardFilters';

function wrapperFor(initialUrl: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter>;
  };
}

function renderFilters(initialUrl = '/orders') {
  return renderHook(() => useDashboardFilters(), { wrapper: wrapperFor(initialUrl) });
}

describe('useDashboardFilters', () => {
  it('falls back to the default preset when none is given', () => {
    const { result } = renderFilters();
    expect(result.current.preset).toBe('30d');
  });

  describe('treats the URL as untrusted input', () => {
    // Anyone can edit the address bar, and a hand-typed value must narrow to
    // nothing rather than reaching the filter logic as a live filter.
    it('discards an unknown channel', () => {
      const { result } = renderFilters('/orders?channels=uber_eats,deliveroo,nonsense');
      expect(result.current.filters.channels).toStrictEqual(['uber_eats']);
    });

    it('discards an unknown status', () => {
      const { result } = renderFilters('/orders?status=exploded');
      expect(result.current.filters.statuses).toStrictEqual([]);
    });

    it('falls back on an unknown range preset', () => {
      const { result } = renderFilters('/orders?range=since-forever');
      expect(result.current.preset).toBe('30d');
    });

    it('falls back on an unknown sort field', () => {
      const { result } = renderFilters('/orders?sort=DROP+TABLE&dir=sideways');
      expect(result.current.sort).toStrictEqual({ field: 'placedAt', direction: 'desc' });
    });

    it('clamps a nonsensical page number', () => {
      const { result } = renderFilters('/orders?page=-4');
      expect(result.current.page.page).toBe(1);
    });
  });

  it('round-trips a channel toggle', () => {
    const { result } = renderFilters();

    act(() => result.current.toggleChannel('glovo'));
    expect(result.current.filters.channels).toStrictEqual(['glovo']);

    act(() => result.current.toggleChannel('glovo'));
    expect(result.current.filters.channels).toStrictEqual([]);
  });

  it('flips direction when the same column is sorted twice', () => {
    const { result } = renderFilters();

    act(() => result.current.setSort('net'));
    expect(result.current.sort).toStrictEqual({ field: 'net', direction: 'desc' });

    act(() => result.current.setSort('net'));
    expect(result.current.sort).toStrictEqual({ field: 'net', direction: 'asc' });
  });

  it('starts a newly chosen column descending rather than inheriting the last direction', () => {
    const { result } = renderFilters();

    act(() => result.current.setSort('net'));
    act(() => result.current.setSort('net'));
    act(() => result.current.setSort('rating'));

    expect(result.current.sort).toStrictEqual({ field: 'rating', direction: 'desc' });
  });

  it('resets to page one when a filter changes', () => {
    // Changing a filter while deep in a result set that just shrank would
    // otherwise strand the user on an empty table.
    const { result } = renderFilters('/orders?page=7');
    expect(result.current.page.page).toBe(7);

    act(() => result.current.toggleChannel('glovo'));
    expect(result.current.page.page).toBe(1);
  });

  it('keeps the page when only paging', () => {
    const { result } = renderFilters();

    act(() => result.current.setPage(3));
    expect(result.current.page.page).toBe(3);
  });

  it('reports active filters only when something narrows the data', () => {
    const { result } = renderFilters();
    expect(result.current.hasActiveFilters).toBe(false);

    act(() => result.current.setSearch('MSA-1'));
    expect(result.current.hasActiveFilters).toBe(true);

    act(() => result.current.clearFilters());
    expect(result.current.hasActiveFilters).toBe(false);
  });
});
