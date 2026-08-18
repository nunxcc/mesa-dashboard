import clsx from 'clsx';
import type { ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeTone = 'neutral' | 'positive' | 'negative' | 'warning' | 'info' | 'accent';

export interface BadgeProps {
  tone?: BadgeTone;
  /** Adds a filled dot before the label - for statuses rather than counts. */
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', dot = false, children, className }: BadgeProps) {
  return (
    <span className={clsx(styles['badge'], styles[tone], className)}>
      {dot && <span className={styles['dot']} aria-hidden="true" />}
      {children}
    </span>
  );
}
