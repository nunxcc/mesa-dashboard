/**
 * Core domain model.
 *
 * Money is stored everywhere as an integer number of cents. Floating point
 * euros drift once you start summing thousands of orders (0.1 + 0.2 problem),
 * and a dashboard whose totals disagree with the rows above them is worthless.
 * Conversion to a display string happens once, at the formatting boundary.
 */
export type Cents = number;

/** Sales channels. `erasableSyntaxOnly` is on, so unions + const maps rather
 *  than TS enums - which is the better default anyway: these serialise as
 *  plain strings and survive a round trip through a URL or an API. */
export type Channel = 'dine_in' | 'takeaway' | 'uber_eats' | 'glovo' | 'bolt_food';

export const CHANNELS = ['dine_in', 'takeaway', 'uber_eats', 'glovo', 'bolt_food'] as const;

export type ChannelKind = 'in_house' | 'delivery';

export interface ChannelMeta {
  id: Channel;
  label: string;
  kind: ChannelKind;
  /**
   * Share of gross order value taken by the platform. In-house channels are
   * zero. The delivery figures are the headline rates the marketplaces
   * publicly quote for full-service (delivery included) plans - this spread
   * is the whole point of the Channels page.
   */
  commissionRate: number;
  /** CSS custom property holding this channel's series colour. */
  colorVar: string;
}

export const CHANNEL_META: Record<Channel, ChannelMeta> = {
  dine_in: {
    id: 'dine_in',
    label: 'Dine-in',
    kind: 'in_house',
    commissionRate: 0,
    colorVar: '--series-1',
  },
  takeaway: {
    id: 'takeaway',
    label: 'Takeaway',
    kind: 'in_house',
    commissionRate: 0,
    colorVar: '--series-2',
  },
  uber_eats: {
    id: 'uber_eats',
    label: 'Uber Eats',
    kind: 'delivery',
    commissionRate: 0.3,
    colorVar: '--series-3',
  },
  glovo: {
    id: 'glovo',
    label: 'Glovo',
    kind: 'delivery',
    commissionRate: 0.28,
    colorVar: '--series-4',
  },
  bolt_food: {
    id: 'bolt_food',
    label: 'Bolt Food',
    kind: 'delivery',
    commissionRate: 0.25,
    colorVar: '--series-5',
  },
};

export type OrderStatus = 'completed' | 'refunded' | 'cancelled';

export const ORDER_STATUSES = ['completed', 'refunded', 'cancelled'] as const;

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  completed: 'Completed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
};

export type MenuCategory = 'starters' | 'mains' | 'sides' | 'desserts' | 'drinks';

export const MENU_CATEGORIES = ['starters', 'mains', 'sides', 'desserts', 'drinks'] as const;

export const MENU_CATEGORY_LABEL: Record<MenuCategory, string> = {
  starters: 'Starters',
  mains: 'Mains',
  sides: 'Sides',
  desserts: 'Desserts',
  drinks: 'Drinks',
};

/** Kitchen section an item is fired from. Drives the prep-time model. */
export type Station = 'cold' | 'grill' | 'fryer' | 'pastry' | 'bar';

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  station: Station;
  /** Menu price, gross, per unit. */
  price: Cents;
  /** Food cost per unit - what the ingredients cost the kitchen. */
  cost: Cents;
  vegetarian: boolean;
}

export interface OrderLine {
  itemId: string;
  quantity: number;
  /** Captured at order time: menu prices change, historical orders must not. */
  unitPrice: Cents;
}

export interface Order {
  id: string;
  /** Human-facing reference shown in the UI, e.g. "MSA-24F193". */
  reference: string;
  /** ISO-8601 timestamp. */
  placedAt: string;
  channel: Channel;
  status: OrderStatus;
  lines: OrderLine[];
  /** Sum of line totals before discount. */
  subtotal: Cents;
  discount: Cents;
  /** Platform commission on (subtotal - discount). Zero for in-house. */
  commission: Cents;
  /** Goes to the staff, not the business - never part of `net`. */
  tip: Cents;
  /** What the business actually keeps: subtotal - discount - commission. */
  net: Cents;
  /** Ticket time: order accepted to order ready. */
  prepMinutes: number;
  /** 1-5. Delivery platforms collect these; walk-in orders usually do not. */
  rating: number | null;
  /** Number of guests. Dine-in only. */
  covers: number | null;
}

/** Aggregate returned by the summary endpoints. */
export interface MetricSummary {
  grossRevenue: Cents;
  netRevenue: Cents;
  commissionPaid: Cents;
  orderCount: number;
  averageOrderValue: Cents;
  averagePrepMinutes: number;
  averageRating: number | null;
  /** Food cost as a share of gross revenue. */
  foodCostRatio: number;
}

/** A metric plus the same metric over the immediately preceding period. */
export interface MetricComparison {
  current: MetricSummary;
  previous: MetricSummary;
}

export interface TimeBucket {
  /** ISO date (day granularity) or ISO datetime (hour granularity). */
  date: string;
  grossRevenue: Cents;
  netRevenue: Cents;
  orderCount: number;
}

export interface ChannelBreakdown {
  channel: Channel;
  grossRevenue: Cents;
  netRevenue: Cents;
  commissionPaid: Cents;
  orderCount: number;
  averageOrderValue: Cents;
  averagePrepMinutes: number;
  averageRating: number | null;
  /** Share of total gross revenue, 0-1. */
  revenueShare: number;
}

export interface MenuItemPerformance {
  item: MenuItem;
  unitsSold: number;
  grossRevenue: Cents;
  /** unitsSold * (price - cost). */
  grossProfit: Cents;
  /** (price - cost) / price. */
  margin: number;
  /** Share of all units sold across the menu, 0-1. */
  volumeShare: number;
}

/** One cell of the day-of-week x hour heatmap. */
export interface HeatmapCell {
  /** 0 = Monday, matching how a rota is read, not how JS numbers days. */
  weekday: number;
  hour: number;
  orderCount: number;
  grossRevenue: Cents;
}
