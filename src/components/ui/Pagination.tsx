import { formatNumber } from '@/lib/format';
import { Button } from './Button';
import styles from './Pagination.module.css';

export interface PaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  /** Dims the range readout while a new page is in flight. */
  busy?: boolean;
}

export function Pagination({
  page,
  pageCount,
  pageSize,
  total,
  onChange,
  busy = false,
}: PaginationProps) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav className={styles['pagination']} aria-label="Pagination">
      {/*
        "1-25 of 4 312" rather than "page 1 of 173": people reason about how far
        through a list they are, not about page indices.
      */}
      <p className={styles['range']} data-busy={busy || undefined} aria-live="polite">
        {total === 0 ? (
          'No orders'
        ) : (
          <>
            <strong>
              {formatNumber(first)}–{formatNumber(last)}
            </strong>{' '}
            of {formatNumber(total)}
          </>
        )}
      </p>

      <div className={styles['controls']}>
        <Button
          size="sm"
          variant="secondary"
          iconOnly
          iconBefore="chevronLeft"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Previous page
        </Button>
        <span className={styles['pageLabel']}>
          Page {formatNumber(page)} of {formatNumber(Math.max(1, pageCount))}
        </span>
        <Button
          size="sm"
          variant="secondary"
          iconOnly
          iconBefore="chevronRight"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
        >
          Next page
        </Button>
      </div>
    </nav>
  );
}
