import type { Channel, Order, OrderLine, OrderStatus } from '@/types/domain';
import { CHANNEL_META } from '@/types/domain';

let sequence = 0;

export interface OrderOverrides {
  id?: string;
  placedAt?: string;
  channel?: Channel;
  status?: OrderStatus;
  lines?: OrderLine[];
  subtotal?: number;
  discount?: number;
  tip?: number;
  prepMinutes?: number;
  rating?: number | null;
  covers?: number | null;
}

/**
 * Builds an order with sane defaults, so a test only has to state the field it
 * is actually about. Commission and net are derived rather than passed in -
 * a fixture that lets those drift out of step with the channel would let a
 * broken aggregation still pass.
 */
export function makeOrder(overrides: OrderOverrides = {}): Order {
  sequence += 1;

  const channel = overrides.channel ?? 'dine_in';
  const subtotal = overrides.subtotal ?? 2000;
  const discount = overrides.discount ?? 0;
  const commissionable = subtotal - discount;
  const commission = Math.round(commissionable * CHANNEL_META[channel].commissionRate);

  return {
    id: overrides.id ?? `ord-test-${sequence}`,
    reference: `MSA-TEST${sequence.toString().padStart(3, '0')}`,
    placedAt: overrides.placedAt ?? '2026-06-15T13:30:00.000Z',
    channel,
    status: overrides.status ?? 'completed',
    lines: overrides.lines ?? [{ itemId: 'itm-francesinha', quantity: 1, unitPrice: subtotal }],
    subtotal,
    discount,
    commission,
    tip: overrides.tip ?? 0,
    net: commissionable - commission,
    prepMinutes: overrides.prepMinutes ?? 18,
    rating: overrides.rating === undefined ? null : overrides.rating,
    covers: overrides.covers === undefined ? null : overrides.covers,
  };
}

export function resetFactories(): void {
  sequence = 0;
}
