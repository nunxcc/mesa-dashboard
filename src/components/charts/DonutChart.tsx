import { arc, pie } from 'd3-shape';
import { useState } from 'react';
import { formatCompactCurrency, formatCurrency, formatPercent } from '@/lib/format';
import { ChartFrame } from './ChartFrame';
import styles from './DonutChart.module.css';

export interface DonutSlice {
  id: string;
  label: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  slices: DonutSlice[];
  /** Rendered in the hole. Usually the total the slices add up to. */
  centerLabel: string;
  centerValue: string;
  height?: number;
  loading?: boolean;
}

/**
 * A donut rather than a pie: the hole carries the total, which is the number
 * people actually want, and removing the centre wedges makes the small slices
 * easier to tell apart at the rim.
 *
 * Five channels is about the limit — past roughly seven categories a ranked
 * bar chart is simply easier to read, and this deliberately does not scale
 * beyond what it is good at.
 */
export function DonutChart({
  slices,
  centerLabel,
  centerValue,
  height = 240,
  loading = false,
}: DonutChartProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  const summary =
    total === 0
      ? 'No revenue to break down in this period.'
      : `Revenue share by channel: ${slices
          .map((slice) => `${slice.label} ${formatPercent(slice.value / total, { decimals: 0 })}`)
          .join(', ')}.`;

  return (
    <div className={styles['layout']}>
      <ChartFrame
        height={height}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        description={summary}
        loading={loading}
      >
        {({ width, innerHeight }) => {
          if (total === 0) return null;

          const radius = Math.min(width, innerHeight) / 2;
          const layout = pie<DonutSlice>()
            .value((slice) => slice.value)
            // Preserve the caller's ordering (already sorted by revenue)
            // rather than letting d3 re-sort by value.
            .sort(null)
            .padAngle(0.012);

          const shape = arc<ReturnType<typeof layout>[number]>()
            .innerRadius(radius * 0.62)
            .outerRadius(radius)
            .cornerRadius(2);

          const hoverShape = arc<ReturnType<typeof layout>[number]>()
            .innerRadius(radius * 0.6)
            .outerRadius(radius * 1.04)
            .cornerRadius(2);

          return (
            <g transform={`translate(${width / 2},${innerHeight / 2})`}>
              {layout(slices).map((segment) => {
                const isHovered = hovered === segment.data.id;
                return (
                  <path
                    key={segment.data.id}
                    d={(isHovered ? hoverShape(segment) : shape(segment)) ?? undefined}
                    fill={segment.data.color}
                    className={styles['slice']}
                    opacity={hovered === null || isHovered ? 1 : 0.4}
                    onPointerEnter={() => setHovered(segment.data.id)}
                    onPointerLeave={() => setHovered(null)}
                  />
                );
              })}

              <text className={styles['centerValue']} dy="-0.1em">
                {centerValue}
              </text>
              <text className={styles['centerLabel']} dy="1.4em">
                {centerLabel}
              </text>
            </g>
          );
        }}
      </ChartFrame>

      {/*
        The legend is the chart's real interface: it carries the values, so the
        graphic never has to fit text into a thin wedge. Buttons rather than
        list items so it works on touch, where there is no hover.
      */}
      <ul className={styles['legend']} role="list">
        {slices.map((slice) => (
          <li key={slice.id}>
            <button
              type="button"
              className={styles['legendItem']}
              data-dimmed={hovered !== null && hovered !== slice.id ? '' : undefined}
              onPointerEnter={() => setHovered(slice.id)}
              onPointerLeave={() => setHovered(null)}
              onFocus={() => setHovered(slice.id)}
              onBlur={() => setHovered(null)}
            >
              <span className={styles['swatch']} style={{ backgroundColor: slice.color }} />
              <span className={styles['legendLabel']}>{slice.label}</span>
              <span className={styles['legendValue']}>{formatCompactCurrency(slice.value)}</span>
              <span className={styles['legendShare']}>
                {total === 0 ? '—' : formatPercent(slice.value / total, { decimals: 0 })}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="sr-only">
        <table>
          <caption>Revenue by channel</caption>
          <thead>
            <tr>
              <th scope="col">Channel</th>
              <th scope="col">Revenue</th>
              <th scope="col">Share</th>
            </tr>
          </thead>
          <tbody>
            {slices.map((slice) => (
              <tr key={slice.id}>
                <th scope="row">{slice.label}</th>
                <td>{formatCurrency(slice.value, { decimals: 0 })}</td>
                <td>{total === 0 ? '—' : formatPercent(slice.value / total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
