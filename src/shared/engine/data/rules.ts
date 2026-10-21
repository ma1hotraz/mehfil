import type { Currency, EventType } from '../../schema/brief.js';

export type Region = 'india' | 'europe' | 'us';

/** Region for season rules is derived from currency (docs/04 §3). */
export const REGION_BY_CURRENCY: Record<Currency, Region> = {
  INR: 'india',
  GBP: 'europe',
  EUR: 'europe',
  USD: 'us',
};

export const REGION_NAMES: Record<Region, string> = {
  india: 'India',
  europe: 'Europe',
  us: 'the US',
};

export type SeasonRisk = 'monsoon' | 'peak-heat' | 'cold';

/** R03 risk months (0 = January) per region. */
export const RISK_MONTHS: Record<Region, Record<number, SeasonRisk>> = {
  india: { 3: 'peak-heat', 4: 'peak-heat', 5: 'monsoon', 6: 'monsoon', 7: 'monsoon', 8: 'monsoon' },
  europe: { 10: 'cold', 11: 'cold', 0: 'cold', 1: 'cold', 2: 'cold' },
  us: { 11: 'cold', 0: 'cold', 1: 'cold' },
};

/** Percentage points moved by each rule. */
export const SHARES = {
  weatherOutdoor: 5, // R01
  weatherMixed: 3, // R02
  weatherSeason: 3, // R03
  accessibilityBase: 2, // R04
  accessibilityExtra: 1, // R04 when 3+ needs
  crowdFlow: 2, // R05
  safetyMinimum: 10, // R06
  rushContingency: 3, // R07
} as const;

export const THRESHOLDS = {
  /** R04: needs count that earns the extra point. */
  accessibilityManyNeeds: 3,
  /** R05: weddings and birthdays above this many guests get crowd-flow money. */
  largeCrowd: 150,
  /** R06: community events above this many attendees need a safety plan. */
  safetyCrowd: 300,
  contingencyMin: 5, // R08
  contingencyMax: 15, // R08
  /** applyAction never lets contingency fall below this. */
  contingencyFloor: 3,
} as const;

/** R07: lead days below which an event counts as rushed. */
export const RUSH_DAYS: Record<EventType, number> = { wedding: 60, birthday: 7, community: 21 };

/** Largest slider value in the ledger; the rest is always left to other lines. */
export const MAX_LINE_PERCENT = 90;

/** Order in which ledger lines appear (contingency last). */
export { CATEGORY_IDS as CATEGORY_ORDER } from '../../schema/plan.js';
