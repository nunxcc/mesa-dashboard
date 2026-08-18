import { eachDayOfInterval, format, startOfMonth, startOfWeek } from 'date-fns';
import {
  CHANNEL_META,
  CHANNELS,
  type ChannelBreakdown,
  type HeatmapCell,
  type MenuItemPerformance,
  type MetricSummary,
  type Order,
  type TimeBucket,
} from '@/types/domain';
import { MENU_BY_ID, MENU_ITEMS } from './generator/menu';
import { toMondayFirstWeekday } from './generator/orders';
import type { DateRange, OrderFilters, OrderSort, PageRequest, Paginated } from './filters';

/**
 * Pure aggregation over an order list. Everything here is a plain function of
 * its input - no dates read from the clock, no module state - which is what
 * makes these testable and what lets the mock API and the eventual real one
 * share the same definitions of "gross revenue".
 */

/**
 * Money is only ever counted for completed orders. A cancelled order is not
 * revenue that later disappeared, it is revenue that never existed, and
 * dashboards that quietly include it overstate every total on the page.
 */
function isRevenueBearing(order: Order): boolean {
  return order.status === 'completed';
}

export function grossOf(order: Order): number {
  return order.subtotal - order.discount;
}

export function filterOrders(orders: readonly Order[], filters: OrderFilters): Order[] {
  const from = filters.range.from;
  const to = filters.range.to;
  const channels = filters.channels.length > 0 ? new Set(filters.channels) : null;
  const statuses = filters.statuses.length > 0 ? new Set(filters.statuses) : null;
  const search = filters.search.trim().toLowerCase();

  return orders.filter((order) => {
    // ISO-8601 strings compare lexicographically in chronological order, so
    // this avoids parsing 21 000 Dates on every keystroke in the search box.
    if (order.placedAt < from || order.placedAt > to) return false;
    if (channels && !channels.has(order.channel)) return false;
    if (statuses && !statuses.has(order.status)) return false;
    if (search && !order.reference.toLowerCase().includes(search)) return false;
    return true;
  });
}

export function summarise(orders: readonly Order[]): MetricSummary {
  let grossRevenue = 0;
  let netRevenue = 0;
  let commissionPaid = 0;
  let foodCost = 0;
  let orderCount = 0;
  let prepTotal = 0;
  let ratingTotal = 0;
  let ratingCount = 0;

  for (const order of orders) {
    if (!isRevenueBearing(order)) continue;
    orderCount += 1;
    grossRevenue += grossOf(order);
    netRevenue += order.net;
    commissionPaid += order.commission;
    prepTotal += order.prepMinutes;

    for (const line of order.lines) {
      const item = MENU_BY_ID.get(line.itemId);
      if (item) foodCost += item.cost * line.quantity;
    }

    if (order.rating !== null) {
      ratingTotal += order.rating;
      ratingCount += 1;
    }
  }

  return {
    grossRevenue,
    netRevenue,
    commissionPaid,
    orderCount,
    averageOrderValue: orderCount === 0 ? 0 : Math.round(grossRevenue / orderCount),
    averagePrepMinutes: orderCount === 0 ? 0 : prepTotal / orderCount,
    averageRating: ratingCount === 0 ? null : ratingTotal / ratingCount,
    foodCostRatio: grossRevenue === 0 ? 0 : foodCost / grossRevenue,
  };
}

export type Granularity = 'hour' | 'day' | 'week' | 'month';

/**
 * Picks a bucket size that keeps a trend line readable: roughly 7-90 points.
 * Plotting 365 daily points in an 800px chart produces noise, not a trend.
 */
export function granularityFor(range: DateRange): Granularity {
  const days = Math.max(
    1,
    Math.round(
      (new Date(range.to).getTime() - new Date(range.from).getTime()) / 86_400_000,
    ),
  );
  if (days <= 2) return 'hour';
  if (days <= 92) return 'day';
  if (days <= 400) return 'week';
  return 'month';
}

function bucketKey(date: Date, granularity: Granularity): string {
  switch (granularity) {
    case 'hour':
      return format(date, "yyyy-MM-dd'T'HH:00:00");
    case 'day':
      return format(date, 'yyyy-MM-dd');
    case 'week':
      return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    case 'month':
      return format(startOfMonth(date), 'yyyy-MM-dd');
  }
}

/**
 * Buckets are seeded across the whole range before any order is counted, so a
 * closed Monday renders as a genuine zero rather than vanishing and letting
 * the line join Sunday straight to Tuesday.
 */
export function bucketByTime(
  orders: readonly Order[],
  range: DateRange,
  granularity: Granularity = granularityFor(range),
): TimeBucket[] {
  const buckets = new Map<string, TimeBucket>();

  if (granularity !== 'hour') {
    for (const day of eachDayOfInterval({ start: new Date(range.from), end: new Date(range.to) })) {
      const key = bucketKey(day, granularity);
      if (!buckets.has(key)) {
        buckets.set(key, { date: key, grossRevenue: 0, netRevenue: 0, orderCount: 0 });
      }
    }
  }

  for (const order of orders) {
    if (!isRevenueBearing(order)) continue;
    const key = bucketKey(new Date(order.placedAt), granularity);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { date: key, grossRevenue: 0, netRevenue: 0, orderCount: 0 };
      buckets.set(key, bucket);
    }
    bucket.grossRevenue += grossOf(order);
    bucket.netRevenue += order.net;
    bucket.orderCount += 1;
  }

  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function breakdownByChannel(orders: readonly Order[]): ChannelBreakdown[] {
  const totals = new Map<
    string,
    {
      grossRevenue: number;
      netRevenue: number;
      commissionPaid: number;
      orderCount: number;
      prepTotal: number;
      ratingTotal: number;
      ratingCount: number;
    }
  >();

  for (const channel of CHANNELS) {
    totals.set(channel, {
      grossRevenue: 0,
      netRevenue: 0,
      commissionPaid: 0,
      orderCount: 0,
      prepTotal: 0,
      ratingTotal: 0,
      ratingCount: 0,
    });
  }

  let grandTotal = 0;

  for (const order of orders) {
    if (!isRevenueBearing(order)) continue;
    const entry = totals.get(order.channel);
    if (!entry) continue;
    const gross = grossOf(order);
    entry.grossRevenue += gross;
    entry.netRevenue += order.net;
    entry.commissionPaid += order.commission;
    entry.orderCount += 1;
    entry.prepTotal += order.prepMinutes;
    if (order.rating !== null) {
      entry.ratingTotal += order.rating;
      entry.ratingCount += 1;
    }
    grandTotal += gross;
  }

  return CHANNELS.map((channel) => {
    const entry = totals.get(channel);
    const safe = entry ?? {
      grossRevenue: 0,
      netRevenue: 0,
      commissionPaid: 0,
      orderCount: 0,
      prepTotal: 0,
      ratingTotal: 0,
      ratingCount: 0,
    };
    return {
      channel,
      grossRevenue: safe.grossRevenue,
      netRevenue: safe.netRevenue,
      commissionPaid: safe.commissionPaid,
      orderCount: safe.orderCount,
      averageOrderValue:
        safe.orderCount === 0 ? 0 : Math.round(safe.grossRevenue / safe.orderCount),
      averagePrepMinutes: safe.orderCount === 0 ? 0 : safe.prepTotal / safe.orderCount,
      averageRating: safe.ratingCount === 0 ? null : safe.ratingTotal / safe.ratingCount,
      revenueShare: grandTotal === 0 ? 0 : safe.grossRevenue / grandTotal,
    };
  }).sort((a, b) => b.grossRevenue - a.grossRevenue);
}

export function menuPerformance(orders: readonly Order[]): MenuItemPerformance[] {
  const units = new Map<string, { units: number; revenue: number; profit: number }>();
  let totalUnits = 0;

  for (const order of orders) {
    if (!isRevenueBearing(order)) continue;
    for (const line of order.lines) {
      const item = MENU_BY_ID.get(line.itemId);
      if (!item) continue;
      const entry = units.get(line.itemId) ?? { units: 0, revenue: 0, profit: 0 };
      entry.units += line.quantity;
      entry.revenue += line.unitPrice * line.quantity;
      entry.profit += (line.unitPrice - item.cost) * line.quantity;
      units.set(line.itemId, entry);
      totalUnits += line.quantity;
    }
  }

  return MENU_ITEMS.map((item) => {
    const entry = units.get(item.id) ?? { units: 0, revenue: 0, profit: 0 };
    return {
      item,
      unitsSold: entry.units,
      grossRevenue: entry.revenue,
      grossProfit: entry.profit,
      margin: item.price === 0 ? 0 : (item.price - item.cost) / item.price,
      volumeShare: totalUnits === 0 ? 0 : entry.units / totalUnits,
    };
  }).sort((a, b) => b.grossRevenue - a.grossRevenue);
}

/**
 * Every weekday/hour cell in the service window, including the empty ones.
 * The gaps are the point: a heatmap with holes where Monday and the dead
 * afternoon should be reads as broken, not as closed.
 */
export function heatmap(orders: readonly Order[]): HeatmapCell[] {
  const cells = new Map<string, HeatmapCell>();

  for (let weekday = 0; weekday < 7; weekday += 1) {
    for (let hour = 12; hour <= 23; hour += 1) {
      cells.set(`${weekday}-${hour}`, { weekday, hour, orderCount: 0, grossRevenue: 0 });
    }
  }

  for (const order of orders) {
    if (!isRevenueBearing(order)) continue;
    const placed = new Date(order.placedAt);
    const key = `${toMondayFirstWeekday(placed)}-${placed.getHours()}`;
    const cell = cells.get(key);
    if (!cell) continue;
    cell.orderCount += 1;
    cell.grossRevenue += grossOf(order);
  }

  return [...cells.values()];
}

/** Average ticket time bucketed by hour of day, for the service view. */
export function prepTimeByHour(orders: readonly Order[]): { hour: number; minutes: number }[] {
  const totals = new Map<number, { sum: number; count: number }>();

  for (const order of orders) {
    if (!isRevenueBearing(order)) continue;
    const hour = new Date(order.placedAt).getHours();
    const entry = totals.get(hour) ?? { sum: 0, count: 0 };
    entry.sum += order.prepMinutes;
    entry.count += 1;
    totals.set(hour, entry);
  }

  return [...totals.entries()]
    .map(([hour, entry]) => ({ hour, minutes: entry.sum / entry.count }))
    .sort((a, b) => a.hour - b.hour);
}

const SORT_ACCESSORS: Record<OrderSort['field'], (order: Order) => number | string> = {
  placedAt: (order) => order.placedAt,
  net: (order) => order.net,
  subtotal: (order) => order.subtotal,
  prepMinutes: (order) => order.prepMinutes,
  // Unrated orders sort last in both directions rather than clustering at
  // whichever end -1 happens to land on.
  rating: (order) => order.rating ?? -1,
};

export function sortOrders(orders: readonly Order[], sort: OrderSort): Order[] {
  const accessor = SORT_ACCESSORS[sort.field];
  const direction = sort.direction === 'asc' ? 1 : -1;

  return [...orders].sort((a, b) => {
    const left = accessor(a);
    const right = accessor(b);
    if (left === right) return a.id.localeCompare(b.id);
    return (left < right ? -1 : 1) * direction;
  });
}

export function paginate<T>(rows: readonly T[], { page, pageSize }: PageRequest): Paginated<T> {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;

  return {
    rows: rows.slice(start, start + pageSize),
    total: rows.length,
    page: safePage,
    pageSize,
    pageCount,
  };
}

/** Commission as a share of gross, per channel - the Channels page headline. */
export function commissionRateOf(breakdown: ChannelBreakdown): number {
  if (breakdown.grossRevenue === 0) return CHANNEL_META[breakdown.channel].commissionRate;
  return breakdown.commissionPaid / breakdown.grossRevenue;
}
