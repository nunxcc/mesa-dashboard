import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatTile } from '@/components/ui/StatTile';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { CommissionBars } from '@/features/channels/CommissionBars';
import { RangePicker } from '@/features/filters/FilterControls';
import { useDashboardFilters } from '@/features/filters/useDashboardFilters';
import { useChannelBreakdown, useMetrics } from '@/data/queries';
import {
  formatCurrency,
  formatMinutes,
  formatNumber,
  formatPercent,
  formatRating,
} from '@/lib/format';
import { CHANNEL_META, type ChannelBreakdown } from '@/types/domain';
import styles from './ChannelsPage.module.css';

const COLUMNS: Column<ChannelBreakdown>[] = [
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
  { id: 'orders', header: 'Orders', align: 'right', cell: (row) => formatNumber(row.orderCount) },
  {
    id: 'aov',
    header: 'Avg order',
    align: 'right',
    cell: (row) => formatCurrency(row.averageOrderValue),
  },
  {
    id: 'gross',
    header: 'Gross',
    align: 'right',
    cell: (row) => formatCurrency(row.grossRevenue, { decimals: 0 }),
  },
  {
    id: 'commission',
    header: 'Commission',
    align: 'right',
    cell: (row) =>
      row.commissionPaid === 0 ? (
        <span className={styles['muted']}>—</span>
      ) : (
        <span className={styles['negative']}>
          −{formatCurrency(row.commissionPaid, { decimals: 0 })}
        </span>
      ),
  },
  {
    id: 'net',
    header: 'Net',
    align: 'right',
    cell: (row) => <strong>{formatCurrency(row.netRevenue, { decimals: 0 })}</strong>,
  },
  {
    id: 'prep',
    header: 'Ticket time',
    align: 'right',
    secondary: true,
    cell: (row) => formatMinutes(Math.round(row.averagePrepMinutes)),
  },
  {
    id: 'rating',
    header: 'Rating',
    align: 'right',
    secondary: true,
    cell: (row) => formatRating(row.averageRating),
  },
];

export function ChannelsPage() {
  const { filters, preset, setPreset } = useDashboardFilters();
  const channels = useChannelBreakdown(filters);
  const metrics = useMetrics(filters);

  const rows = channels.data ?? [];
  const delivery = rows.filter((row) => CHANNEL_META[row.channel].kind === 'delivery');

  const deliveryGross = delivery.reduce((sum, row) => sum + row.grossRevenue, 0);
  const totalCommission = rows.reduce((sum, row) => sum + row.commissionPaid, 0);
  const totalGross = rows.reduce((sum, row) => sum + row.grossRevenue, 0);
  const netRevenue = metrics.data?.current.netRevenue ?? 0;

  const blendedDeliveryRate = deliveryGross === 0 ? 0 : totalCommission / deliveryGross;
  const commissionAgainstNet = netRevenue === 0 ? 0 : totalCommission / netRevenue;
  const deliveryShare = totalGross === 0 ? 0 : deliveryGross / totalGross;

  const worstChannel = [...delivery].sort((a, b) => b.commissionPaid - a.commissionPaid)[0];

  return (
    <>
      <PageHeader
        title="Channels"
        description="Every euro sold through a marketplace arrives with a commission attached. This is what that costs."
        actions={<RangePicker value={preset} onChange={setPreset} />}
      />

      {channels.isError ? (
        <ErrorState error={channels.error} onRetry={() => void channels.refetch()} />
      ) : (
        <>
          <div className={styles['stats']}>
            <StatTile
              emphasis
              label="Commission paid"
              value={formatCurrency(totalCommission, { decimals: 0 })}
              current={totalCommission}
              previous={metrics.data?.previous.commissionPaid}
              invertDelta
              loading={channels.isPending}
            />
            <StatTile
              label="Delivery share of sales"
              value={formatPercent(deliveryShare, { decimals: 1 })}
              footnote={`${formatCurrency(deliveryGross, { decimals: 0 })} through marketplaces`}
              loading={channels.isPending}
            />
            <StatTile
              label="Blended delivery rate"
              value={formatPercent(blendedDeliveryRate, { decimals: 1 })}
              footnote="Weighted across all three platforms"
              loading={channels.isPending}
            />
            <StatTile
              label="Cost vs net revenue"
              value={formatPercent(commissionAgainstNet, { decimals: 1 })}
              footnote="Commission as a share of what was kept"
              loading={channels.isPending}
            />
          </div>

          {/*
            The number on its own does not land. Stating it as a share of what
            the restaurant actually keeps is what makes it legible to whoever
            has to decide whether the delivery channel is worth running.
          */}
          {!channels.isPending && totalCommission > 0 && (
            <aside className={styles['insight']}>
              <p className={styles['insightTitle']}>
                Marketplaces took {formatCurrency(totalCommission, { decimals: 0 })} this period.
              </p>
              <p className={styles['insightBody']}>
                That is {formatPercent(commissionAgainstNet, { decimals: 1 })} of everything the
                restaurant kept, on {formatPercent(deliveryShare, { decimals: 1 })} of sales.
                {worstChannel && (
                  <>
                    {' '}
                    {CHANNEL_META[worstChannel.channel].label} alone accounts for{' '}
                    {formatCurrency(worstChannel.commissionPaid, { decimals: 0 })} of it.
                  </>
                )}
              </p>
            </aside>
          )}

          <div className={styles['grid']}>
            <Card>
              <CardHeader
                title="What each channel actually returns"
                description="Bar width is gross revenue. The hatched portion never reaches the till."
              />
              <CardBody>
                {rows.length === 0 && !channels.isPending ? (
                  <EmptyState
                    compact
                    title="No sales in this period"
                    description="Try widening the date range."
                  />
                ) : (
                  <CommissionBars
                    breakdown={rows.filter((row) => row.grossRevenue > 0)}
                    loading={channels.isPending}
                  />
                )}
              </CardBody>
            </Card>

            <Card flush>
              <CardHeader
                title="Channel comparison"
                description="Delivery buys volume at a worse ticket time and a thinner margin."
              />
              <CardBody>
                <DataTable
                  columns={COLUMNS}
                  rows={rows}
                  rowKey={(row) => row.channel}
                  caption="Performance by sales channel"
                  loading={channels.isPending}
                  skeletonRows={5}
                  empty={
                    <EmptyState
                      compact
                      title="No sales in this period"
                      description="Try widening the date range."
                    />
                  }
                />
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
