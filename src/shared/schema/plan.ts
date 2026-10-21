import * as z from 'zod/mini';

import { EventBrief } from './brief.js';

export const CATEGORY_IDS = [
  'venue',
  'catering',
  'decor',
  'photo',
  'attire',
  'entertainment',
  'invitations',
  'transport',
  'travel',
  'favors',
  'permits',
  'logistics',
  'safety',
  'outreach',
  'supplies',
  'weatherCover',
  'accessibility',
  'contingency',
] as const;
export const CategoryId = z.enum(CATEGORY_IDS);
export type CategoryId = z.infer<typeof CategoryId>;

export const PHASES = [
  'six-months',
  'three-to-six',
  'one-to-three',
  'final-month',
  'final-week',
  'day',
  'afterwards',
] as const;
export const Phase = z.enum(PHASES);
export type Phase = z.infer<typeof Phase>;

const id = z.string().check(z.regex(/^[A-Za-z0-9_-]{1,64}$/));
const isoDate = z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}$/));
const str = (max: number) => z.string().check(z.maxLength(max));
const percent = z.number().check(z.gte(0), z.lte(100));
const minor = z.int().check(z.gte(0));

export const LedgerLine = z.strictObject({
  id: CategoryId,
  label: str(60),
  percent,
  amountMinor: minor,
  recommendedPercent: percent,
  note: str(240),
  committedMinor: z.optional(minor),
});
export type LedgerLine = z.infer<typeof LedgerLine>;

export const Milestone = z.strictObject({
  id,
  title: str(120),
  detail: str(300),
  category: z.union([CategoryId, z.literal('general')]),
  phase: Phase,
  idealOffsetDays: z.int(),
  dueDate: isoDate,
  rushed: z.boolean(),
  critical: z.boolean(),
  done: z.boolean(),
});
export type Milestone = z.infer<typeof Milestone>;

export const VendorStatus = z.enum(['to-find', 'enquired', 'booked', 'paid']);
export type VendorStatus = z.infer<typeof VendorStatus>;

export const VendorContact = z.strictObject({
  name: z.optional(str(80)),
  phone: z.optional(str(30)),
  notes: z.optional(str(300)),
});
export type VendorContact = z.infer<typeof VendorContact>;

export const VendorItem = z.strictObject({
  id,
  label: str(80),
  reason: str(300),
  bookByDate: isoDate,
  questions: z.array(str(200)).check(z.maxLength(12)),
  status: VendorStatus,
  contact: z.optional(VendorContact),
});
export type VendorItem = z.infer<typeof VendorItem>;

export const Severity = z.enum(['info', 'advice', 'warning', 'critical']);
export type Severity = z.infer<typeof Severity>;

export const Insight = z.strictObject({
  id,
  ruleId: z.string().check(z.regex(/^R\d{2}$/)),
  severity: Severity,
  title: str(140),
  detail: str(500),
});
export type Insight = z.infer<typeof Insight>;

export const RunSlot = z.strictObject({
  id,
  time: z.string().check(z.regex(/^([01]\d|2[0-3]):[0-5]\d$/)),
  title: str(120),
  owner: str(60),
  note: z.optional(str(200)),
});
export type RunSlot = z.infer<typeof RunSlot>;

export const IDEA_CATEGORIES = [
  'theme',
  'decor',
  'food',
  'activities',
  'favors',
  'inclusion',
] as const;
export const IdeaCategory = z.enum(IDEA_CATEGORIES);
export type IdeaCategory = z.infer<typeof IdeaCategory>;

export const Idea = z.strictObject({
  id,
  category: IdeaCategory,
  title: str(60),
  description: str(240),
  costBand: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  fitsBecause: str(140),
  saved: z.boolean(),
});
export type Idea = z.infer<typeof Idea>;

export const Verdict = z.enum(['comfortable', 'workable', 'tight', 'unrealistic']);
export type Verdict = z.infer<typeof Verdict>;

export const Feasibility = z.strictObject({
  verdict: Verdict,
  perGuestMinor: minor,
  benchmarkMinor: minor,
  ratio: z.number().check(z.gte(0)),
  reason: str(240),
});
export type Feasibility = z.infer<typeof Feasibility>;

export const IdeasSource = z.enum(['gemini', 'library', 'pending']);
export type IdeasSource = z.infer<typeof IdeasSource>;

export const SCHEMA_VERSION = 1;

export const Plan = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id,
  createdAt: str(40),
  updatedAt: str(40),
  brief: EventBrief,
  feasibility: Feasibility,
  ledger: z.array(LedgerLine).check(z.maxLength(24)),
  timeline: z.array(Milestone).check(z.maxLength(80)),
  vendors: z.array(VendorItem).check(z.maxLength(40)),
  runSheet: z.array(RunSlot).check(z.maxLength(40)),
  insights: z.array(Insight).check(z.maxLength(40)),
  ideas: z.array(Idea).check(z.maxLength(60)),
  ideasSource: IdeasSource,
});
export type Plan = z.infer<typeof Plan>;
