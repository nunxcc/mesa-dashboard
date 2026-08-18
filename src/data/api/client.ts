import type {
  ChannelBreakdown,
  HeatmapCell,
  MenuItem,
  MenuItemPerformance,
  MetricComparison,
  Order,
  TimeBucket,
} from '@/types/domain';
import {
  bucketByTime,
  breakdownByChannel,
  filterOrders,
  granularityFor,
  heatmap,
  menuPerformance,
  paginate,
  prepTimeByHour,
  sortOrders,
  summarise,
  type Granularity,
} from '../aggregate';
import { getDataset } from '../dataset';
import { MENU_ITEMS } from '../generator/menu';
import {
  precedingRange,
  type OrderFilters,
  type OrderSort,
  type PageRequest,
  type Paginated,
} from '../filters';
import { ApiError, simulateNetwork } from './simulation';

/**
 * The seam between the UI and its data.
 *
 * Every function here returns a promise, accepts an `AbortSignal` and can
 * fail - exactly the shape `fetch` would have. Swapping this file for one that
 * talks to a real server would not require a single change above it, which is
 * the only reason a mock layer is worth building rather than importing the
 * dataset directly into components.
 */

export interface RevenueSeries {
  granularity: Granularity;
  buckets: TimeBucket[];
}

async function request<T>(signal: AbortSignal | undefined, produce: () => T): Promise<T> {
  await simulateNetwork(signal);
  return produce();
}

export function getMetrics(
  filters: OrderFilters,
  signal?: AbortSignal,
): Promise<MetricComparison> {
  return request(signal, () => {
    const dataset = getDataset();
    const current = summarise(filterOrders(dataset, filters));
    const previous = summarise(
      filterOrders(dataset, { ...filters, range: precedingRange(filters.range) }),
    );
    return { current, previous };
  });
}

export function getRevenueSeries(
  filters: OrderFilters,
  signal?: AbortSignal,
): Promise<RevenueSeries> {
  return request(signal, () => {
    const granularity = granularityFor(filters.range);
    return {
      granularity,
      buckets: bucketByTime(filterOrders(getDataset(), filters), filters.range, granularity),
    };
  });
}

export function getChannelBreakdown(
  filters: OrderFilters,
  signal?: AbortSignal,
): Promise<ChannelBreakdown[]> {
  return request(signal, () => breakdownByChannel(filterOrders(getDataset(), filters)));
}

/**
 * Channel mix over time, one series per channel, for the stacked area on the
 * Channels page. Reuses the same bucketing as the headline trend so the two
 * charts cannot disagree about what a week is.
 */
export function getChannelSeries(
  filters: OrderFilters,
  signal?: AbortSignal,
): Promise<{ granularity: Granularity; series: Record<string, TimeBucket[]> }> {
  return request(signal, () => {
    const granularity = granularityFor(filters.range);
    const orders = filterOrders(getDataset(), filters);
    const series: Record<string, TimeBucket[]> = {};

    const byChannel = new Map<string, Order[]>();
    for (const order of orders) {
      const list = byChannel.get(order.channel);
      if (list) list.push(order);
      else byChannel.set(order.channel, [order]);
    }

    for (const [channel, list] of byChannel) {
      series[channel] = bucketByTime(list, filters.range, granularity);
    }

    return { granularity, series };
  });
}

export function getMenuPerformance(
  filters: OrderFilters,
  signal?: AbortSignal,
): Promise<MenuItemPerformance[]> {
  return request(signal, () => menuPerformance(filterOrders(getDataset(), filters)));
}

export function getHeatmap(filters: OrderFilters, signal?: AbortSignal): Promise<HeatmapCell[]> {
  return request(signal, () => heatmap(filterOrders(getDataset(), filters)));
}

export function getPrepTimeByHour(
  filters: OrderFilters,
  signal?: AbortSignal,
): Promise<{ hour: number; minutes: number }[]> {
  return request(signal, () => prepTimeByHour(filterOrders(getDataset(), filters)));
}

export function getOrders(
  filters: OrderFilters,
  sort: OrderSort,
  page: PageRequest,
  signal?: AbortSignal,
): Promise<Paginated<Order>> {
  return request(signal, () =>
    paginate(sortOrders(filterOrders(getDataset(), filters), sort), page),
  );
}

export function getOrderById(id: string, signal?: AbortSignal): Promise<Order> {
  return request(signal, () => {
    const order = getDataset().find((candidate) => candidate.id === id);
    if (!order) throw new ApiError(`No order with id ${id}`, 404);
    return order;
  });
}

export function getMenuItems(signal?: AbortSignal): Promise<readonly MenuItem[]> {
  return request(signal, () => MENU_ITEMS);
}
