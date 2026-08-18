import clsx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconBefore?: IconName;
  iconAfter?: IconName;
  /**
   * Renders as a square icon-only button. `children` then becomes the
   * accessible name rather than visible text, so it stays required — an
   * icon-only button with no label is invisible to a screen reader.
   */
  iconOnly?: boolean;
  loading?: boolean;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  iconBefore,
  iconAfter,
  iconOnly = false,
  loading = false,
  disabled,
  className,
  children,
  ref,
  ...props
}: ButtonProps) {
  const iconSize = size === 'sm' ? 14 : 16;

  return (
    <button
      ref={ref}
      type="button"
      className={clsx(
        styles['button'],
        styles[variant],
        styles[size],
        iconOnly && styles['iconOnly'],
        loading && styles['loading'],
        className,
      )}
      disabled={disabled === true || loading}
      // Announce the pending state rather than leaving a silently dead button.
      aria-busy={loading || undefined}
      {...props}
    >
      {iconBefore && <Icon name={iconBefore} size={iconSize} />}
      {iconOnly ? <span className="sr-only">{children}</span> : <span>{children}</span>}
      {iconAfter && <Icon name={iconAfter} size={iconSize} />}
    </button>
  );
}
