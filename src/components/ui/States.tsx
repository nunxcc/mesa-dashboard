import type { ReactNode } from 'react';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import styles from './States.module.css';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  /**
   * What to do next. An empty state that only says "No results" leaves the
   * reader to guess whether the filter is too narrow or the data is missing.
   */
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div className={compact ? styles['stateCompact'] : styles['state']}>
      <span className={styles['glyph']} aria-hidden="true">
        <Icon name={icon} size={compact ? 18 : 22} />
      </span>
      <p className={styles['title']}>{title}</p>
      {description && <p className={styles['description']}>{description}</p>}
      {action && <div className={styles['action']}>{action}</div>}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  error?: unknown;
  onRetry?: () => void;
  compact?: boolean;
}

/**
 * Errors reaching the user are phrased in terms of what failed and what they
 * can do, never as a raw stack trace. The underlying message is still shown,
 * quietly, because "something went wrong" with no detail is the least useful
 * error message there is.
 */
export function ErrorState({
  title = 'Could not load this data',
  error,
  onRetry,
  compact = false,
}: ErrorStateProps) {
  const detail = error instanceof Error ? error.message : null;

  return (
    <div className={compact ? styles['stateCompact'] : styles['state']} role="alert">
      <span className={`${styles['glyph']} ${styles['glyphError']}`} aria-hidden="true">
        <Icon name="alert" size={compact ? 18 : 22} />
      </span>
      <p className={styles['title']}>{title}</p>
      {detail && <p className={styles['description']}>{detail}</p>}
      {onRetry && (
        <div className={styles['action']}>
          <Button size="sm" iconBefore="refresh" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
