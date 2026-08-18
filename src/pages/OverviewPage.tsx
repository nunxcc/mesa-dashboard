import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatTile } from '@/components/ui/StatTile';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { DonutChart } from '@/components/charts/DonutChart';
import { HeatmapChart } from '@/components/charts/HeatmapChart';
import { TrendChart } from '@/components/charts/TrendChart';
import { useChannelBreakdown, useHeatmap, useMetrics, useRevenueSeries } from '@/data/queries';
import { RangePicker } from '@/features/filters/FilterControls';
import { useDashboardFilters } from '@/features/filters/useDashboardFilters';
import { formatCompactCurrency, formatCurrency, formatMinutes, formatNumber } from '@/lib/format';
import { CHANNEL_META } from '@/types/domain';
import styles from './OverviewPage.module.css';

export function OverviewPage() {
  const { filters, preset, setPreset } = useDashboardFilters();

  const metrics = useMetrics(filters);
  const series = useRevenueSeries(filters);
  const channels = useChannelBreakdown(filters);
  const heatmap = useHeatmap(filters);

  const current = metrics.data?.current;
  const previous = metrics.data?.previous;

  const totalGross = channels.data?.reduce((sum, entry) => sum + entry.grossRevenue, 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Overview"
        description="How the restaurant traded over the selected period, across every channel."
        actions={<RangePicker value={preset} onChange={setPreset} />}
      />

      {metrics.isError ? (
        <ErrorState error={metrics.error} onRetry={() => void metrics.refetch()} />
      ) : (
        <div className={styles['stats']}>
          <StatTile
            emphasis
            label="Net revenue"
            value={formatCurrency(current?.netRevenue ?? 0, { decimals: 0 })}
            current={current?.netRevenue}
            previous={previous?.netRevenue}
            loading={metrics.isPending}
          />
          <StatTile
            label="Gross revenue"
            value={formatCurrency(current?.grossRevenue ?? 0, { decimals: 0 })}
            current={current?.grossRevenue}
            previous={previous?.grossRevenue}
            loading={metrics.isPending}
          />
          <StatTile
            label="Commission paid"
            value={formatCurrency(current?.commissionPaid ?? 0, { decimals: 0 })}
            current={current?.commissionPaid}
            previous={previous?.commissionPaid}
            invertDelta
            loading={metrics.isPending}
          />
          <StatTile
            label="Orders"
            value={formatNumber(current?.orderCount ?? 0)}
            current={current?.orderCount}
            previous={previous?.orderCount}
            loading={metrics.isPending}
          />
          <StatTile
            label="Average order"
            value={formatCurrency(current?.averageOrderValue ?? 0)}
            current={current?.averageOrderValue}
            previous={previous?.averageOrderValue}
            loading={metrics.isPending}
          />
          <StatTile
            label="Ticket time"
            value={formatMinutes(Math.round(current?.averagePrepMinutes ?? 0))}
            current={current?.averagePrepMinutes}
            previous={previous?.averagePrepMinutes}
            invertDelta
            loading={metrics.isPending}
          />
        </div>
      )}

      <div className={styles['grid']}>
        <Card className={styles['wide']}>
          <CardHeader
            title="Revenue"
            description="Gross takings against what the restaurant keeps after commission."
          />
          <CardBody>
            {series.isError ? (
              <ErrorState compact error={series.error} onRetry={() => void series.refetch()} />
            ) : series.data && series.data.buckets.length === 0 ? (
              <EmptyState
                compact
                title="No orders in this period"
                description="Try widening the date range."
              />
            ) : (
              <TrendChart
                buckets={series.data?.buckets ?? []}
                granularity={series.data?.granularity ?? 'day'}
                loading={series.isPending}
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Where revenue comes from" description="Gross revenue by channel." />
          <CardBody>
            {channels.isError ? (
              <ErrorState compact error={channels.error} onRetry={() => void channels.refetch()} />
            ) : (
              <DonutChart
                loading={channels.isPending}
                centerLabel="Gross"
                centerValue={formatCompactCurrency(totalGross)}
                slices={(channels.data ?? [])
                  // Channels with no trade in the period would render as
                  // zero-width slivers and clutter the legend.
                  .filter((entry) => entry.grossRevenue > 0)
                  .map((entry) => ({
                    id: entry.channel,
                    label: CHANNEL_META[entry.channel].label,
                    value: entry.grossRevenue,
                    color: `var(${CHANNEL_META[entry.channel].colorVar})`,
                  }))}
              />
            )}
          </CardBody>
        </Card>

        <Card className={styles['full']}>
          <CardHeader
            title="When the kitchen is busy"
            description="Orders by weekday and hour. Hatched rows are days the restaurant is closed."
          />
          <CardBody>
            {heatmap.isError ? (
              <ErrorState compact error={heatmap.error} onRetry={() => void heatmap.refetch()} />
            ) : (
              <HeatmapChart cells={heatmap.data ?? []} loading={heatmap.isPending} />
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
