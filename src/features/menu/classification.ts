import type { MenuItemPerformance } from '@/types/domain';

/**
 * Menu engineering - the classification restaurants have used since Kasavana
 * and Smith formalised it in 1982. Each dish is placed by how often it sells
 * against how much it contributes per plate, and the quadrant it lands in
 * implies a specific action.
 *
 * Kept separate from the chart because the table needs the same labels, and
 * two implementations of "is this a Star" would eventually disagree.
 */
export type Quadrant = 'star' | 'plowhorse' | 'puzzle' | 'dog';

export const QUADRANT_META: Record<
  Quadrant,
  {
    label: string;
    advice: string;
    colorVar: string;
    tone: 'positive' | 'info' | 'warning' | 'negative';
  }
> = {
  star: {
    label: 'Star',
    advice: 'Popular and profitable. Protect the recipe and keep it visible.',
    colorVar: '--color-positive',
    tone: 'positive',
  },
  plowhorse: {
    label: 'Plowhorse',
    advice: 'Brings people in but earns little. Trim the plate cost, not the price.',
    colorVar: '--color-info',
    tone: 'info',
  },
  puzzle: {
    label: 'Puzzle',
    advice: 'Good margin, nobody orders it. Reposition or rename before cutting.',
    colorVar: '--color-warning',
    tone: 'warning',
  },
  dog: {
    label: 'Dog',
    advice: 'Slow and thin. A candidate to drop at the next menu change.',
    colorVar: '--color-negative',
    tone: 'negative',
  },
};

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

export function contributionOf(performance: MenuItemPerformance): number {
  return performance.item.price - performance.item.cost;
}

export interface ClassifiedMenu {
  points: { entry: MenuItemPerformance; contribution: number; quadrant: Quadrant }[];
  medianUnits: number;
  medianContribution: number;
  counts: Record<Quadrant, number>;
}

/**
 * Thresholds are the medians of this menu, not fixed numbers - the whole
 * method is relative. A 4 € contribution is strong on a café menu and weak on
 * a steakhouse one, and hard-coding a cutoff would mislabel both.
 */
export function classifyMenu(performance: MenuItemPerformance[]): ClassifiedMenu {
  // Items nobody ordered carry no signal and would drag both medians toward
  // zero, promoting genuinely weak sellers into the "popular" half.
  const sold = performance.filter((entry) => entry.unitsSold > 0);

  const medianUnits = median(sold.map((entry) => entry.unitsSold));
  const medianContribution = median(sold.map(contributionOf));

  const counts: Record<Quadrant, number> = { star: 0, plowhorse: 0, puzzle: 0, dog: 0 };

  const points = sold.map((entry) => {
    const contribution = contributionOf(entry);
    const popular = entry.unitsSold >= medianUnits;
    const profitable = contribution >= medianContribution;
    const quadrant: Quadrant = popular
      ? profitable
        ? 'star'
        : 'plowhorse'
      : profitable
        ? 'puzzle'
        : 'dog';

    counts[quadrant] += 1;
    return { entry, contribution, quadrant };
  });

  return { points, medianUnits, medianContribution, counts };
}
