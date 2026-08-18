import { addDays, differenceInCalendarDays, format, getDay, getMonth, startOfDay } from 'date-fns';
import { CHANNEL_META, type Cents, type Channel, type Order, type OrderLine } from '@/types/domain';
import { MENU_SEEDS, type MenuSeed } from './menu';
import { Rng, clamp } from './random';

/**
 * The demand model.
 *
 * Every constant here is a claim about how a mid-sized Porto restaurant
 * actually trades. They are what stop the dataset looking like `Math.random()`
 * painted onto a chart: Mondays are closed, August is heaving, delivery peaks
 * an hour after the dining room does, and the platforms have been quietly
 * taking a larger share of the mix all year.
 */

/** Mean orders on an ordinary, mid-season, fully-open day. */
const BASE_DAILY_ORDERS = 62;

/** 0 = Monday. Closed Mondays, as most Portuguese kitchens are. */
const WEEKDAY_FACTOR = [0, 0.72, 0.8, 0.92, 1.28, 1.42, 1.05] as const;

/** 0 = January. Summer tourism dominates; February is the trough. */
const SEASON_FACTOR = [0.8, 0.84, 0.92, 1.0, 1.06, 1.14, 1.26, 1.32, 1.12, 0.98, 0.9, 1.1] as const;

/** Total growth applied linearly across the generated window. */
const ANNUAL_GROWTH = 0.12;

/**
 * Service hours. Lunch and dinner are distinct services with a dead afternoon
 * between them - the gap is what makes the peak-hours heatmap legible.
 */
const IN_HOUSE_HOURLY_WEIGHT: Readonly<Record<number, number>> = {
  12: 55,
  13: 100,
  14: 62,
  15: 18,
  19: 40,
  20: 88,
  21: 95,
  22: 52,
  23: 16,
};

/** Delivery runs late: the 21h-23h tail is far heavier than the dining room's. */
const DELIVERY_HOURLY_WEIGHT: Readonly<Record<number, number>> = {
  12: 38,
  13: 72,
  14: 55,
  15: 12,
  19: 58,
  20: 100,
  21: 92,
  22: 64,
  23: 28,
};

/**
 * Channel mix at the start and end of the window. Delivery share climbs from
 * 28 % to 40 % over the year - the single most consequential trend in the
 * dataset, because every point of it arrives with a ~28 % commission attached.
 */
const CHANNEL_MIX_START: Readonly<Record<Channel, number>> = {
  dine_in: 52,
  takeaway: 20,
  uber_eats: 14,
  glovo: 9,
  bolt_food: 5,
};

const CHANNEL_MIX_END: Readonly<Record<Channel, number>> = {
  dine_in: 42,
  takeaway: 18,
  uber_eats: 20,
  glovo: 12,
  bolt_food: 8,
};

interface DeliveryProfile {
  mains: { value: number; weight: number }[];
  starterProbability: number;
  sideProbability: number;
  drinkProbability: number;
  dessertProbability: number;
  /** Share of orders arriving with a platform promotion attached. */
  discountRate: number;
}

/**
 * Per-marketplace basket behaviour.
 *
 * Uber Eats skews to family-sized weekend orders; Glovo is the impulse
 * single-main channel; Bolt Food buys on price and arrives with a voucher
 * attached roughly a quarter of the time.
 */
const DELIVERY_PROFILE: Readonly<Record<Channel, DeliveryProfile>> = {
  uber_eats: {
    mains: [
      { value: 1, weight: 18 },
      { value: 2, weight: 42 },
      { value: 3, weight: 28 },
      { value: 4, weight: 12 },
    ],
    starterProbability: 0.44,
    sideProbability: 0.66,
    drinkProbability: 0.49,
    dessertProbability: 0.42,
    discountRate: 0.17,
  },
  glovo: {
    mains: [
      { value: 1, weight: 38 },
      { value: 2, weight: 44 },
      { value: 3, weight: 15 },
      { value: 4, weight: 3 },
    ],
    starterProbability: 0.29,
    sideProbability: 0.55,
    drinkProbability: 0.38,
    dessertProbability: 0.28,
    discountRate: 0.19,
  },
  bolt_food: {
    mains: [
      { value: 1, weight: 30 },
      { value: 2, weight: 48 },
      { value: 3, weight: 18 },
      { value: 4, weight: 4 },
    ],
    starterProbability: 0.33,
    sideProbability: 0.61,
    drinkProbability: 0.41,
    dessertProbability: 0.31,
    discountRate: 0.26,
  },
  // In-house channels never consult this table; present only to keep the
  // record total and avoid an optional lookup at every call site.
  dine_in: {
    mains: [{ value: 1, weight: 1 }],
    starterProbability: 0,
    sideProbability: 0,
    drinkProbability: 0,
    dessertProbability: 0,
    discountRate: 0.04,
  },
  takeaway: {
    mains: [{ value: 1, weight: 1 }],
    starterProbability: 0,
    sideProbability: 0,
    drinkProbability: 0,
    dessertProbability: 0,
    discountRate: 0.04,
  },
};

/** Base minutes per kitchen section, before load and channel adjustments. */
const STATION_BASE_MINUTES: Readonly<Record<MenuSeed['station'], number>> = {
  cold: 4,
  bar: 2,
  fryer: 8,
  pastry: 5,
  grill: 12,
};

/** Portuguese public holidays where a restaurant like this would close. */
const CLOSED_DATES = new Set(['01-01', '12-24', '12-25', '05-01']);

/** FNV-1a. Any stable string to a stable 32-bit seed. */
function seedFromKey(key: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// Seeding per-day rather than per-dataset means a given calendar date always
// produces the same orders, so the window can slide forward each day without
// yesterday's numbers changing underneath it.
function seedFromDate(date: Date): number {
  return seedFromKey(format(date, 'yyyy-MM-dd'));
}

const monthCharacterCache = new Map<string, number>();

/**
 * A per-month multiplier on top of the seasonal curve.
 *
 * The smooth season factor alone makes every month-over-month comparison land
 * within a percent or two of flat, which is not how a restaurant trades: a
 * fortnight of rain, roadworks on the street, a festival in the square. This
 * gives each month its own luck - stable for that month forever, because it is
 * seeded from the month key rather than drawn per run.
 */
function monthCharacter(date: Date): number {
  const key = format(date, 'yyyy-MM');
  const cached = monthCharacterCache.get(key);
  if (cached !== undefined) return cached;

  const value = clamp(new Rng(seedFromKey(`month:${key}`)).normal(1, 0.075), 0.82, 1.18);
  monthCharacterCache.set(key, value);
  return value;
}

/** JS weeks start on Sunday; rotas and this domain start on Monday. */
export function toMondayFirstWeekday(date: Date): number {
  return (getDay(date) + 6) % 7;
}

function isClosed(date: Date): boolean {
  if (toMondayFirstWeekday(date) === 0) return true;
  return CLOSED_DATES.has(format(date, 'MM-dd'));
}

function interpolateChannelWeights(progress: number): Record<Channel, number> {
  const mix = {} as Record<Channel, number>;
  for (const channel of Object.keys(CHANNEL_MIX_START) as Channel[]) {
    const start = CHANNEL_MIX_START[channel];
    const end = CHANNEL_MIX_END[channel];
    mix[channel] = start + (end - start) * progress;
  }
  return mix;
}

function pickHour(rng: Rng, kind: 'in_house' | 'delivery'): number {
  const weights = kind === 'delivery' ? DELIVERY_HOURLY_WEIGHT : IN_HOUSE_HOURLY_WEIGHT;
  return rng.weighted(
    Object.entries(weights).map(([hour, weight]) => ({ value: Number(hour), weight })),
  );
}

const SEED_BY_ID = new Map(MENU_SEEDS.map((item) => [item.id, item]));

/**
 * Candidate lists and their weight tables, precomputed per
 * (category, delivery?) pair. Building these inside the order loop meant
 * scanning and re-allocating the whole menu several times per order - about
 * 200 000 wasted passes across a full year of data.
 */
const CANDIDATES = new Map<string, { value: MenuSeed; weight: number }[]>();

for (const category of ['starters', 'mains', 'sides', 'desserts', 'drinks'] as const) {
  for (const delivery of [false, true]) {
    CANDIDATES.set(
      `${category}:${delivery}`,
      MENU_SEEDS.filter(
        (item) => item.category === category && (!delivery || item.travelsWell),
      ).map((item) => ({ value: item, weight: item.popularity })),
    );
  }
}

function pickItem(rng: Rng, category: MenuSeed['category'], channel: Channel): MenuSeed | null {
  const delivery = CHANNEL_META[channel].kind === 'delivery';
  const candidates = CANDIDATES.get(`${category}:${delivery}`);
  if (!candidates || candidates.length === 0) return null;
  return rng.weighted(candidates);
}

interface Basket {
  lines: OrderLine[];
  covers: number | null;
}

/**
 * Basket composition differs sharply by channel, and that difference is the
 * reason average order value alone is a misleading metric:
 *
 * - Dine-in sells drinks and coffee, which carry the fattest margins.
 * - Delivery baskets are larger in euros (they feed two or three people and
 *   have to clear a minimum) but carry almost no high-margin drinks, then lose
 *   a further ~28 % to commission.
 * - Takeaway is a single hurried main, often a bifana.
 */
function buildBasket(rng: Rng, channel: Channel): Basket {
  const lines = new Map<string, OrderLine>();

  const add = (item: MenuSeed | null, quantity = 1): void => {
    if (!item || quantity <= 0) return;
    const existing = lines.get(item.id);
    if (existing) {
      existing.quantity += quantity;
      return;
    }
    lines.set(item.id, { itemId: item.id, quantity, unitPrice: item.price });
  };

  if (channel === 'dine_in') {
    const covers = rng.weighted([
      { value: 1, weight: 12 },
      { value: 2, weight: 44 },
      { value: 3, weight: 20 },
      { value: 4, weight: 17 },
      { value: 6, weight: 7 },
    ]);

    if (rng.bool(0.62)) add(pickItem(rng, 'starters', channel), rng.bool(0.7) ? 1 : 2);
    for (let i = 0; i < covers; i += 1) {
      if (rng.bool(0.93)) add(pickItem(rng, 'mains', channel));
    }
    if (rng.bool(0.48)) add(pickItem(rng, 'sides', channel), rng.int(1, 2));
    for (let i = 0; i < covers; i += 1) {
      if (rng.bool(0.78)) add(pickItem(rng, 'drinks', channel));
    }
    if (rng.bool(0.41)) add(pickItem(rng, 'desserts', channel), rng.int(1, covers));
    // The bica at the end of the meal is close to universal here.
    if (rng.bool(0.66)) add(SEED_BY_ID.get('itm-bica') ?? null, covers);

    return { lines: [...lines.values()], covers };
  }

  if (channel === 'takeaway') {
    const mains = rng.weighted([
      { value: 1, weight: 58 },
      { value: 2, weight: 32 },
      { value: 3, weight: 10 },
    ]);
    for (let i = 0; i < mains; i += 1) add(pickItem(rng, 'mains', channel));
    if (rng.bool(0.34)) add(pickItem(rng, 'sides', channel));
    if (rng.bool(0.29)) add(pickItem(rng, 'drinks', channel));
    if (rng.bool(0.19)) add(pickItem(rng, 'desserts', channel));
    return { lines: [...lines.values()], covers: null };
  }

  // Delivery marketplaces. Each has a genuinely different customer base, and
  // giving them one shared basket profile is a tell: three platforms landing
  // on the same average order value to the cent is not what real data does.
  const profile = DELIVERY_PROFILE[channel];
  const mains = rng.weighted(profile.mains);
  if (rng.bool(profile.starterProbability)) add(pickItem(rng, 'starters', channel));
  for (let i = 0; i < mains; i += 1) add(pickItem(rng, 'mains', channel));
  if (rng.bool(profile.sideProbability)) add(pickItem(rng, 'sides', channel), rng.int(1, 2));
  if (rng.bool(profile.drinkProbability)) add(pickItem(rng, 'drinks', channel), rng.int(1, 2));
  if (rng.bool(profile.dessertProbability)) add(pickItem(rng, 'desserts', channel), rng.int(1, 2));

  return { lines: [...lines.values()], covers: null };
}

/**
 * Ticket time. Driven by the slowest station in the basket rather than the sum
 * - a kitchen fires in parallel - then inflated by how busy that hour is and
 * by the packing step delivery orders need.
 */
function prepMinutesFor(rng: Rng, lines: OrderLine[], channel: Channel, hourLoad: number): number {
  let slowest = 3;
  let dishes = 0;
  for (const line of lines) {
    const item = SEED_BY_ID.get(line.itemId);
    if (!item) continue;
    slowest = Math.max(slowest, STATION_BASE_MINUTES[item.station]);
    if (item.category === 'mains') dishes += line.quantity;
  }

  const queueing = dishes * 1.4;

  // Superlinear in load: a pass at 90 % capacity is far more than 1.5x as slow
  // as one at 60 %, because tickets start queueing behind each other. This is
  // what gives ticket times their long right tail - a normal distribution
  // around a mean would put p95 only a few minutes above p50, which is not
  // how any kitchen has ever behaved.
  const loadPenalty = slowest * Math.pow(hourLoad, 1.9) * 0.9;

  const packing = CHANNEL_META[channel].kind === 'delivery' ? 4 : 0;
  const noise = rng.normal(0, 4.2);

  // Roughly one ticket in thirty goes wrong: a station backs up, an order is
  // dropped, a table's mains get re-fired. These outliers matter - they are
  // most of what a prep-time p95 is actually measuring.
  const mishap = rng.bool(0.033) ? Math.abs(rng.normal(15, 9)) : 0;

  return clamp(
    Math.round(slowest + queueing + loadPenalty + packing + noise + mishap),
    4,
    75,
  );
}

/**
 * Ratings track waiting time, which is the whole reason prep time is worth a
 * chart. A 15-minute ticket averages ~4.7; a 45-minute one averages ~3.5.
 */
function ratingFor(rng: Rng, channel: Channel, prepMinutes: number): number | null {
  const delivery = CHANNEL_META[channel].kind === 'delivery';
  const responseRate = delivery ? 0.64 : 0.09;
  if (!rng.bool(responseRate)) return null;

  const penalty = clamp((prepMinutes - 15) / 30, 0, 1) * 1.2;
  const score = rng.normal(4.75 - penalty, 0.42);
  return clamp(Math.round(score * 2) / 2, 1, 5);
}

function sumLines(lines: OrderLine[]): Cents {
  return lines.reduce((total, line) => total + line.unitPrice * line.quantity, 0);
}

function makeReference(rng: Rng, date: Date): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 4; i += 1) suffix += alphabet[rng.int(0, alphabet.length - 1)];
  return `MSA-${format(date, 'yyMM')}${suffix}`;
}

function generateDayOrders(date: Date, progress: number): Order[] {
  if (isClosed(date)) return [];

  const rng = new Rng(seedFromDate(date));
  const weekday = toMondayFirstWeekday(date);
  const growth = 1 + ANNUAL_GROWTH * progress;

  const expected =
    BASE_DAILY_ORDERS *
    (WEEKDAY_FACTOR[weekday] ?? 1) *
    (SEASON_FACTOR[getMonth(date)] ?? 1) *
    monthCharacter(date) *
    growth;

  const count = Math.max(0, rng.normalInt(expected, expected * 0.16, 0, 400));
  const channelWeights = interpolateChannelWeights(progress);
  const orders: Order[] = [];

  // Pre-count orders per hour so ticket times can react to how slammed the
  // pass actually is. A 21h Saturday order genuinely does take longer.
  const hourCounts = new Map<number, number>();

  const drafts = Array.from({ length: count }, () => {
    const channel = rng.weighted(
      (Object.keys(channelWeights) as Channel[]).map((value) => ({
        value,
        weight: channelWeights[value],
      })),
    );
    const hour = pickHour(rng, CHANNEL_META[channel].kind);
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
    return { channel, hour };
  });

  const busiestHour = Math.max(1, ...hourCounts.values());

  for (const draft of drafts) {
    const { channel, hour } = draft;
    const meta = CHANNEL_META[channel];
    const hourLoad = (hourCounts.get(hour) ?? 0) / busiestHour;

    const placedAt = new Date(date);
    placedAt.setHours(hour, rng.int(0, 59), rng.int(0, 59), 0);

    const { lines, covers } = buildBasket(rng, channel);
    if (lines.length === 0) continue;

    const subtotal = sumLines(lines);

    // Marketplaces run aggressive promos; the dining room almost never
    // discounts, and when it does it is a staff meal or a comped dish.
    const discount = rng.bool(DELIVERY_PROFILE[channel].discountRate)
      ? Math.round(subtotal * rng.weighted([
          { value: 0.1, weight: 40 },
          { value: 0.15, weight: 30 },
          { value: 0.2, weight: 20 },
          { value: 0.3, weight: 10 },
        ]))
      : 0;

    const commissionable = subtotal - discount;
    const commission = Math.round(commissionable * meta.commissionRate);

    // Portugal is not a tipping culture: modest, and only in the dining room.
    // On the marketplaces the tip goes to the courier, never to the kitchen.
    const tip =
      channel === 'dine_in' && rng.bool(0.31)
        ? Math.round(commissionable * rng.float(0.02, 0.08))
        : 0;

    const prepMinutes = prepMinutesFor(rng, lines, channel, hourLoad);

    const status = rng.weighted([
      { value: 'completed' as const, weight: 100 },
      { value: 'refunded' as const, weight: meta.kind === 'delivery' ? 2.4 : 0.5 },
      { value: 'cancelled' as const, weight: meta.kind === 'delivery' ? 2.0 : 1.2 },
    ]);

    orders.push({
      id: `ord-${format(placedAt, 'yyyyMMdd')}-${orders.length.toString().padStart(4, '0')}`,
      reference: makeReference(rng, date),
      placedAt: placedAt.toISOString(),
      channel,
      status,
      lines,
      subtotal,
      discount,
      commission,
      tip,
      // Tips are deliberately excluded from net revenue: in Portugal the
      // gorjeta goes to the staff, not the business. Folding them in would
      // both overstate takings and produce the nonsense of a net figure
      // exceeding gross on the channels that pay no commission.
      net: commissionable - commission,
      prepMinutes,
      rating: ratingFor(rng, channel, prepMinutes),
      covers,
    });
  }

  return orders.sort((a, b) => a.placedAt.localeCompare(b.placedAt));
}

/**
 * Generates every order between `from` and `to` inclusive, oldest first.
 * Roughly 19 000 orders for a twelve-month window.
 */
export function generateOrders(from: Date, to: Date): Order[] {
  const start = startOfDay(from);
  const totalDays = Math.max(1, differenceInCalendarDays(to, start));
  const orders: Order[] = [];

  for (let dayIndex = 0; dayIndex <= totalDays; dayIndex += 1) {
    const date = addDays(start, dayIndex);
    orders.push(...generateDayOrders(date, dayIndex / totalDays));
  }

  return orders;
}
