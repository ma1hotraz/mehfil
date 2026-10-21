import { z } from 'zod';

import { addDays, diffDays, isValidDate } from '../engine/dates.js';

export const EventType = z.enum(['wedding', 'birthday', 'community']);
export type EventType = z.infer<typeof EventType>;

export const SUB_TYPES = {
  wedding: ['traditional', 'intimate', 'destination', 'court-and-reception'],
  birthday: ['kids', 'teen', 'adult', 'milestone'],
  community: ['festival', 'fundraiser', 'cultural-night', 'drive'],
} as const satisfies Record<EventType, readonly string[]>;

export const Currency = z.enum(['INR', 'USD', 'EUR', 'GBP']);
export type Currency = z.infer<typeof Currency>;

export const Setting = z.enum(['indoor', 'outdoor', 'mixed']);
export type Setting = z.infer<typeof Setting>;

export const VIBES = [
  'classic',
  'playful',
  'minimalist',
  'festive',
  'rustic',
  'elegant',
  'eco-conscious',
  'cultural',
] as const;
export const Vibe = z.enum(VIBES);
export type Vibe = z.infer<typeof Vibe>;

export const DIETARY = [
  'vegetarian',
  'vegan',
  'jain',
  'halal',
  'gluten-free',
  'nut-allergy',
  'kids-menu',
] as const;
export const Dietary = z.enum(DIETARY);
export type Dietary = z.infer<typeof Dietary>;

export const ACCESS = [
  'step-free',
  'hearing-support',
  'visual-support',
  'seating-rest-areas',
  'sensory-friendly',
  'elderly-guests',
] as const;
export const Access = z.enum(ACCESS);
export type Access = z.infer<typeof Access>;

/** How far ahead an event may be planned, in days (~3 years). */
export const MAX_LEAD_DAYS = 1095;

const uniqueList = <T extends z.ZodType>(item: T, max: number) =>
  z
    .array(item)
    .max(max)
    .refine((list) => new Set(list).size === list.length, 'Duplicate entries are not allowed')
    .default([]);

/** The Event Brief: the single validated input to the engine, the server and the prompts. */
export const EventBrief = z
  .strictObject({
    eventType: EventType,
    subType: z.string(),
    title: z.string().trim().max(80).optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
      .refine(isValidDate, 'Enter a real calendar date'),
    guestCount: z.number().int().min(1).max(5000),
    budget: z.number().positive().max(1e10),
    currency: Currency,
    city: z.string().trim().min(1, 'Enter a city').max(60),
    setting: Setting,
    vibe: uniqueList(Vibe, 3),
    dietary: uniqueList(Dietary, 7),
    accessibility: uniqueList(Access, 6),
    traditions: z.string().trim().max(200).default(''),
    mustHaves: z.string().trim().max(300).default(''),
  })
  .refine((brief) => (SUB_TYPES[brief.eventType] as readonly string[]).includes(brief.subType), {
    path: ['subType'],
    message: 'Choose a sub-type that belongs to this event type',
  });
export type EventBrief = z.infer<typeof EventBrief>;

/**
 * Checks the event date against `today`. One day of tolerance in the past absorbs timezone
 * differences between browser and server (docs/08 §3).
 * @returns an error message, or `undefined` when the date is acceptable.
 */
export function checkBriefDate(
  date: string,
  today: string,
  pastToleranceDays = 0,
): string | undefined {
  const lead = diffDays(today, date);
  if (lead < -pastToleranceDays) {
    return 'Enter a date from today up to three years ahead';
  }
  if (lead > MAX_LEAD_DAYS) {
    return 'Enter a date from today up to three years ahead';
  }
  return undefined;
}

/** Latest acceptable event date for `today`. */
export const latestEventDate = (today: string): string => addDays(today, MAX_LEAD_DAYS);
