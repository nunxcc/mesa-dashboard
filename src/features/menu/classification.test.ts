import { describe, expect, it } from 'vitest';
import type { MenuItem, MenuItemPerformance } from '@/types/domain';
import { classifyMenu } from './classification';

function performance(
  name: string,
  unitsSold: number,
  price: number,
  cost: number,
): MenuItemPerformance {
  const item: MenuItem = {
    id: name,
    name,
    category: 'mains',
    station: 'grill',
    price,
    cost,
    vegetarian: false,
  };

  return {
    item,
    unitsSold,
    grossRevenue: unitsSold * price,
    grossProfit: unitsSold * (price - cost),
    margin: (price - cost) / price,
    volumeShare: 0,
  };
}

describe('classifyMenu', () => {
  // Two clearly popular items and two clearly unpopular ones, crossed with
  // high and low contribution, so each quadrant has exactly one occupant.
  const menu = [
    performance('busy-and-rich', 900, 1500, 400),
    performance('busy-and-poor', 800, 300, 250),
    performance('quiet-and-rich', 40, 1800, 500),
    performance('quiet-and-poor', 30, 400, 340),
  ];

  it('places each item in the expected quadrant', () => {
    const byName = new Map(
      classifyMenu(menu).points.map((point) => [point.entry.item.name, point.quadrant]),
    );

    expect(byName.get('busy-and-rich')).toBe('star');
    expect(byName.get('busy-and-poor')).toBe('plowhorse');
    expect(byName.get('quiet-and-rich')).toBe('puzzle');
    expect(byName.get('quiet-and-poor')).toBe('dog');
  });

  it('excludes items that sold nothing', () => {
    // An unsold item carries no signal, and counting it would drag both
    // medians toward zero — promoting genuinely weak sellers into the
    // "popular" half and mislabelling the whole menu.
    const withUnsold = [...menu, performance('never-ordered', 0, 1000, 300)];
    const result = classifyMenu(withUnsold);

    expect(result.points).toHaveLength(4);
    expect(result.points.some((point) => point.entry.item.name === 'never-ordered')).toBe(false);
  });

  it('keeps the thresholds relative to the menu it is given', () => {
    // The same item is a Star on a cheap menu and a Dog on an expensive one.
    // That is the method working, not a bug: menu engineering is comparative.
    const cheapMenu = [
      performance('subject', 100, 800, 300),
      performance('cheaper', 100, 400, 300),
      performance('quiet', 10, 300, 250),
    ];
    // Four items, so the median contribution falls between two values rather
    // than landing exactly on the subject's own — with an odd count the
    // subject would sit on its own threshold and pass the `>=` test.
    const richMenu = [
      performance('subject', 100, 800, 300),
      performance('pricier', 100, 4000, 900),
      performance('pricier-still', 100, 3000, 800),
      performance('quiet', 10, 300, 250),
    ];

    const find = (menu: MenuItemPerformance[]) =>
      classifyMenu(menu).points.find((point) => point.entry.item.name === 'subject')?.quadrant;

    expect(find(cheapMenu)).toBe('star');
    expect(find(richMenu)).toBe('plowhorse');
  });

  it('counts every classified item exactly once', () => {
    const result = classifyMenu(menu);
    const total = Object.values(result.counts).reduce((sum, count) => sum + count, 0);

    expect(total).toBe(result.points.length);
  });

  it('survives an empty menu without dividing by zero', () => {
    const result = classifyMenu([]);

    expect(result.points).toHaveLength(0);
    expect(result.medianUnits).toBe(0);
    expect(Number.isNaN(result.medianContribution)).toBe(false);
  });
});
