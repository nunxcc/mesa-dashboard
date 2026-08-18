import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatTile } from '@/components/ui/StatTile';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Select } from '@/components/ui/Select';
import { MenuMatrix } from '@/features/menu/MenuMatrix';
import { QUADRANT_META, classifyMenu, contributionOf } from '@/features/menu/classification';
import { RangePicker } from '@/features/filters/FilterControls';
import { useDashboardFilters } from '@/features/filters/useDashboardFilters';
import { useMenuPerformance, useMetrics } from '@/data/queries';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format';
import {
  MENU_CATEGORIES,
  MENU_CATEGORY_LABEL,
  type MenuCategory,
  type MenuItemPerformance,
} from '@/types/domain';
import styles from './MenuPage.module.css';

type CategoryFilter = MenuCategory | 'all';
type SortField = 'revenue' | 'units' | 'margin' | 'profit';

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'revenue', label: 'Sort: revenue' },
  { value: 'units', label: 'Sort: units sold' },
  { value: 'profit', label: 'Sort: gross profit' },
  { value: 'margin', label: 'Sort: margin %' },
];

const COMPARATORS: Record<SortField, (a: MenuItemPerformance, b: MenuItemPerformance) => number> = {
  revenue: (a, b) => b.grossRevenue - a.grossRevenue,
  units: (a, b) => b.unitsSold - a.unitsSold,
  profit: (a, b) => b.grossProfit - a.grossProfit,
  margin: (a, b) => b.margin - a.margin,
};

export function MenuPage() {
  const { filters, preset, setPreset } = useDashboardFilters();
  const performance = useMenuPerformance(filters);
  const metrics = useMetrics(filters);

  // Local rather than in the URL: this sort is a reading preference on one
  // table, not a view worth linking someone to. The orders table, which is
  // genuinely shareable, keeps its sort in the URL.
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [sortField, setSortField] = useState<SortField>('revenue');

  const all = useMemo(() => performance.data ?? [], [performance.data]);
  const classified = useMemo(() => classifyMenu(all), [all]);

  const quadrantById = useMemo(
    () => new Map(classified.points.map((point) => [point.entry.item.id, point.quadrant])),
    [classified],
  );

  const rows = useMemo(() => {
    const filtered =
      category === 'all' ? all : all.filter((entry) => entry.item.category === category);
    return [...filtered].sort(COMPARATORS[sortField]);
  }, [all, category, sortField]);

  const grossProfit = all.reduce((sum, entry) => sum + entry.grossProfit, 0);
  const unitsSold = all.reduce((sum, entry) => sum + entry.unitsSold, 0);
  const bestSeller = [...all].sort((a, b) => b.unitsSold - a.unitsSold)[0];

  // Blended margin is just the food cost ratio subtracted from one, so showing
  // both would spend a tile restating a number already on screen. How much of
  // the profit the Stars actually carry is the question the matrix raises and
  // otherwise leaves unanswered.
  const starProfit = classified.points
    .filter((point) => point.quadrant === 'star')
    .reduce((sum, point) => sum + point.entry.grossProfit, 0);
  const starShare = grossProfit === 0 ? 0 : starProfit / grossProfit;

  const columns: Column<MenuItemPerformance>[] = [
    {
      id: 'item',
      header: 'Item',
      cell: (row) => (
        <span className={styles['itemCell']}>
          <span className={styles['itemName']}>{row.item.name}</span>
          <span className={styles['itemCategory']}>
            {MENU_CATEGORY_LABEL[row.item.category]}
            {row.item.vegetarian && <span className={styles['veg']}>vegetariano</span>}
          </span>
        </span>
      ),
    },
    {
      id: 'quadrant',
      header: 'Class',
      cell: (row) => {
        const quadrant = quadrantById.get(row.item.id);
        if (!quadrant) return <span className={styles['muted']}>Not sold</span>;
        return (
          <Badge tone={QUADRANT_META[quadrant].tone} dot>
            {QUADRANT_META[quadrant].label}
          </Badge>
        );
      },
    },
    {
      id: 'units',
      header: 'Units',
      align: 'right',
      cell: (row) => formatNumber(row.unitsSold),
    },
    {
      id: 'price',
      header: 'Price',
      align: 'right',
      secondary: true,
      cell: (row) => formatCurrency(row.item.price),
    },
    {
      id: 'contribution',
      header: 'Per plate',
      align: 'right',
      secondary: true,
      cell: (row) => formatCurrency(contributionOf(row)),
    },
    {
      id: 'margin',
      header: 'Margin',
      align: 'right',
      cell: (row) => formatPercent(row.margin, { decimals: 0 }),
    },
    {
      id: 'revenue',
      header: 'Revenue',
      align: 'right',
      cell: (row) => formatCurrency(row.grossRevenue, { decimals: 0 }),
    },
    {
      id: 'profit',
      header: 'Gross profit',
      align: 'right',
      cell: (row) => <strong>{formatCurrency(row.grossProfit, { decimals: 0 })}</strong>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Menu"
        description="What sells, what earns, and which dishes are quietly costing more than they return."
        actions={<RangePicker value={preset} onChange={setPreset} />}
      />

      {performance.isError ? (
        <ErrorState error={performance.error} onRetry={() => void performance.refetch()} />
      ) : (
        <>
          <div className={styles['stats']}>
            <StatTile
              emphasis
              label="Gross profit"
              value={formatCurrency(grossProfit, { decimals: 0 })}
              loading={performance.isPending}
              footnote="Revenue less food cost"
            />
            <StatTile
              label="Profit from stars"
              value={formatPercent(starShare, { decimals: 1 })}
              loading={performance.isPending}
              footnote={`${classified.counts.star} items carry this share`}
            />
            <StatTile
              label="Food cost ratio"
              value={formatPercent(metrics.data?.current.foodCostRatio ?? 0, { decimals: 1 })}
              current={metrics.data?.current.foodCostRatio}
              previous={metrics.data?.previous.foodCostRatio}
              invertDelta
              loading={metrics.isPending}
            />
            <StatTile
              label="Units sold"
              value={formatNumber(unitsSold)}
              loading={performance.isPending}
              footnote={bestSeller ? `Best seller: ${bestSeller.item.name}` : undefined}
            />
          </div>

          <div className={styles['grid']}>
            <Card>
              <CardHeader
                title="Menu engineering"
                description="Units sold against margin per plate, split at the median of each. Bubble size is revenue."
              />
              <CardBody>
                {all.length === 0 && !performance.isPending ? (
                  <EmptyState
                    compact
                    title="Nothing sold in this period"
                    description="Try widening the date range."
                  />
                ) : (
                  <MenuMatrix performance={all} loading={performance.isPending} />
                )}
              </CardBody>
            </Card>

            <Card flush>
              <CardHeader
                title="Every item"
                description="Sorted and filtered independently of the chart above."
                actions={
                  <div className={styles['tableControls']}>
                    <Select
                      label="Category"
                      size="sm"
                      value={category}
                      onValueChange={setCategory}
                      options={[
                        { value: 'all', label: 'All categories' },
                        ...MENU_CATEGORIES.map((value) => ({
                          value,
                          label: MENU_CATEGORY_LABEL[value],
                        })),
                      ]}
                    />
                    <Select
                      label="Sort by"
                      size="sm"
                      value={sortField}
                      onValueChange={setSortField}
                      options={SORT_OPTIONS}
                    />
                  </div>
                }
              />
              <CardBody>
                <DataTable
                  columns={columns}
                  rows={rows}
                  rowKey={(row) => row.item.id}
                  caption="Menu item performance"
                  loading={performance.isPending}
                  skeletonRows={10}
                  empty={
                    <EmptyState
                      compact
                      title="No items match this filter"
                      description="Choose a different category."
                    />
                  }
                />
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
