import type { Currency, EventType } from '../../schema/brief.js';

/** Indicative minimum workable budget per guest, whole currency units (docs/04 §5). */
const INR: Record<string, number> = {
  'wedding/traditional': 3500,
  'wedding/intimate': 4000,
  'wedding/destination': 9000,
  'wedding/court-and-reception': 2500,
  'birthday/kids': 800,
  'birthday/teen': 1000,
  'birthday/adult': 1500,
  'birthday/milestone': 2500,
  'community/festival': 250,
  'community/fundraiser': 600,
  'community/cultural-night': 300,
  'community/drive': 100,
};
const USD: Record<string, number> = {
  'wedding/traditional': 150,
  'wedding/intimate': 180,
  'wedding/destination': 300,
  'wedding/court-and-reception': 100,
  'birthday/kids': 25,
  'birthday/teen': 30,
  'birthday/adult': 50,
  'birthday/milestone': 80,
  'community/festival': 12,
  'community/fundraiser': 30,
  'community/cultural-night': 15,
  'community/drive': 5,
};
/** Indicative conversion from the USD table, computed once at load. */
const EUR_PER_USD = 0.92;
const GBP_PER_USD = 0.79;

const scaled = (table: Record<string, number>, factor: number): Record<string, number> =>
  Object.fromEntries(
    Object.entries(table).map(([key, value]) => [key, Math.round(value * factor)]),
  );

const TABLES: Record<Currency, Record<string, number>> = {
  INR,
  USD,
  EUR: scaled(USD, EUR_PER_USD),
  GBP: scaled(USD, GBP_PER_USD),
};

/** Per-guest benchmark in whole currency units; 0 when the key is unknown. */
export const benchmarkPerGuest = (currency: Currency, key: string): number =>
  TABLES[currency][key] ?? 0;

/** Feasibility ratio cut-offs (R10–R12). */
export const RATIO = { comfortable: 1.5, workable: 1.0, tight: 0.6, upgrade: 2.0 } as const;

/** R10 lean-mode tips by event type. */
export const LEAN_TIPS: Record<EventType, readonly string[]> = {
  wedding: [
    'hold a daytime ceremony with a lunch reception',
    'choose a buffet or thali over plated courses',
    'pick a weekday date',
    'send digital invitations',
    'borrow or rent décor instead of buying',
  ],
  birthday: [
    'host it in the daytime at home, a society hall or a park',
    'order one good cake and simple snacks',
    'make décor and favours yourselves',
    'send digital invitations',
    'borrow games instead of hiring an entertainer',
  ],
  community: [
    'use a free municipal ground or school hall',
    'ask local shops for in-kind support',
    'run stalls with volunteers',
    'publicise through resident groups and social posts',
    'invite a potluck or shared meal instead of catering',
  ],
};

/** R12 upgrade suggestions by event type. */
export const UPGRADE_TIPS: Record<EventType, string> = {
  wedding: 'Consider moving 3% more to photo & video and booking a live band.',
  birthday: 'Consider a professional entertainer or a photo booth.',
  community: 'Consider a headline performer, a children’s corner or printed programmes.',
};
