import type { ReactNode } from 'react';
import styles from './ChartTooltip.module.css';

export interface TooltipRow {
  label: string;
  value: string;
  /** Series colour, drawn as a swatch. Omit for plain rows. */
  color?: string;
}

export interface ChartTooltipProps {
  /** Position in container pixels - the anchor point, not the box origin. */
  x: number;
  y: number;
  containerWidth: number;
  title: string;
  rows: TooltipRow[];
  footer?: ReactNode;
}

const ESTIMATED_WIDTH = 200;

/**
 * A tooltip positioned in the chart's own coordinate space.
 *
 * Rendered as a sibling div rather than inside the SVG: text in SVG cannot
 * wrap, has no box model and would need every border and background drawn by
 * hand. It is `aria-hidden` because it mirrors information the chart already
 * exposes through its label and hidden data table - announcing it again on
 * every pointer move would be noise.
 */
export function ChartTooltip({ x, y, containerWidth, title, rows, footer }: ChartTooltipProps) {
  // Flip to the left of the cursor when there is not enough room on the right,
  // so the tooltip never hangs off the edge of the card.
  const flip = x + ESTIMATED_WIDTH > containerWidth;

  return (
    <div
      className={styles['tooltip']}
      style={{
        left: x,
        top: y,
        transform: `translate(${flip ? 'calc(-100% - 12px)' : '12px'}, -50%)`,
      }}
      aria-hidden="true"
    >
      <p className={styles['title']}>{title}</p>
      <ul className={styles['rows']}>
        {rows.map((row) => (
          <li key={row.label} className={styles['row']}>
            <span className={styles['rowLabel']}>
              {row.color && (
                <span className={styles['swatch']} style={{ backgroundColor: row.color }} />
              )}
              {row.label}
            </span>
            <span className={styles['rowValue']}>{row.value}</span>
          </li>
        ))}
      </ul>
      {footer && <p className={styles['footer']}>{footer}</p>}
    </div>
  );
}
