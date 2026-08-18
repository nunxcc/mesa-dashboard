import type { ReactNode } from 'react';
import { useElementSize } from '@/lib/hooks/useElementSize';
import { Skeleton } from '@/components/ui/Skeleton';
import styles from './ChartFrame.module.css';

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ChartDimensions {
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  margin: Margin;
}

export interface ChartFrameProps {
  height: number;
  margin?: Partial<Margin>;
  /**
   * Read aloud in place of the graphic. Should state the shape of the data,
   * not just its title — "Revenue rose from 18k to 24k across June" tells a
   * screen-reader user what a sighted user gets from one glance.
   */
  description: string;
  /** Rendered visually hidden after the chart, for non-visual reading. */
  table?: ReactNode;
  loading?: boolean;
  children: (dimensions: ChartDimensions) => ReactNode;
  /**
   * HTML rendered over the chart, as a sibling of the SVG rather than inside
   * it. Tooltips live here: `foreignObject` clips its contents and resets the
   * containing block, so an absolutely positioned box inside one cannot escape
   * the chart bounds to sit beside a point near the edge.
   */
  overlay?: (dimensions: ChartDimensions) => ReactNode;
}

const DEFAULT_MARGIN: Margin = { top: 12, right: 16, bottom: 28, left: 52 };

/**
 * Measures its container, then hands real pixel dimensions to the chart.
 *
 * SVG cannot size itself from CSS percentages the way a div can — scales need
 * numbers. Everything responsive about these charts starts here, and every
 * chart below shares one set of margin and accessibility conventions as a
 * result.
 */
export function ChartFrame({
  height,
  margin: marginOverride,
  description,
  table,
  loading = false,
  children,
  overlay,
}: ChartFrameProps) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const margin = { ...DEFAULT_MARGIN, ...marginOverride };

  const width = size.width;
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);

  return (
    <div ref={ref} className={styles['frame']} style={{ height }}>
      {loading ? (
        <Skeleton width="100%" height="100%" rounded={false} />
      ) : (
        // The first measurement happens after mount, so width is 0 on the very
        // first paint. Rendering scales against a zero domain produces NaN
        // paths, so wait one frame instead.
        width > 0 && (
          <>
            <svg
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label={description}
              className={styles['svg']}
            >
              {children({ width, height, innerWidth, innerHeight, margin })}
            </svg>
            {overlay?.({ width, height, innerWidth, innerHeight, margin })}
            {table && <div className="sr-only">{table}</div>}
          </>
        )
      )}
    </div>
  );
}

/** Shared horizontal gridlines. Drawn under the data, never over it. */
export function GridLines({
  ticks,
  innerWidth,
  scale,
}: {
  ticks: number[];
  innerWidth: number;
  scale: (value: number) => number;
}) {
  return (
    <g aria-hidden="true">
      {ticks.map((tick) => (
        <line
          key={tick}
          x1={0}
          x2={innerWidth}
          y1={scale(tick)}
          y2={scale(tick)}
          className={styles['gridLine']}
        />
      ))}
    </g>
  );
}

export function AxisLeft({
  ticks,
  scale,
  format,
}: {
  ticks: number[];
  scale: (value: number) => number;
  format: (value: number) => string;
}) {
  return (
    <g aria-hidden="true">
      {ticks.map((tick) => (
        <text key={tick} x={-10} y={scale(tick)} dy="0.32em" className={styles['axisLabelRight']}>
          {format(tick)}
        </text>
      ))}
    </g>
  );
}

export function AxisBottom({
  ticks,
  innerHeight,
}: {
  ticks: { value: number; label: string }[];
  innerHeight: number;
}) {
  return (
    <g aria-hidden="true">
      {ticks.map((tick) => (
        <text
          key={`${tick.value}-${tick.label}`}
          x={tick.value}
          y={innerHeight + 18}
          className={styles['axisLabel']}
        >
          {tick.label}
        </text>
      ))}
    </g>
  );
}
