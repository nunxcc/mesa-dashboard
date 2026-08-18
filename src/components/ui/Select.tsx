import clsx from 'clsx';
import type { SelectHTMLAttributes } from 'react';
import { Icon } from './Icon';
import styles from './Select.module.css';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export interface SelectProps<T extends string>
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value' | 'size'> {
  value: T;
  options: readonly SelectOption<T>[];
  onValueChange: (value: T) => void;
  /** Required: either visible, or supplied to screen readers via aria-label. */
  label: string;
  hideLabel?: boolean;
  size?: 'sm' | 'md';
}

/**
 * A native `<select>` with custom chrome.
 *
 * Deliberately not a bespoke listbox. The native control gets keyboard
 * interaction, typeahead, form association and — on a phone — the platform's
 * own wheel picker, all of which a div-based replacement has to rebuild badly.
 * The only thing worth styling is the box around it.
 */
export function Select<T extends string>({
  value,
  options,
  onValueChange,
  label,
  hideLabel = true,
  size = 'md',
  className,
  id,
  ...props
}: SelectProps<T>) {
  return (
    <div className={clsx(styles['wrapper'], styles[size], className)}>
      {!hideLabel && (
        <label className={styles['label']} htmlFor={id}>
          {label}
        </label>
      )}
      <div className={styles['control']}>
        <select
          id={id}
          className={styles['select']}
          value={value}
          aria-label={hideLabel ? label : undefined}
          onChange={(event) => onValueChange(event.target.value as T)}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" size={14} className={styles['chevron']} />
      </div>
    </div>
  );
}
