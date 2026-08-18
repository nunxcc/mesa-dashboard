import { useTheme, type ThemePreference } from '@/lib/theme';
import { Icon, type IconName } from './Icon';
import styles from './ThemeToggle.module.css';

const OPTIONS: { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'system', label: 'System', icon: 'system' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
];

/**
 * Three-way, not a binary flip: "follow the OS" is a real preference and the
 * common two-state toggle silently discards it the first time it is used.
 *
 * Implemented as a radiogroup so arrow keys move between options, which is
 * what a keyboard user expects from a segmented control.
 */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <div className={styles['group']} role="radiogroup" aria-label="Colour theme">
      {OPTIONS.map((option) => {
        const selected = preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            // Only the active option is tabbable; arrows move within the group.
            tabIndex={selected ? 0 : -1}
            className={styles['option']}
            data-selected={selected || undefined}
            title={option.label}
            onClick={() => setPreference(option.value)}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
              event.preventDefault();
              const step = event.key === 'ArrowRight' ? 1 : -1;
              const index = OPTIONS.findIndex((candidate) => candidate.value === preference);
              const next = OPTIONS[(index + step + OPTIONS.length) % OPTIONS.length];
              if (next) setPreference(next.value);
            }}
          >
            <Icon name={option.icon} size={14} />
            <span className="sr-only">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
