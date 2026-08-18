import { describe, expect, it } from 'vitest';
import { formatCurrency, formatMinutes, formatRating, percentChange } from './format';

describe('percentChange', () => {
  it('returns null when the baseline is zero', () => {
    // "Up from nothing" is not a percentage. Returning Infinity here is how a
    // KPI tile ends up rendering "+∞ %" and losing the reader's trust.
    expect(percentChange(500, 0)).toBeNull();
  });

  it('computes a rise and a fall symmetrically', () => {
    expect(percentChange(110, 100)).toBeCloseTo(0.1, 6);
    expect(percentChange(90, 100)).toBeCloseTo(-0.1, 6);
  });

  it('uses the magnitude of the baseline, so a negative baseline still reads correctly', () => {
    expect(percentChange(-50, -100)).toBeCloseTo(0.5, 6);
  });
});

describe('formatCurrency', () => {
  it('renders cents as euros', () => {
    // Portuguese conventions: comma decimal separator, trailing symbol. The
    // space before it is a narrow no-break space, hence the loose assertions.
    const formatted = formatCurrency(123_456);
    expect(formatted).toContain('1');
    expect(formatted).toContain('234,56');
    expect(formatted).toContain('€');
  });

  it('honours a zero-decimal request', () => {
    expect(formatCurrency(150_000, { decimals: 0 })).not.toContain(',');
  });
});

describe('formatMinutes', () => {
  it('stays in minutes below an hour', () => {
    expect(formatMinutes(45)).toBe('45 min');
  });

  it('switches to hours and minutes above one', () => {
    expect(formatMinutes(90)).toBe('1 h 30 min');
  });

  it('omits the minutes on a whole hour', () => {
    expect(formatMinutes(120)).toBe('2 h');
  });
});

describe('formatRating', () => {
  it('renders an em dash rather than zero for an unrated order', () => {
    expect(formatRating(null)).toBe('—');
  });
});
