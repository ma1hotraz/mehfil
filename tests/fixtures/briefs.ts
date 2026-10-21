import { EventBrief } from '../../src/shared/schema/brief.js';

/** The fixed "today" used by every deterministic test. */
export const fixedToday = '2026-10-21';

const make = (input: Record<string, unknown>): EventBrief => EventBrief.parse(input);

export const ananya = make({
  eventType: 'wedding',
  subType: 'traditional',
  title: 'Ananya & Kabir',
  date: '2027-05-12',
  guestCount: 250,
  budget: 1_800_000,
  currency: 'INR',
  city: 'Jaipur',
  setting: 'outdoor',
  vibe: ['cultural', 'festive'],
  dietary: ['jain', 'vegetarian'],
  accessibility: ['step-free', 'elderly-guests'],
  traditions: 'Mehendi and sangeet, Rajasthani customs',
  mustHaves: 'Live ghazal singer, no plastic',
});

export const rahul = make({
  eventType: 'birthday',
  subType: 'kids',
  title: 'Aarav turns seven',
  date: '2026-11-11',
  guestCount: 25,
  budget: 40_000,
  currency: 'INR',
  city: 'Pune',
  setting: 'indoor',
  vibe: ['playful'],
  dietary: ['nut-allergy', 'kids-menu'],
});

export const meera = make({
  eventType: 'community',
  subType: 'festival',
  title: 'Diwali Mela',
  date: '2026-11-08',
  guestCount: 400,
  budget: 250_000,
  currency: 'INR',
  city: 'Indore',
  setting: 'outdoor',
  vibe: ['festive', 'cultural'],
  accessibility: ['seating-rest-areas'],
});

export const sam = make({
  eventType: 'birthday',
  subType: 'milestone',
  title: 'Sam turns 40',
  date: '2027-02-20',
  guestCount: 40,
  budget: 3_000,
  currency: 'GBP',
  city: 'London',
  setting: 'indoor',
  vibe: ['elegant'],
});

export const personas = { ananya, rahul, meera, sam } as const;

export const minimalBrief = (overrides: Record<string, unknown> = {}): EventBrief =>
  make({
    eventType: 'wedding',
    subType: 'traditional',
    date: '2027-03-12',
    guestCount: 100,
    budget: 1_000_000,
    currency: 'INR',
    city: 'Delhi',
    setting: 'indoor',
    ...overrides,
  });

export const EVENT_SUBTYPES: readonly (readonly [EventBrief['eventType'], string])[] = [
  ['wedding', 'traditional'],
  ['wedding', 'intimate'],
  ['wedding', 'destination'],
  ['wedding', 'court-and-reception'],
  ['birthday', 'kids'],
  ['birthday', 'teen'],
  ['birthday', 'adult'],
  ['birthday', 'milestone'],
  ['community', 'festival'],
  ['community', 'fundraiser'],
  ['community', 'cultural-night'],
  ['community', 'drive'],
];
