import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type {
  ChannelBreakdown,
  HeatmapCell,
  MenuItemPerformance,
  MetricComparison,
  Order,
} from '@/types/domain';
import * as api from './api/client';
import type { OrderFilters, OrderSort, PageRequest, Paginated } from './filters';

/**
 * Query keys in one place.
 *
 * Scattering array literals across components is how cache invalidation
 * quietly stops working - one call site writes `['orders', filters]`, another
 * writes `['order-list', filters]`, and neither ever sees the other's data.
 * A factory makes the key structure a single, greppable source of truth.
 */
export const queryKeys = {
  all: ['mesa'] as const,
  metrics: (filters: OrderFilters) => [...queryKeys.all, 'metrics', filters] as const,
  revenueSeries: (filters: OrderFilters) => [...queryKeys.all, 'revenue-series', filters] as const,
  channelBreakdown: (filters: OrderFilters) => [...queryKeys.all, 'channels', filters] as const,
  channelSeries: (filters: OrderFilters) => [...queryKeys.all, 'channel-series', filters] as const,
  menuPerformance: (filters: OrderFilters) => [...queryKeys.all, 'menu', filters] as const,
  heatmap: (filters: OrderFilters) => [...queryKeys.all, 'heatmap', filters] as const,
  prepTime: (filters: OrderFilters) => [...queryKeys.all, 'prep-time', filters] as const,
  orders: (filters: OrderFilters, sort: OrderSort, page: PageRequest) =>
    [...queryKeys.all, 'orders', filters, sort, page] as const,
  order: (id: string) => [...queryKeys.all, 'order', id] as const,
};

export function useMetrics(filters: OrderFilters): UseQueryResult<MetricComparison> {
  return useQuery({
    queryKey: queryKeys.metrics(filters),
    queryFn: ({ signal }) => api.getMetrics(filters, signal),
  });
}

export function useRevenueSeries(filters: OrderFilters): UseQueryResult<api.RevenueSeries> {
  return useQuery({
    queryKey: queryKeys.revenueSeries(filters),
    queryFn: ({ signal }) => api.getRevenueSeries(filters, signal),
  });
}

export function useChannelBreakdown(filters: OrderFilters): UseQueryResult<ChannelBreakdown[]> {
  return useQuery({
    queryKey: queryKeys.channelBreakdown(filters),
    queryFn: ({ signal }) => api.getChannelBreakdown(filters, signal),
  });
}

export function useChannelSeries(filters: OrderFilters) {
  return useQuery({
    queryKey: queryKeys.channelSeries(filters),
    queryFn: ({ signal }) => api.getChannelSeries(filters, signal),
  });
}

export function useMenuPerformance(filters: OrderFilters): UseQueryResult<MenuItemPerformance[]> {
  return useQuery({
    queryKey: queryKeys.menuPerformance(filters),
    queryFn: ({ signal }) => api.getMenuPerformance(filters, signal),
  });
}

export function useHeatmap(filters: OrderFilters): UseQueryResult<HeatmapCell[]> {
  return useQuery({
    queryKey: queryKeys.heatmap(filters),
    queryFn: ({ signal }) => api.getHeatmap(filters, signal),
  });
}

export function usePrepTimeByHour(
  filters: OrderFilters,
): UseQueryResult<{ hour: number; minutes: number }[]> {
  return useQuery({
    queryKey: queryKeys.prepTime(filters),
    queryFn: ({ signal }) => api.getPrepTimeByHour(filters, signal),
  });
}

export function useOrders(
  filters: OrderFilters,
  sort: OrderSort,
  page: PageRequest,
): UseQueryResult<Paginated<Order>> {
  return useQuery({
    queryKey: queryKeys.orders(filters, sort, page),
    queryFn: ({ signal }) => api.getOrders(filters, sort, page, signal),
    // Paging back and forth should not blank the table out on every step.
    placeholderData: (previous) => previous,
  });
}

export function useOrder(id: string | undefined): UseQueryResult<Order> {
  return useQuery({
    queryKey: queryKeys.order(id ?? ''),
    queryFn: ({ signal }) => api.getOrderById(id as string, signal),
    enabled: Boolean(id),
  });
}
