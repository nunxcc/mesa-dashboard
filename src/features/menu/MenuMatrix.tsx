import { scaleLinear, scaleSqrt } from 'd3-scale';
import { useMemo, useState } from 'react';
import type { MenuItemPerformance } from '@/types/domain';
import { MENU_CATEGORY_LABEL } from '@/types/domain';
import { AxisBottom, AxisLeft, ChartFrame, GridLines } from '@/components/charts/ChartFrame';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { formatCompactNumber, formatCurrency, formatNumber, formatPercent } from '@/lib/format';
import { QUADRANT_META, classifyMenu, type Quadrant } from './classification';
import styles from './MenuMatrix.module.css';

export interface MenuMatrixProps {
  performance: MenuItemPerformance[];
  loading?: boolean;
  height?: number;
}

/**
 * The menu engineering matrix: units sold against contribution per plate,
 * split at the medians of both axes.
 *
 * This is the one chart on the page worth more than a sorted table, because
 * position encodes a recommendation rather than just a value.
 */
export function MenuMatrix({ performance, loading = false, height = 380 }: MenuMatrixProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const { points, medianUnits, medianContribution, counts } = useMemo(
    () => classifyMenu(performance),
    [performance],
  );

  const summary =
    points.length === 0
      ? 'No items sold in this period.'
      : `Menu engineering matrix of ${points.length} items: ${counts.star} stars, ` +
        `${counts.plowhorse} plowhorses, ${counts.puzzle} puzzles, ${counts.dog} dogs.`;

  const active = points.find((point) => point.entry.item.id === hovered);

  const buildScales = (innerWidth: number, innerHeight: number) => ({
    x: scaleLinear()
      .domain([0, Math.max(...points.map((point) => point.entry.unitsSold), 1)])
      .nice(5)
      .range([0, innerWidth]),
    y: scaleLinear()
      .domain([0, Math.max(...points.map((point) => point.contribution), 1)])
      .nice(5)
      .range([innerHeight, 0]),
    // Area, not radius, encodes revenue - sqrt is what stops a dish earning
    // four times as much from looking sixteen times as important.
    r: scaleSqrt()
      .domain([0, Math.max(...points.map((point) => point.entry.grossRevenue), 1)])
      .range([4, 17]),
  });

  return (
    <div className={styles['wrapper']}>
      <ChartFrame
        height={height}
        margin={{ top: 16, right: 20, bottom: 44, left: 58 }}
        description={summary}
        loading={loading}
        table={<MatrixTable points={points} />}
        overlay={({ innerWidth, innerHeight, margin, width }) => {
          if (!active || points.length === 0) return null;
          const { x, y } = buildScales(innerWidth, innerHeight);
          const meta = QUADRANT_META[active.quadrant];

          return (
            <ChartTooltip
              x={margin.left + x(active.entry.unitsSold)}
              y={margin.top + y(active.contribution)}
              containerWidth={width}
              title={active.entry.item.name}
              rows={[
                {
                  label: meta.label,
                  value: MENU_CATEGORY_LABEL[active.entry.item.category],
                  color: `var(${meta.colorVar})`,
                },
                { label: 'Units sold', value: formatNumber(active.entry.unitsSold) },
                { label: 'Per plate', value: formatCurrency(active.contribution) },
                { label: 'Margin', value: formatPercent(active.entry.margin, { decimals: 0 }) },
                {
                  label: 'Revenue',
                  value: formatCurrency(active.entry.grossRevenue, { decimals: 0 }),
                },
              ]}
            />
          );
        }}
      >
        {({ innerWidth, innerHeight, margin }) => {
          if (points.length === 0) return null;
          const { x, y, r } = buildScales(innerWidth, innerHeight);
          const yTicks = y.ticks(4);
          const midX = x(medianUnits);
          const midY = y(medianContribution);

          return (
            <g transform={`translate(${margin.left},${margin.top})`}>
              <GridLines ticks={yTicks} innerWidth={innerWidth} scale={y} />

              {/* Dividers sit at the medians, which is what makes the
                  classification relative to this menu rather than to an
                  arbitrary absolute threshold. */}
              <line x1={midX} x2={midX} y1={0} y2={innerHeight} className={styles['divider']} />
              <line x1={0} x2={innerWidth} y1={midY} y2={midY} className={styles['divider']} />

              <text x={innerWidth - 6} y={14} className={styles['quadrantLabel']}>
                Stars
              </text>
              <text x={6} y={14} className={styles['quadrantLabelStart']}>
                Puzzles
              </text>
              <text x={innerWidth - 6} y={innerHeight - 8} className={styles['quadrantLabel']}>
                Plowhorses
              </text>
              <text x={6} y={innerHeight - 8} className={styles['quadrantLabelStart']}>
                Dogs
              </text>

              <AxisLeft
                ticks={yTicks}
                scale={y}
                format={(value) => formatCurrency(value, { decimals: 0 })}
              />
              <AxisBottom
                ticks={x
                  .ticks(5)
                  .map((tick) => ({ value: x(tick), label: formatCompactNumber(tick) }))}
                innerHeight={innerHeight}
              />
              <text x={innerWidth / 2} y={innerHeight + 38} className={styles['axisTitle']}>
                Units sold
              </text>

              {points.map((point) => {
                const isActive = hovered === point.entry.item.id;
                return (
                  <circle
                    key={point.entry.item.id}
                    cx={x(point.entry.unitsSold)}
                    cy={y(point.contribution)}
                    r={r(point.entry.grossRevenue)}
                    fill={`var(${QUADRANT_META[point.quadrant].colorVar})`}
                    className={styles['dot']}
                    opacity={hovered === null ? 0.68 : isActive ? 1 : 0.22}
                    onPointerEnter={() => setHovered(point.entry.item.id)}
                    onPointerLeave={() => setHovered(null)}
                  />
                );
              })}
            </g>
          );
        }}
      </ChartFrame>

      <ul className={styles['legend']} role="list">
        {(Object.keys(QUADRANT_META) as Quadrant[]).map((quadrant) => (
          <li key={quadrant} className={styles['legendItem']}>
            <span
              className={styles['swatch']}
              style={{ backgroundColor: `var(${QUADRANT_META[quadrant].colorVar})` }}
              aria-hidden="true"
            />
            <span className={styles['legendText']}>
              <strong>
                {QUADRANT_META[quadrant].label}s ({counts[quadrant]})
              </strong>
              {QUADRANT_META[quadrant].advice}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MatrixTable({
  points,
}: {
  points: { entry: MenuItemPerformance; contribution: number; quadrant: Quadrant }[];
}) {
  return (
    <table>
      <caption>Menu items by popularity and contribution margin</caption>
      <thead>
        <tr>
          <th scope="col">Item</th>
          <th scope="col">Classification</th>
          <th scope="col">Units sold</th>
          <th scope="col">Margin per plate</th>
        </tr>
      </thead>
      <tbody>
        {points.map((point) => (
          <tr key={point.entry.item.id}>
            <th scope="row">{point.entry.item.name}</th>
            <td>{QUADRANT_META[point.quadrant].label}</td>
            <td>{formatNumber(point.entry.unitsSold)}</td>
            <td>{formatCurrency(point.contribution)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
