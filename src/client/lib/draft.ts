import { type Result, err, ok } from '../../shared/result.js';
import { addDays } from '../../shared/engine/dates.js';
import {
  type Access,
  type Currency,
  type Dietary,
  EventBrief,
  type EventType,
  SUB_TYPES,
  type Setting,
  type Vibe,
  checkBriefDate,
} from '../../shared/schema/brief.js';

export const FIELD_KEYS = [
  'eventType',
  'subType',
  'guestCount',
  'city',
  'date',
  'setting',
  'budget',
  'currency',
  'title',
  'vibe',
  'dietary',
  'accessibility',
  'traditions',
  'mustHaves',
] as const;
export type FieldKey = (typeof FIELD_KEYS)[number];
export type FieldErrors = Partial<Record<FieldKey, string>>;

/** The intake form as typed: numbers stay strings until the brief is validated. */
export interface IntakeDraft {
  eventType: EventType;
  subType: string;
  title: string;
  date: string;
  guestCount: string;
  budget: string;
  currency: Currency;
  city: string;
  setting: Setting;
  vibe: Vibe[];
  dietary: Dietary[];
  accessibility: Access[];
  traditions: string;
  mustHaves: string;
}

/** A blank invitation sentence, dated three months out so the first plan is never rushed. */
export function emptyDraft(today: string): IntakeDraft {
  return {
    eventType: 'wedding',
    subType: 'traditional',
    title: '',
    date: addDays(today, 90),
    guestCount: '',
    budget: '',
    currency: 'INR',
    city: '',
    setting: 'indoor',
    vibe: [],
    dietary: [],
    accessibility: [],
    traditions: '',
    mustHaves: '',
  };
}

export function draftFromBrief(brief: EventBrief): IntakeDraft {
  return {
    eventType: brief.eventType,
    subType: brief.subType,
    title: brief.title ?? '',
    date: brief.date,
    guestCount: String(brief.guestCount),
    budget: String(brief.budget),
    currency: brief.currency,
    city: brief.city,
    setting: brief.setting,
    vibe: [...brief.vibe],
    dietary: [...brief.dietary],
    accessibility: [...brief.accessibility],
    traditions: brief.traditions,
    mustHaves: brief.mustHaves,
  };
}

/** Sub-type to use when the event type changes: keep the current one only if it still belongs. */
export function subTypeFor(eventType: EventType, current: string): string {
  const options: readonly string[] = SUB_TYPES[eventType];
  return options.includes(current) ? current : (options[0] ?? current);
}

/**
 * Reads a money amount typed with any separators or symbol ("₹ 18,00,000" → 1800000).
 * @returns undefined when no number can be read.
 */
export function parseAmount(text: string): number | undefined {
  const cleaned = text.replace(/[^\d.]/g, '');
  const value = cleaned === '' ? Number.NaN : Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
}

export function parseCount(text: string): number | undefined {
  const digits = text.replace(/[^\d]/g, '');
  return digits === '' ? undefined : Number(digits);
}

const MESSAGES: Partial<Record<FieldKey, string>> = {
  eventType: 'Choose an event type',
  subType: 'Choose a sub-type that belongs to this event type',
  guestCount: 'Enter a guest count from 1 to 5,000',
  budget: 'Enter a budget above zero',
  city: 'Enter a city (up to 60 characters)',
  date: 'Enter a date from today up to three years ahead',
  title: 'Keep the title to 80 characters or fewer',
  traditions: 'Keep traditions to 200 characters or fewer',
  mustHaves: 'Keep must-haves to 300 characters or fewer',
};

const isFieldKey = (value: unknown): value is FieldKey =>
  typeof value === 'string' && (FIELD_KEYS as readonly string[]).includes(value);

/** The unvalidated object handed to the shared schema. */
function candidateOf(draft: IntakeDraft): Record<string, unknown> {
  return {
    eventType: draft.eventType,
    subType: draft.subType,
    ...(draft.title.trim() ? { title: draft.title } : {}),
    date: draft.date,
    guestCount: parseCount(draft.guestCount) ?? 0,
    budget: parseAmount(draft.budget) ?? 0,
    currency: draft.currency,
    city: draft.city,
    setting: draft.setting,
    vibe: draft.vibe,
    dietary: draft.dietary,
    accessibility: draft.accessibility,
    traditions: draft.traditions,
    mustHaves: draft.mustHaves,
  };
}

function errorsFrom(issues: readonly { path: PropertyKey[]; message: string }[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (isFieldKey(key)) {
      errors[key] ??= MESSAGES[key] ?? issue.message;
    }
  }
  return errors;
}

/** Checks the draft with the shared schema and returns friendly, per-field messages. */
export function parseDraft(draft: IntakeDraft, today: string): Result<EventBrief, FieldErrors> {
  const parsed = EventBrief.safeParse(candidateOf(draft));
  const errors = parsed.success ? {} : errorsFrom(parsed.error.issues);
  const dateProblem = errors.date ? undefined : checkBriefDate(draft.date, today);
  return parsed.success && !dateProblem
    ? ok(parsed.data)
    : err({ ...errors, ...(dateProblem ? { date: dateProblem } : {}) });
}
