import clsx from 'clsx';
import type { ReactNode } from 'react';
import type { SortDirection } from '@/data/filters';
import { Icon } from './Icon';
import { Skeleton } from './Skeleton';
import styles from './DataTable.module.css';

export interface Column<T> {
  id: string;
  header: ReactNode;
  /** Numeric columns align right so digits line up down the column. */
  align?: 'left' | 'right';
  /** Enables the sort control in this column's header. */
  sortable?: boolean;
  width?: string;
  /** Hidden below the medium breakpoint, for columns that are nice-to-have. */
  secondary?: boolean;
  cell: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption: string;
  sort?: { field: string; direction: SortDirection };
  onSort?: (columnId: string) => void;
  onRowClick?: (row: T) => void;
  /** Marks the open row when a detail panel is showing. */
  activeRowKey?: string | null;
  loading?: boolean;
  skeletonRows?: number;
  empty?: ReactNode;
}

/**
 * A semantic table with sorting and optional row activation.
 *
 * Deliberately a real `<table>`: it is tabular data, so the element gives
 * screen readers row/column association and `aria-sort` for free. Sorting is
 * driven from the parent rather than held here, because the sort lives in the
 * URL — this component renders state, it does not own it.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  sort,
  onSort,
  onRowClick,
  activeRowKey,
  loading = false,
  skeletonRows = 8,
  empty,
}: DataTableProps<T>) {
  if (!loading && rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div className={styles['scroll']}>
      <table className={styles['table']}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => {
              const isSorted = sort?.field === column.id;
              return (
                <th
                  key={column.id}
                  scope="col"
                  style={column.width ? { width: column.width } : undefined}
                  className={clsx(
                    column.align === 'right' && styles['right'],
                    column.secondary && styles['secondary'],
                  )}
                  // Only the actively sorted column reports a direction;
                  // the rest report "none" so the sorted one stands out.
                  aria-sort={
                    !column.sortable
                      ? undefined
                      : isSorted
                        ? sort.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                  }
                >
                  {column.sortable && onSort ? (
                    <button
                      type="button"
                      className={styles['sortButton']}
                      onClick={() => onSort(column.id)}
                    >
                      {column.header}
                      <Icon
                        name={isSorted && sort.direction === 'asc' ? 'chevronUp' : 'chevronDown'}
                        size={13}
                        className={clsx(styles['sortIcon'], isSorted && styles['sortIconActive'])}
                      />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {loading
            ? Array.from({ length: skeletonRows }, (_, index) => (
                <tr key={index}>
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={clsx(
                        column.align === 'right' && styles['right'],
                        column.secondary && styles['secondary'],
                      )}
                    >
                      <Skeleton width={column.align === 'right' ? '4rem' : '70%'} />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => {
                const key = rowKey(row);
                return (
                  <tr
                    key={key}
                    className={clsx(onRowClick && styles['clickable'])}
                    data-active={activeRowKey === key ? '' : undefined}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={clsx(
                          column.align === 'right' && styles['right'],
                          column.secondary && styles['secondary'],
                        )}
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
        </tbody>
      </table>
    </div>
  );
}
