import { area, curveMonotoneX, line } from 'd3-shape';
import { scaleLinear, scaleTime, type ScaleLinear, type ScaleTime } from 'd3-scale';
import { useId, useMemo, useState } from 'react';
import type { TimeBucket } from '@/types/domain';
import type { Granularity } from '@/data/aggregate';
import { formatCompactCurrency, formatCurrency, formatDateShort, formatNumber } from '@/lib/format';
import { AxisBottom, AxisLeft, ChartFrame, GridLines } from './ChartFrame';
import { ChartTooltip } from './ChartTooltip';
import styles from './TrendChart.module.css';

export interface TrendChartProps {
  buckets: TimeBucket[];
  granularity: Granularity;
  height?: number;
  loading?: boolean;
}

const BUCKET_LABEL: Record<Granularity, string> = {
  hour: 'Hour',
  day: 'Day',
  week: 'Week beginning',
  month: 'Month',
};

interface Scales {
  x: ScaleTime<number, number>;
  y: ScaleLinear<number, number>;
}

/**
 * Gross revenue as a filled area, net revenue as a dashed line inside it.
 *
 * The point of drawing both is the gap between them: that band is the
 * commission the delivery platforms take, and showing it as an absence is far
 * more legible than a third series competing for the same space.
 */
export function TrendChart({
  buckets,
  granularity,
  height = 260,
  loading = false,
}: TrendChartProps) {
  const gradientId = useId();
  const [hovered, setHovered] = useState<number | null>(null);

  const summary = useMemo(() => {
    if (buckets.length === 0) return 'No revenue data in this period.';
    const first = buckets[0];
    const last = buckets[buckets.length - 1];
    const total = buckets.reduce((sum, bucket) => sum + bucket.grossRevenue, 0);
    return (
      `Gross and net revenue by ${granularity}, from ${formatDateShort(first?.date ?? '')} to ` +
      `${formatDateShort(last?.date ?? '')}, totalling ${formatCurrency(total, { decimals: 0 })} gross.`
    );
  }, [buckets, granularity]);

  // Cheap to rebuild and depends on measured width, so both the SVG layer and
  // the overlay layer derive it rather than trying to share one instance.
  const buildScales = (innerWidth: number, innerHeight: number): Scales | null => {
    if (buckets.length === 0) return null;
    const dates = buckets.map((bucket) => new Date(bucket.date));
    const first = dates[0];
    const last = dates[dates.length - 1];
    if (!first || !last) return null;

    return {
      x: scaleTime().domain([first, last]).range([0, innerWidth]),
      // `nice()` rounds the axis top to a readable number, so ticks land on
      // 20 000 rather than 19 431.
      y: scaleLinear()
        .domain([0, Math.max(...buckets.map((bucket) => bucket.grossRevenue), 1)])
        .nice(5)
        .range([innerHeight, 0]),
    };
  };

  const active = hovered !== null ? buckets[hovered] : undefined;

  return (
    <ChartFrame
      height={height}
      description={summary}
      loading={loading}
      table={<DataTable buckets={buckets} />}
      overlay={({ innerWidth, innerHeight, margin, width }) => {
        const scales = buildScales(innerWidth, innerHeight);
        if (!scales || !active) return null;

        return (
          <ChartTooltip
            x={margin.left + scales.x(new Date(active.date))}
            y={margin.top + scales.y(active.grossRevenue)}
            containerWidth={width}
            title={`${BUCKET_LABEL[granularity]} · ${formatDateShort(active.date)}`}
            rows={[
              {
                label: 'Gross',
                value: formatCurrency(active.grossRevenue, { decimals: 0 }),
                color: 'var(--color-accent)',
              },
              {
                label: 'Net',
                value: formatCurrency(active.netRevenue, { decimals: 0 }),
                color: 'var(--color-text-secondary)',
              },
              { label: 'Orders', value: formatNumber(active.orderCount) },
            ]}
            footer={
              active.grossRevenue > active.netRevenue
                ? `${formatCurrency(active.grossRevenue - active.netRevenue, {
                    decimals: 0,
                  })} lost to commission`
                : undefined
            }
          />
        );
      }}
    >
      {({ innerWidth, innerHeight, margin }) => {
        const scales = buildScales(innerWidth, innerHeight);
        if (!scales) return null;
        const { x, y } = scales;

        const yTicks = y.ticks(4);

        const areaPath = area<TimeBucket>()
          .x((bucket) => x(new Date(bucket.date)))
          .y0(innerHeight)
          .y1((bucket) => y(bucket.grossRevenue))
          .curve(curveMonotoneX);

        const grossLine = line<TimeBucket>()
          .x((bucket) => x(new Date(bucket.date)))
          .y((bucket) => y(bucket.grossRevenue))
          .curve(curveMonotoneX);

        const netLine = line<TimeBucket>()
          .x((bucket) => x(new Date(bucket.date)))
          .y((bucket) => y(bucket.netRevenue))
          .curve(curveMonotoneX);

        return (
          <>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            <g transform={`translate(${margin.left},${margin.top})`}>
              <GridLines ticks={yTicks} innerWidth={innerWidth} scale={y} />
              <AxisLeft ticks={yTicks} scale={y} format={formatCompactCurrency} />
              <AxisBottom
                ticks={pickTimeTicks(buckets, (date) => x(date), innerWidth)}
                innerHeight={innerHeight}
              />

              <path d={areaPath(buckets) ?? undefined} fill={`url(#${gradientId})`} />
              <path d={grossLine(buckets) ?? undefined} className={styles['grossLine']} />
              <path d={netLine(buckets) ?? undefined} className={styles['netLine']} />

              {active && (
                <g className={styles['marker']}>
                  <line
                    x1={x(new Date(active.date))}
                    x2={x(new Date(active.date))}
                    y1={0}
                    y2={innerHeight}
                    className={styles['guide']}
                  />
                  <circle
                    cx={x(new Date(active.date))}
                    cy={y(active.grossRevenue)}
                    r={4}
                    className={styles['dotGross']}
                  />
                  <circle
                    cx={x(new Date(active.date))}
                    cy={y(active.netRevenue)}
                    r={3.5}
                    className={styles['dotNet']}
                  />
                </g>
              )}

              {/*
                One transparent rect hit-tests the whole plot. Listeners on each
                point would miss the gaps between them and make a thin series
                nearly impossible to hover.
              */}
              <rect
                width={innerWidth}
                height={innerHeight}
                fill="transparent"
                onPointerMove={(event) => {
                  const bounds = event.currentTarget.getBoundingClientRect();
                  setHovered(nearestIndex(buckets, x, event.clientX - bounds.left));
                }}
                onPointerLeave={() => setHovered(null)}
              />
            </g>
          </>
        );
      }}
    </ChartFrame>
  );
}

/** Nearest bucket to a pixel position along x. */
function nearestIndex(
  buckets: TimeBucket[],
  x: (date: Date) => number,
  position: number,
): number | null {
  if (buckets.length === 0) return null;
  let best = 0;
  let bestDistance = Infinity;
  for (let index = 0; index < buckets.length; index += 1) {
    const bucket = buckets[index];
    if (!bucket) continue;
    const distance = Math.abs(x(new Date(bucket.date)) - position);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  return best;
}

/**
 * Evenly spaced labels, capped by how many fit without colliding. Letting d3
 * pick would put thirty labels on a thirty-day range.
 */
function pickTimeTicks(
  buckets: TimeBucket[],
  x: (date: Date) => number,
  innerWidth: number,
): { value: number; label: string }[] {
  if (buckets.length === 0) return [];
  const maxTicks = Math.max(2, Math.min(7, Math.floor(innerWidth / 90)));
  const step = Math.max(1, Math.ceil(buckets.length / maxTicks));

  const ticks: { value: number; label: string }[] = [];
  for (let index = 0; index < buckets.length; index += step) {
    const bucket = buckets[index];
    if (!bucket) continue;
    ticks.push({ value: x(new Date(bucket.date)), label: formatDateShort(bucket.date) });
  }
  return ticks;
}

/** Read by screen readers in place of the graphic. */
function DataTable({ buckets }: { buckets: TimeBucket[] }) {
  return (
    <table>
      <caption>Revenue by period</caption>
      <thead>
        <tr>
          <th scope="col">Period</th>
          <th scope="col">Gross revenue</th>
          <th scope="col">Net revenue</th>
          <th scope="col">Orders</th>
        </tr>
      </thead>
      <tbody>
        {buckets.map((bucket) => (
          <tr key={bucket.date}>
            <th scope="row">{formatDateShort(bucket.date)}</th>
            <td>{formatCurrency(bucket.grossRevenue, { decimals: 0 })}</td>
            <td>{formatCurrency(bucket.netRevenue, { decimals: 0 })}</td>
            <td>{formatNumber(bucket.orderCount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
