import { useMemo, useState } from 'react';
import type { HeatmapCell } from '@/types/domain';
import { formatCurrency, formatHour, formatNumber, formatWeekday } from '@/lib/format';
import { Skeleton } from '@/components/ui/Skeleton';
import styles from './HeatmapChart.module.css';

export interface HeatmapChartProps {
  cells: HeatmapCell[];
  loading?: boolean;
}

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

/**
 * Orders by weekday and hour.
 *
 * Built as a real `<table>` rather than an SVG. A heatmap *is* a table — it
 * has row headers, column headers and a value per cell — so the semantic
 * element gives correct screen-reader navigation for free, and the visual
 * treatment is just a background colour. Reaching for SVG here would mean
 * rebuilding all of that by hand for no gain.
 */
export function HeatmapChart({ cells, loading = false }: HeatmapChartProps) {
  const [active, setActive] = useState<HeatmapCell | null>(null);

  const { grid, hours, max, closedDays } = useMemo(() => {
    const grid = new Map<string, HeatmapCell>();
    const hourSet = new Set<number>();
    const dayTotals = new Map<number, number>();
    let max = 0;

    for (const cell of cells) {
      grid.set(`${cell.weekday}-${cell.hour}`, cell);
      hourSet.add(cell.hour);
      dayTotals.set(cell.weekday, (dayTotals.get(cell.weekday) ?? 0) + cell.orderCount);
      if (cell.orderCount > max) max = cell.orderCount;
    }

    return {
      grid,
      hours: [...hourSet].sort((a, b) => a - b),
      max,
      // A day with no orders all week is a closing day, not a quiet one, and
      // deserves to be labelled rather than rendered as an unexplained blank.
      closedDays: new Set(
        WEEKDAYS.filter((weekday) => (dayTotals.get(weekday) ?? 0) === 0),
      ),
    };
  }, [cells]);

  if (loading) return <Skeleton width="100%" height="13rem" rounded={false} />;

  return (
    <div className={styles['wrapper']}>
      <div className={styles['scroll']}>
        <table className={styles['table']}>
          <caption className="sr-only">
            Orders by day of week and hour of day. Rows are weekdays, columns are hours.
          </caption>
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Day</span>
              </th>
              {hours.map((hour) => (
                <th key={hour} scope="col" className={styles['hourHead']}>
                  {/* Every other label only — twelve stacked hour labels
                      collide well before the grid runs out of room. */}
                  {hour % 2 === 0 ? formatHour(hour) : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS.map((weekday) => {
              const closed = closedDays.has(weekday);
              return (
                <tr key={weekday}>
                  <th scope="row" className={styles['dayHead']} data-closed={closed || undefined}>
                    {formatWeekday(weekday)}
                  </th>
                  {hours.map((hour) => {
                    const cell = grid.get(`${weekday}-${hour}`);
                    const count = cell?.orderCount ?? 0;
                    const intensity = max === 0 ? 0 : count / max;

                    return (
                      <td key={hour} className={styles['cellWrap']}>
                        <div
                          className={styles['cell']}
                          data-empty={count === 0 || undefined}
                          data-closed={closed || undefined}
                          data-active={active === cell && cell ? '' : undefined}
                          style={{
                            // A floor of 8 % keeps a single-order hour visible;
                            // a pure linear ramp makes the quiet hours vanish.
                            backgroundColor:
                              count === 0
                                ? undefined
                                : `color-mix(in srgb, var(--color-accent) ${
                                    8 + intensity * 84
                                  }%, transparent)`,
                          }}
                          onPointerEnter={() => cell && setActive(cell)}
                          onPointerLeave={() => setActive(null)}
                        >
                          <span className="sr-only">
                            {formatWeekday(weekday)} {formatHour(hour)}: {formatNumber(count)}{' '}
                            orders
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles['footer']}>
        <div className={styles['readout']} aria-live="polite">
          {active ? (
            <>
              <strong>
                {formatWeekday(active.weekday)} {formatHour(active.hour)}
              </strong>
              <span>{formatNumber(active.orderCount)} orders</span>
              <span>{formatCurrency(active.grossRevenue, { decimals: 0 })}</span>
            </>
          ) : (
            <span className={styles['hint']}>Hover a cell for detail</span>
          )}
        </div>

        <div className={styles['scale']} aria-hidden="true">
          <span className={styles['scaleLabel']}>Quiet</span>
          {[0.08, 0.3, 0.5, 0.72, 0.92].map((step) => (
            <span
              key={step}
              className={styles['scaleSwatch']}
              style={{
                backgroundColor: `color-mix(in srgb, var(--color-accent) ${step * 100}%, transparent)`,
              }}
            />
          ))}
          <span className={styles['scaleLabel']}>Busy</span>
        </div>
      </div>
    </div>
  );
}
