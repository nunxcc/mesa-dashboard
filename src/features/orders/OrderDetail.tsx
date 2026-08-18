import { Badge } from '@/components/ui/Badge';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { MENU_BY_ID } from '@/data/generator/menu';
import { formatCurrency, formatDateTime, formatMinutes, formatNumber } from '@/lib/format';
import { CHANNEL_META, ORDER_STATUS_LABEL, type Order, type OrderStatus } from '@/types/domain';
import styles from './OrderDetail.module.css';

const STATUS_TONE: Record<OrderStatus, 'positive' | 'warning' | 'negative'> = {
  completed: 'positive',
  refunded: 'warning',
  cancelled: 'negative',
};

export interface OrderDetailProps {
  order: Order | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}

export function OrderDetail({ order, loading, error, onRetry }: OrderDetailProps) {
  if (error) return <ErrorState error={error} onRetry={onRetry} />;

  if (loading || !order) {
    return (
      <div className={styles['detail']}>
        <Skeleton width="60%" height="1.5rem" />
        <SkeletonText lines={4} />
        <Skeleton width="100%" height="8rem" rounded={false} />
      </div>
    );
  }

  const meta = CHANNEL_META[order.channel];
  const gross = order.subtotal - order.discount;

  return (
    <div className={styles['detail']}>
      <div className={styles['badges']}>
        <Badge tone={STATUS_TONE[order.status]} dot>
          {ORDER_STATUS_LABEL[order.status]}
        </Badge>
        <span className={styles['channel']}>
          <span
            className={styles['swatch']}
            style={{ backgroundColor: `var(${meta.colorVar})` }}
            aria-hidden="true"
          />
          {meta.label}
        </span>
      </div>

      <dl className={styles['facts']}>
        <div>
          <dt>Placed</dt>
          <dd>{formatDateTime(order.placedAt)}</dd>
        </div>
        <div>
          <dt>Ticket time</dt>
          <dd>{formatMinutes(order.prepMinutes)}</dd>
        </div>
        <div>
          <dt>Rating</dt>
          <dd>
            {order.rating === null ? (
              <span className={styles['muted']}>Not rated</span>
            ) : (
              `${formatNumber(order.rating, { decimals: 1 })} / 5`
            )}
          </dd>
        </div>
        <div>
          <dt>Covers</dt>
          <dd>
            {order.covers === null ? (
              <span className={styles['muted']}>—</span>
            ) : (
              formatNumber(order.covers)
            )}
          </dd>
        </div>
      </dl>

      <section className={styles['section']}>
        <h3 className={styles['sectionTitle']}>Items</h3>
        <table className={styles['lines']}>
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col" className={styles['right']}>
                Qty
              </th>
              <th scope="col" className={styles['right']}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => {
              const item = MENU_BY_ID.get(line.itemId);
              return (
                <tr key={line.itemId}>
                  <td>
                    <span className={styles['lineName']}>{item?.name ?? line.itemId}</span>
                    {/* Unit price is captured at order time, so a historical
                        ticket still reconciles after a menu price change. */}
                    <span className={styles['lineUnit']}>
                      {formatCurrency(line.unitPrice)} each
                    </span>
                  </td>
                  <td className={styles['right']}>{line.quantity}</td>
                  <td className={styles['right']}>
                    {formatCurrency(line.unitPrice * line.quantity)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className={styles['section']}>
        <h3 className={styles['sectionTitle']}>Money</h3>
        <dl className={styles['money']}>
          <div>
            <dt>Subtotal</dt>
            <dd>{formatCurrency(order.subtotal)}</dd>
          </div>
          {order.discount > 0 && (
            <div>
              <dt>Discount</dt>
              <dd className={styles['negative']}>−{formatCurrency(order.discount)}</dd>
            </div>
          )}
          {order.commission > 0 && (
            <div>
              <dt>
                {meta.label} commission
                <span className={styles['rate']}>
                  {Math.round(meta.commissionRate * 100)}% of {formatCurrency(gross)}
                </span>
              </dt>
              <dd className={styles['negative']}>−{formatCurrency(order.commission)}</dd>
            </div>
          )}
          <div className={styles['total']}>
            <dt>Net to the restaurant</dt>
            <dd>{formatCurrency(order.net)}</dd>
          </div>
        </dl>

        {/* Outside the running total on purpose: the gorjeta belongs to the
            staff, so it is recorded but never counted as takings. */}
        {order.tip > 0 && (
          <p className={styles['aside']}>
            Plus {formatCurrency(order.tip)} left as a tip, which goes to the staff.
          </p>
        )}
      </section>
    </div>
  );
}
