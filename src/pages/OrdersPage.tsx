import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState } from '@/components/ui/States';
import {
  ActiveFilterSummary,
  ChannelChips,
  RangePicker,
  SearchBox,
  StatusChips,
} from '@/features/filters/FilterControls';
import { useDashboardFilters } from '@/features/filters/useDashboardFilters';
import { OrderDetail } from '@/features/orders/OrderDetail';
import { useOrder, useOrders } from '@/data/queries';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { formatCurrency, formatDateTime, formatMinutes, formatNumber } from '@/lib/format';
import {
  CHANNEL_META,
  ORDER_STATUS_LABEL,
  type Order,
  type OrderStatus,
} from '@/types/domain';
import styles from './OrdersPage.module.css';

const STATUS_TONE: Record<OrderStatus, 'positive' | 'warning' | 'negative'> = {
  completed: 'positive',
  refunded: 'warning',
  cancelled: 'negative',
};

const COLUMNS: Column<Order>[] = [
  {
    id: 'reference',
    header: 'Reference',
    cell: (row) => <span className={styles['reference']}>{row.reference}</span>,
  },
  {
    id: 'placedAt',
    header: 'Placed',
    sortable: true,
    cell: (row) => formatDateTime(row.placedAt),
  },
  {
    id: 'channel',
    header: 'Channel',
    cell: (row) => (
      <span className={styles['channelCell']}>
        <span
          className={styles['swatch']}
          style={{ backgroundColor: `var(${CHANNEL_META[row.channel].colorVar})` }}
          aria-hidden="true"
        />
        {CHANNEL_META[row.channel].label}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: (row) => (
      <Badge tone={STATUS_TONE[row.status]} dot>
        {ORDER_STATUS_LABEL[row.status]}
      </Badge>
    ),
  },
  {
    id: 'items',
    header: 'Items',
    align: 'right',
    secondary: true,
    cell: (row) => formatNumber(row.lines.reduce((sum, line) => sum + line.quantity, 0)),
  },
  {
    id: 'subtotal',
    header: 'Gross',
    align: 'right',
    sortable: true,
    cell: (row) => formatCurrency(row.subtotal - row.discount),
  },
  {
    id: 'net',
    header: 'Net',
    align: 'right',
    sortable: true,
    cell: (row) => <strong>{formatCurrency(row.net)}</strong>,
  },
  {
    id: 'prepMinutes',
    header: 'Ticket',
    align: 'right',
    sortable: true,
    secondary: true,
    cell: (row) => formatMinutes(row.prepMinutes),
  },
  {
    id: 'rating',
    header: 'Rating',
    align: 'right',
    sortable: true,
    secondary: true,
    cell: (row) =>
      row.rating === null ? (
        <span className={styles['muted']}>—</span>
      ) : (
        formatNumber(row.rating, { decimals: 1 })
      ),
  },
];

export function OrdersPage() {
  const {
    filters,
    preset,
    sort,
    page,
    hasActiveFilters,
    setPreset,
    toggleChannel,
    toggleStatus,
    setSearch,
    setSort,
    setPage,
    clearFilters,
  } = useDashboardFilters();

  // The input stays instant while the URL - and therefore the query - trails
  // it. Writing every keystroke straight to the URL would push a history
  // entry and fire a request per character.
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebouncedValue(searchInput, 250);

  useEffect(() => {
    if (debouncedSearch !== filters.search) setSearch(debouncedSearch);
  }, [debouncedSearch, filters.search, setSearch]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const orders = useOrders(filters, sort, page);
  const selected = useOrder(selectedId ?? undefined);

  const data = orders.data;

  return (
    <>
      <PageHeader
        title="Orders"
        description="Every ticket the kitchen has seen, with what it earned after the platform took its cut."
        actions={<RangePicker value={preset} onChange={setPreset} />}
      />

      <div className={styles['filters']}>
        <div className={styles['filterRow']}>
          <SearchBox value={searchInput} onChange={setSearchInput} />
          <ActiveFilterSummary
            channels={filters.channels}
            statuses={filters.statuses}
            search={filters.search}
            onClear={() => {
              setSearchInput('');
              clearFilters();
            }}
          />
        </div>
        <div className={styles['filterRow']}>
          <ChannelChips selected={filters.channels} onToggle={toggleChannel} />
          <StatusChips selected={filters.statuses} onToggle={toggleStatus} />
        </div>
      </div>

      {orders.isError ? (
        <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />
      ) : (
        <Card flush>
          <CardHeader
            title="Tickets"
            description="Select a row to see the full breakdown for that order."
          />
          <CardBody>
            <DataTable
              columns={COLUMNS}
              rows={data?.rows ?? []}
              rowKey={(row) => row.id}
              caption="Orders"
              sort={sort}
              onSort={(columnId) => setSort(columnId as typeof sort.field)}
              onRowClick={(row) => setSelectedId(row.id)}
              activeRowKey={selectedId}
              // `isPending` is only true on a genuinely cold query. Paging
              // keeps the previous rows on screen instead of flashing
              // skeletons, which is what `placeholderData` is for.
              loading={orders.isPending}
              skeletonRows={12}
              empty={
                <EmptyState
                  title="No orders match these filters"
                  description={
                    hasActiveFilters
                      ? 'Try clearing a filter or widening the date range.'
                      : 'There were no orders in this period.'
                  }
                />
              }
            />
          </CardBody>
          {data && data.total > 0 && (
            <CardFooter>
              <Pagination
                page={data.page}
                pageCount={data.pageCount}
                pageSize={data.pageSize}
                total={data.total}
                onChange={setPage}
                busy={orders.isFetching}
              />
            </CardFooter>
          )}
        </Card>
      )}

      <Drawer
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        title={selected.data?.reference ?? 'Order'}
      >
        <OrderDetail
          order={selected.data}
          loading={selected.isPending}
          error={selected.error}
          onRetry={() => void selected.refetch()}
        />
      </Drawer>
    </>
  );
}
