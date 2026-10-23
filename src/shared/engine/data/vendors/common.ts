import type { EventBrief, EventType } from '../../../schema/brief.js';

/** What a vendor does, so cross-cutting questions can find the right one. */
export type VendorRole = 'venue' | 'food' | 'sound' | 'seating';

export interface VendorTemplate {
  id: string;
  label: string;
  appliesTo: readonly EventType[];
  roles?: readonly VendorRole[];
  when?: (brief: EventBrief) => boolean;
  /** Names the rule that added this vendor (shown on the ticket). */
  reason: (brief: EventBrief) => string;
  /** Days before the event by which to book. */
  bookByOffset: number;
  questions: (brief: EventBrief) => string[];
}

export const ALL: readonly EventType[] = ['wedding', 'birthday', 'community'];
export const WEDDING_BIRTHDAY: readonly EventType[] = ['wedding', 'birthday'];

/** "an indoor venue", "an outdoor venue" or "a part-outdoor venue". */
export const venueKind = (brief: EventBrief): string =>
  brief.setting === 'indoor'
    ? 'an indoor venue'
    : brief.setting === 'outdoor'
      ? 'an outdoor venue'
      : 'a part-outdoor venue';
/** "indoors", "outdoors" or "part outdoors", for "the event is ...". */
export const eventIs = (brief: EventBrief): string =>
  brief.setting === 'indoor'
    ? 'indoors'
    : brief.setting === 'outdoor'
      ? 'outdoors'
      : 'part outdoors';
export const kind = (brief: EventBrief): string =>
  `${brief.subType} ${brief.eventType}`.replace('-', ' ');
export const guests = (brief: EventBrief): string => `${brief.guestCount} guests`;

export const QUESTIONS = {
  venue: [
    'What is the guest capacity for seated and standing set-ups?',
    'Which hours are included, and what do extra hours cost?',
    'Is there backup power and ample parking?',
    'What is the cancellation and refund policy?',
  ],
  caterer: [
    'Can we taste the menu before booking?',
    'Is the price per plate all-inclusive of staff and crockery?',
    'How do you handle allergies and special diets?',
    'What is the last date to change the headcount?',
  ],
  decor: [
    'Can you share photos of similar work and a written quote?',
    'What happens if flowers or materials are unavailable?',
    'Who sets up and clears, and by what time?',
  ],
  photo: [
    'Can we see a full album from a similar event?',
    'How many hours and how many photographers are included?',
    'When will we receive edited photos, and in what format?',
    'Who owns the files and can we print them?',
  ],
  music: [
    'Can you share a set list or sample mixes?',
    'What sound equipment do you bring?',
    'What is your overtime rate?',
  ],
  generic: [
    'Can you give a written quote with everything included?',
    'What deposit is needed and when is the balance due?',
    'What is your cancellation policy?',
  ],
} as const;

export const cakeQuestions = [
  'Can you make the cake egg-free, nut-free or vegan if needed?',
  'Do you deliver and set up at the venue?',
  'How much notice do you need for custom designs?',
];
