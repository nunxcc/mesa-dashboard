import { endOfDay, subMonths } from 'date-fns';
import type { Order } from '@/types/domain';
import { generateOrders } from './generator/orders';

/**
 * Twenty-five months, so that even the "Last 12 months" preset has a complete
 * preceding period to compare against. A comparison window that runs off the
 * end of the data would silently understate every delta on the page.
 */
const MONTHS_OF_HISTORY = 25;

let cache: Order[] | null = null;

/**
 * Built once, on first use, and shared thereafter. Generation costs a few
 * hundred milliseconds and allocates a few thousand objects, so it must not
 * happen per query - the API layer above treats this as its database.
 */
export function getDataset(): readonly Order[] {
  if (cache === null) {
    const to = endOfDay(new Date());
    cache = generateOrders(subMonths(to, MONTHS_OF_HISTORY), to);
  }
  return cache;
}

/** Test seam: forces the next `getDataset()` call to rebuild. */
export function resetDataset(): void {
  cache = null;
}

/** The oldest and newest instants the dataset can answer for. */
export function datasetBounds(): { from: string; to: string } {
  const orders = getDataset();
  const first = orders[0];
  const last = orders[orders.length - 1];
  const now = new Date().toISOString();
  return { from: first?.placedAt ?? now, to: last?.placedAt ?? now };
}
