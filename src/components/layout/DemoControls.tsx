import { useId, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/Button';
import { getSettings, setSettings, subscribe } from '@/data/api/simulation';
import styles from './DemoControls.module.css';

const LATENCY_PRESETS: { label: string; value: [number, number]; hint: string }[] = [
  { label: 'Fast', value: [0, 60], hint: 'Local cache' },
  { label: 'Realistic', value: [180, 520], hint: 'Typical API' },
  { label: 'Slow', value: [900, 1800], hint: 'Bad 3G' },
];

const FAILURE_PRESETS: { label: string; value: number }[] = [
  { label: 'Never', value: 0 },
  { label: 'Sometimes', value: 0.35 },
  { label: 'Always', value: 1 },
];

function useSimulation() {
  return useSyncExternalStore(subscribe, getSettings, getSettings);
}

/**
 * Controls for the simulated network.
 *
 * Loading skeletons, retry paths and error states are most of the work in a
 * data-heavy UI and the least visible part of it - against a mock API that
 * always resolves instantly, none of them ever appear. Exposing the knobs in
 * the running app means those states can be shown rather than described.
 *
 * Uses the native popover API, so light-dismiss and Esc are handled by the
 * browser instead of a document-level click listener.
 */
export function DemoControls() {
  const settings = useSimulation();
  const popoverId = useId();

  return (
    <div className={styles['wrapper']}>
      <Button
        size="sm"
        variant="ghost"
        iconBefore="filters"
        // React 19 knows the native popover invoker attributes, so wiring the
        // trigger to the panel needs no click handler and no outside-click
        // listener of our own.
        popoverTarget={popoverId}
      >
        Network
      </Button>

      <div id={popoverId} popover="auto" className={styles['popover']}>
        <p className={styles['heading']}>Simulated network</p>
        <p className={styles['note']}>
          This dashboard runs against a generated dataset. These control how the fake API behaves,
          so the loading and error states are visible.
        </p>

        <fieldset className={styles['field']}>
          <legend className={styles['legend']}>Latency</legend>
          <div className={styles['options']}>
            {LATENCY_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={styles['option']}
                data-selected={settings.latency[0] === preset.value[0] || undefined}
                onClick={() => setSettings({ latency: preset.value })}
              >
                <span className={styles['optionLabel']}>{preset.label}</span>
                <span className={styles['optionHint']}>{preset.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles['field']}>
          <legend className={styles['legend']}>Request failures</legend>
          <div className={styles['options']}>
            {FAILURE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={styles['option']}
                data-selected={settings.failureRate === preset.value || undefined}
                onClick={() => setSettings({ failureRate: preset.value })}
              >
                <span className={styles['optionLabel']}>{preset.label}</span>
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  );
}
