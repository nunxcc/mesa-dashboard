import { endOfDay, startOfDay } from 'date-fns';
import { beforeEach, describe, expect, it } from 'vitest';
import { makeOrder, resetFactories } from '@/test/factories';
import { bucketByTime, breakdownByChannel, filterOrders, paginate, summarise } from './aggregate';
import { emptyFilters, type DateRange } from './filters';

/**
 * Ranges are built from local day boundaries, exactly as `resolvePreset` does.
 * Hand-writing a UTC midnight here instead would silently span an extra
 * calendar day for anyone running the suite outside UTC — the bucketing works
 * in local days because that is what "yesterday's takings" means to the person
 * reading the dashboard.
 */
function localRange(from: Date, to: Date): DateRange {
  return { from: startOfDay(from).toISOString(), to: endOfDay(to).toISOString() };
}

/** Month is zero-based: 5 is June. */
const JUNE = localRange(new Date(2026, 5, 1), new Date(2026, 5, 30));

beforeEach(resetFactories);

describe('summarise', () => {
  it('counts only completed orders as revenue', () => {
    const summary = summarise([
      makeOrder({ subtotal: 1000 }),
      makeOrder({ subtotal: 5000, status: 'cancelled' }),
      makeOrder({ subtotal: 3000, status: 'refunded' }),
    ]);

    // A cancelled order is not revenue that later vanished — it never
    // existed, and including it would overstate every total on the page.
    expect(summary.grossRevenue).toBe(1000);
    expect(summary.orderCount).toBe(1);
  });

  it('subtracts commission from net but leaves gross alone', () => {
    const summary = summarise([makeOrder({ channel: 'uber_eats', subtotal: 10_000 })]);

    expect(summary.grossRevenue).toBe(10_000);
    expect(summary.commissionPaid).toBe(3000);
    expect(summary.netRevenue).toBe(7000);
  });

  it('never lets net exceed gross on a commission-free channel', () => {
    // Regression: tips were once folded into net, which produced the nonsense
    // of a dine-in channel keeping more than it sold.
    const summary = summarise([makeOrder({ channel: 'dine_in', subtotal: 4000, tip: 500 })]);

    expect(summary.netRevenue).toBeLessThanOrEqual(summary.grossRevenue);
  });

  it('reports a null average rating rather than zero when nothing is rated', () => {
    // Zero would be plotted as the worst possible score; null renders an
    // em dash, which is the honest answer.
    expect(summarise([makeOrder({ rating: null })]).averageRating).toBeNull();
  });

  it('returns zeroes rather than NaN for an empty period', () => {
    const summary = summarise([]);

    expect(summary.averageOrderValue).toBe(0);
    expect(summary.foodCostRatio).toBe(0);
    expect(Number.isNaN(summary.averagePrepMinutes)).toBe(false);
  });
});

describe('filterOrders', () => {
  const orders = [
    makeOrder({ channel: 'dine_in', placedAt: '2026-06-10T12:00:00.000Z' }),
    makeOrder({ channel: 'glovo', placedAt: '2026-06-11T12:00:00.000Z' }),
    makeOrder({ channel: 'glovo', placedAt: '2026-07-11T12:00:00.000Z', status: 'refunded' }),
  ];

  it('treats an empty channel list as "all channels"', () => {
    expect(filterOrders(orders, emptyFilters(JUNE))).toHaveLength(2);
  });

  it('narrows to the selected channels', () => {
    const result = filterOrders(orders, { ...emptyFilters(JUNE), channels: ['glovo'] });

    expect(result).toHaveLength(1);
    expect(result[0]?.channel).toBe('glovo');
  });

  it('excludes orders outside the range', () => {
    const july = filterOrders(orders, emptyFilters(JUNE)).map((order) => order.placedAt);

    expect(july.every((placedAt) => placedAt.startsWith('2026-06'))).toBe(true);
  });

  it('matches the search term against the reference, case-insensitively', () => {
    const target = orders[0];
    expect(target).toBeDefined();

    const result = filterOrders(orders, {
      ...emptyFilters(JUNE),
      search: (target?.reference ?? '').toLowerCase(),
    });

    expect(result).toHaveLength(1);
  });
});

describe('bucketByTime', () => {
  it('emits a zero bucket for days with no orders', () => {
    // Closed Mondays must render as a genuine zero. Dropping the bucket would
    // let the trend line join Sunday straight to Tuesday and hide the gap.
    const buckets = bucketByTime(
      [makeOrder({ placedAt: new Date(2026, 5, 3, 13, 0).toISOString() })],
      localRange(new Date(2026, 5, 1), new Date(2026, 5, 5)),
    );

    expect(buckets).toHaveLength(5);
    expect(buckets.filter((bucket) => bucket.orderCount === 0)).toHaveLength(4);
  });

  it('returns buckets in chronological order', () => {
    const buckets = bucketByTime(
      [
        makeOrder({ placedAt: new Date(2026, 5, 4, 13, 0).toISOString() }),
        makeOrder({ placedAt: new Date(2026, 5, 2, 13, 0).toISOString() }),
      ],
      JUNE,
    );

    const dates = buckets.map((bucket) => bucket.date);
    expect(dates).toStrictEqual([...dates].sort());
  });
});

describe('breakdownByChannel', () => {
  it('computes revenue share against the filtered total', () => {
    const rows = breakdownByChannel([
      makeOrder({ channel: 'dine_in', subtotal: 7500 }),
      makeOrder({ channel: 'glovo', subtotal: 2500 }),
    ]);

    const dineIn = rows.find((row) => row.channel === 'dine_in');
    expect(dineIn?.revenueShare).toBeCloseTo(0.75, 5);
  });

  it('includes channels with no trade, so the legend stays stable', () => {
    const rows = breakdownByChannel([makeOrder({ channel: 'dine_in' })]);

    expect(rows).toHaveLength(5);
    expect(rows.find((row) => row.channel === 'bolt_food')?.grossRevenue).toBe(0);
  });
});

describe('paginate', () => {
  const rows = Array.from({ length: 55 }, (_, index) => index);

  it('clamps a page beyond the end back to the last page', () => {
    // Reachable by editing the URL, and stranding the user on a blank table
    // is a worse answer than showing them the last page.
    const result = paginate(rows, { page: 99, pageSize: 25 });

    expect(result.page).toBe(3);
    expect(result.rows).toHaveLength(5);
  });

  it('clamps a page below one', () => {
    expect(paginate(rows, { page: 0, pageSize: 25 }).page).toBe(1);
  });

  it('reports one page when there are no rows', () => {
    const result = paginate([], { page: 1, pageSize: 25 });

    expect(result.pageCount).toBe(1);
    expect(result.total).toBe(0);
  });
});
