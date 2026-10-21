import type { Currency } from '../schema/brief.js';

const LOCALES: Record<Currency, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  GBP: 'en-GB',
  EUR: 'en-IE',
};

/** Converts a whole/decimal currency amount to integer minor units (paise, cents, pence). */
export const toMinor = (amount: number): number => Math.round(amount * 100);

/**
 * Largest-remainder apportionment: turns fractional `quotas` into integers that sum exactly to
 * `total`. Leftover units go to the largest fractional parts; ties are broken by position.
 * @example apportion([33.3, 33.3, 33.4], 100) // [33, 33, 34]
 */
export function apportion(quotas: readonly number[], total: number): number[] {
  const floors = quotas.map((q) => Math.floor(q));
  const leftover = Math.max(0, total - floors.reduce((sum, n) => sum + n, 0));
  const winners = quotas
    .map((q, index) => ({ index, fraction: q - Math.floor(q) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
    .slice(0, leftover)
    .map(({ index }) => index);
  const bonus = new Set(winners);
  return floors.map((floor, index) => floor + (bonus.has(index) ? 1 : 0));
}

/** Splits `totalMinor` by percentages (which should sum to 100) into exact integer amounts. */
export function amountsFromPercents(percents: readonly number[], totalMinor: number): number[] {
  return apportion(
    percents.map((p) => (p * totalMinor) / 100),
    totalMinor,
  );
}

/** Rounds percentages to one decimal so they sum to exactly 100.0. */
export function roundPercents(percents: readonly number[]): number[] {
  return apportion(
    percents.map((p) => p * 10),
    1000,
  ).map((tenths) => tenths / 10);
}

/** Whole-unit-per-guest budget in minor units (floor division, docs/04 §4). */
export const perGuestMinor = (totalMinor: number, guestCount: number): number =>
  Math.floor(totalMinor / Math.max(1, guestCount));

/**
 * Formats minor units for display. INR uses lakh/crore grouping.
 * @example formatMoney(180000000, 'INR') // '₹18,00,000'
 */
export function formatMoney(minor: number, currency: Currency): string {
  return new Intl.NumberFormat(LOCALES[currency], {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

export const currencySymbol = (currency: Currency): string =>
  currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€';
