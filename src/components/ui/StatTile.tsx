import clsx from 'clsx';
import type { ReactNode } from 'react';
import { formatSignedPercent, percentChange } from '@/lib/format';
import { Icon } from './Icon';
import { Skeleton } from './Skeleton';
import styles from './StatTile.module.css';

export interface StatTileProps {
  label: string;
  value: string;
  /** Raw current and previous values, so the tile computes its own delta. */
  current?: number;
  previous?: number;
  /**
   * Whether a rise is good. Commission paid and ticket time both go up when
   * things go wrong, so they colour the opposite way to revenue.
   */
  invertDelta?: boolean;
  /** Replaces the delta with static text — for metrics with no comparison. */
  footnote?: ReactNode;
  loading?: boolean;
  emphasis?: boolean;
}

export function StatTile({
  label,
  value,
  current,
  previous,
  invertDelta = false,
  footnote,
  loading = false,
  emphasis = false,
}: StatTileProps) {
  const change =
    current !== undefined && previous !== undefined ? percentChange(current, previous) : null;

  // A change of a few tenths of a percent is noise, not a trend, and colouring
  // it green or red invites people to read meaning into rounding.
  const direction = change === null || Math.abs(change) < 0.005 ? 'flat' : change > 0 ? 'up' : 'down';
  const good = direction === 'flat' ? null : (direction === 'up') !== invertDelta;

  return (
    <div className={clsx(styles['tile'], emphasis && styles['emphasis'])}>
      <p className={styles['label']}>{label}</p>

      {loading ? (
        <Skeleton width="7ch" height="1.9rem" rounded={false} className={styles['valueSkeleton']} />
      ) : (
        <p className={styles['value']}>{value}</p>
      )}

      {loading ? (
        <Skeleton width="10ch" height="0.9rem" />
      ) : change !== null ? (
        <p
          className={clsx(
            styles['delta'],
            good === true && styles['good'],
            good === false && styles['bad'],
          )}
        >
          {/* A flat reading gets a dash, never an arrow. Pointing an arrow at
              a −0,1 % move claims a direction the number does not support. */}
          {direction === 'flat' ? (
            <span className={styles['flatMark']} aria-hidden="true">
              –
            </span>
          ) : (
            <Icon name={direction === 'down' ? 'arrowDown' : 'arrowUp'} size={13} />
          )}
          {formatSignedPercent(change)}
          <span className={styles['deltaLabel']}>vs previous period</span>
        </p>
      ) : footnote ? (
        <p className={styles['footnote']}>{footnote}</p>
      ) : (
        <p className={styles['footnote']}>No prior period to compare</p>
      )}
    </div>
  );
}
