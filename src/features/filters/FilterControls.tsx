import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Select } from '@/components/ui/Select';
import { RANGE_PRESETS, type RangePreset } from '@/data/filters';
import { CHANNELS, CHANNEL_META, ORDER_STATUSES, ORDER_STATUS_LABEL } from '@/types/domain';
import type { Channel, OrderStatus } from '@/types/domain';
import styles from './FilterControls.module.css';

export function RangePicker({
  value,
  onChange,
}: {
  value: RangePreset;
  onChange: (preset: RangePreset) => void;
}) {
  return (
    <Select
      label="Date range"
      value={value}
      options={RANGE_PRESETS.map((preset) => ({ value: preset.id, label: preset.label }))}
      onValueChange={onChange}
    />
  );
}

/**
 * Channel chips carry their own series colour, so the filter and every chart
 * on the page agree on what "Glovo" looks like. Rendered as toggle buttons
 * rather than checkboxes because they behave like a segmented multi-select,
 * and `aria-pressed` communicates that state accurately.
 */
export function ChannelChips({
  selected,
  onToggle,
}: {
  selected: Channel[];
  onToggle: (channel: Channel) => void;
}) {
  return (
    <div className={styles['chips']} role="group" aria-label="Filter by channel">
      {CHANNELS.map((channel) => {
        const meta = CHANNEL_META[channel];
        const active = selected.includes(channel);
        return (
          <button
            key={channel}
            type="button"
            className={styles['chip']}
            aria-pressed={active}
            onClick={() => onToggle(channel)}
          >
            <span
              className={styles['swatch']}
              style={{ backgroundColor: `var(${meta.colorVar})` }}
              aria-hidden="true"
            />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

export function StatusChips({
  selected,
  onToggle,
}: {
  selected: OrderStatus[];
  onToggle: (status: OrderStatus) => void;
}) {
  return (
    <div className={styles['chips']} role="group" aria-label="Filter by status">
      {ORDER_STATUSES.map((status) => {
        const active = selected.includes(status);
        return (
          <button
            key={status}
            type="button"
            className={styles['chip']}
            aria-pressed={active}
            onClick={() => onToggle(status)}
          >
            {ORDER_STATUS_LABEL[status]}
          </button>
        );
      })}
    </div>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder = 'Search order reference…',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className={styles['search']}>
      <Icon name="search" size={15} className={styles['searchIcon']} />
      <input
        // `type="search"` gives the platform clear button and, on iOS, the
        // right keyboard. The label is visually hidden but present.
        type="search"
        className={styles['searchInput']}
        value={value}
        placeholder={placeholder}
        aria-label="Search orders"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function ActiveFilterSummary({
  channels,
  statuses,
  search,
  onClear,
}: {
  channels: Channel[];
  statuses: OrderStatus[];
  search: string;
  onClear: () => void;
}) {
  const count = channels.length + statuses.length + (search.trim() ? 1 : 0);
  if (count === 0) return null;

  return (
    <div className={styles['summary']}>
      <Badge tone="accent">
        {count} {count === 1 ? 'filter' : 'filters'} active
      </Badge>
      <Button variant="ghost" size="sm" onClick={onClear}>
        Clear all
      </Button>
    </div>
  );
}
