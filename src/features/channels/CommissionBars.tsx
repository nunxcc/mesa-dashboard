import type { ChannelBreakdown } from '@/types/domain';
import { CHANNEL_META } from '@/types/domain';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatPercent } from '@/lib/format';
import styles from './CommissionBars.module.css';

export interface CommissionBarsProps {
  breakdown: ChannelBreakdown[];
  loading?: boolean;
}

/**
 * One bar per channel, split into what the restaurant keeps and what the
 * platform takes.
 *
 * All bars share a single scale — the largest gross revenue — so their widths
 * are comparable. Normalising each bar to 100 % would show the commission
 * *rate* clearly but hide the thing that matters more: a 30 % cut on the
 * busiest channel costs far more than 30 % on the quietest.
 */
export function CommissionBars({ breakdown, loading = false }: CommissionBarsProps) {
  if (loading) {
    return (
      <div className={styles['list']}>
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className={styles['row']}>
            <Skeleton width="6rem" />
            <Skeleton width="100%" height="1.75rem" rounded={false} />
          </div>
        ))}
      </div>
    );
  }

  const maxGross = Math.max(...breakdown.map((entry) => entry.grossRevenue), 1);

  return (
    <div className={styles['list']}>
      {breakdown.map((entry) => {
        const meta = CHANNEL_META[entry.channel];
        const widthShare = (entry.grossRevenue / maxGross) * 100;
        const keptShare =
          entry.grossRevenue === 0 ? 100 : (entry.netRevenue / entry.grossRevenue) * 100;
        const effectiveRate =
          entry.grossRevenue === 0 ? 0 : entry.commissionPaid / entry.grossRevenue;

        return (
          <div key={entry.channel} className={styles['row']}>
            <div className={styles['label']}>
              <span
                className={styles['swatch']}
                style={{ backgroundColor: `var(${meta.colorVar})` }}
                aria-hidden="true"
              />
              <span className={styles['name']}>{meta.label}</span>
            </div>

            <div className={styles['track']}>
              <div className={styles['bar']} style={{ width: `${widthShare}%` }}>
                <div
                  className={styles['kept']}
                  style={{
                    width: `${keptShare}%`,
                    backgroundColor: `var(${meta.colorVar})`,
                  }}
                />
                <div className={styles['lost']} style={{ width: `${100 - keptShare}%` }} />
              </div>

              <span className={styles['value']}>
                {formatCurrency(entry.grossRevenue, { decimals: 0 })}
              </span>
            </div>

            <div className={styles['meta']}>
              {entry.commissionPaid > 0 ? (
                <>
                  <span className={styles['commission']}>
                    −{formatCurrency(entry.commissionPaid, { decimals: 0 })}
                  </span>
                  <span className={styles['rate']}>
                    {formatPercent(effectiveRate, { decimals: 1 })}
                  </span>
                </>
              ) : (
                <span className={styles['noCommission']}>No commission</span>
              )}
            </div>
          </div>
        );
      })}

      <div className={styles['legend']}>
        <span className={styles['legendItem']}>
          <span className={`${styles['legendSwatch']} ${styles['legendKept']}`} aria-hidden="true" />
          Kept by the restaurant
        </span>
        <span className={styles['legendItem']}>
          <span className={`${styles['legendSwatch']} ${styles['legendLost']}`} aria-hidden="true" />
          Taken as commission
        </span>
      </div>
    </div>
  );
}
