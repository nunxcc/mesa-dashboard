import clsx from 'clsx';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  /** Pill-shaped, for text placeholders. Squared off for blocks and charts. */
  rounded?: boolean;
  className?: string;
}

/**
 * A loading placeholder.
 *
 * Deliberately not announced to assistive technology: the surrounding region
 * carries `aria-busy`, and a screen reader listing nine anonymous "loading"
 * boxes is noise rather than information.
 */
export function Skeleton({ width, height = '1em', rounded = true, className }: SkeletonProps) {
  return (
    <span
      className={clsx(styles['skeleton'], rounded && styles['rounded'], className)}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

/** Several lines of placeholder text, last one short like a real paragraph. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <span className={clsx(styles['stack'], className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} width={index === lines - 1 ? '60%' : '100%'} />
      ))}
    </span>
  );
}
