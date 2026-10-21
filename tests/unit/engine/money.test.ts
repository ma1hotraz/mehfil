import { describe, expect, it } from 'vitest';

import {
  amountsFromPercents,
  apportion,
  currencySymbol,
  formatMoney,
  perGuestMinor,
  roundPercents,
  toMinor,
} from '../../../src/shared/engine/money.js';

describe('apportion (largest remainder)', () => {
  it('gives leftover units to the largest fractional parts', () => {
    expect(apportion([33.3, 33.3, 33.4], 100)).toEqual([33, 33, 34]);
    expect(apportion([1.6, 1.3, 1.1], 4)).toEqual([2, 1, 1]);
  });

  it('breaks ties by position', () => {
    expect(apportion([1.5, 1.5, 1.5, 1.5], 7)).toEqual([2, 2, 2, 1]);
  });

  it('never loses or invents units', () => {
    const result = apportion([10.2, 20.7, 69.1], 100);
    expect(result.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('handles an empty list', () => {
    expect(apportion([], 0)).toEqual([]);
  });
});

describe('amountsFromPercents', () => {
  it('sums exactly to the total in minor units', () => {
    const amounts = amountsFromPercents([22, 30, 12.5, 35.5], 1_800_000_01);
    expect(amounts.reduce((a, b) => a + b, 0)).toBe(1_800_000_01);
  });
});

describe('roundPercents', () => {
  it('rounds to one decimal and sums to exactly 100.0', () => {
    const rounded = roundPercents([33.333, 33.333, 33.334]);
    expect(rounded.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
    expect(rounded.every((p) => Math.abs(p * 10 - Math.round(p * 10)) < 1e-9)).toBe(true);
  });
});

describe('toMinor and perGuestMinor', () => {
  it('converts to minor units', () => {
    expect(toMinor(18_00_000)).toBe(1_800_000_00);
    expect(toMinor(0.1 + 0.2)).toBe(30);
  });

  it('uses floor division per guest', () => {
    expect(perGuestMinor(1000, 3)).toBe(333);
    expect(perGuestMinor(1000, 0)).toBe(1000);
  });
});

describe('formatMoney', () => {
  it('shows lakh grouping for INR', () => {
    expect(formatMoney(toMinor(1_800_000), 'INR')).toBe('₹18,00,000');
  });

  it('formats USD, GBP and EUR', () => {
    expect(formatMoney(toMinor(12_000), 'USD')).toBe('$12,000');
    expect(formatMoney(toMinor(3_000), 'GBP')).toBe('£3,000');
    expect(formatMoney(toMinor(2_500), 'EUR')).toBe('€2,500');
  });

  it('exposes the currency symbol', () => {
    expect(['INR', 'USD', 'GBP', 'EUR'].map((c) => currencySymbol(c as 'INR'))).toEqual([
      '₹',
      '$',
      '£',
      '€',
    ]);
  });
});
