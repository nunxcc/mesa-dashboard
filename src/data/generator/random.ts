/**
 * Seeded pseudo-random number generator.
 *
 * `Math.random()` would regenerate a different dataset on every page load,
 * which makes screenshots inconsistent, tests non-deterministic and
 * "yesterday's revenue" change while you are looking at it. mulberry32 is a
 * small, well-distributed 32-bit generator - more than enough for fixtures,
 * and it fits in a dozen lines.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface WeightedOption<T> {
  value: T;
  weight: number;
}

export class Rng {
  private readonly next: () => number;

  constructor(seed: number) {
    this.next = mulberry32(seed);
  }

  /** Uniform in [0, 1). */
  float(): number;
  /** Uniform in [min, max). */
  float(min: number, max: number): number;
  float(min?: number, max?: number): number {
    const value = this.next();
    if (min === undefined || max === undefined) return value;
    return min + value * (max - min);
  }

  /** Uniform integer in [min, max], inclusive at both ends. */
  int(min: number, max: number): number {
    return Math.floor(this.float(min, max + 1));
  }

  bool(probability = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Box-Muller transform. Real-world quantities - ticket sizes, prep times -
   * cluster around a mean rather than spreading uniformly, and using a normal
   * distribution is most of what makes generated data stop looking generated.
   */
  normal(mean: number, standardDeviation: number): number {
    const u1 = Math.max(this.next(), Number.EPSILON);
    const u2 = this.next();
    const magnitude = Math.sqrt(-2 * Math.log(u1));
    return mean + standardDeviation * magnitude * Math.cos(2 * Math.PI * u2);
  }

  /** Normal, clamped to a range and rounded. Used for counts and durations. */
  normalInt(mean: number, standardDeviation: number, min: number, max: number): number {
    return clamp(Math.round(this.normal(mean, standardDeviation)), min, max);
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick called with an empty array');
    // Length is known non-zero, so the index is always in bounds.
    return items[Math.floor(this.float() * items.length)] as T;
  }

  /** Picks proportionally to `weight`. Weights need not sum to 1. */
  weighted<T>(options: readonly WeightedOption<T>[]): T {
    if (options.length === 0) throw new Error('Rng.weighted called with no options');
    const total = options.reduce((sum, option) => sum + option.weight, 0);
    let threshold = this.float() * total;
    for (const option of options) {
      threshold -= option.weight;
      if (threshold <= 0) return option.value;
    }
    return (options[options.length - 1] as WeightedOption<T>).value;
  }

  /** Fisher-Yates, on a copy. */
  shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = this.int(0, i);
      const a = result[i] as T;
      const b = result[j] as T;
      result[i] = b;
      result[j] = a;
    }
    return result;
  }

  /** `count` distinct members of `items`, or all of them if count is larger. */
  sample<T>(items: readonly T[], count: number): T[] {
    return this.shuffle(items).slice(0, Math.min(count, items.length));
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
