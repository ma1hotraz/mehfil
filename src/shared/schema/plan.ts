import { z } from 'zod';

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

const id = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

export const LedgerLine = z.strictObject({
  id: CategoryId,
  label: z.string().max(60),
  percent: z.number().min(0).max(100),
  amountMinor: z.number().int().min(0),
  recommendedPercent: z.number().min(0).max(100),
  note: z.string().max(240),
  committedMinor: z.number().int().min(0).optional(),
});
export type LedgerLine = z.infer<typeof LedgerLine>;

export const Milestone = z.strictObject({
  id,
  title: z.string().max(120),
  detail: z.string().max(300),
  category: z.union([CategoryId, z.literal('general')]),
  phase: Phase,
  idealOffsetDays: z.number().int(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rushed: z.boolean(),
  critical: z.boolean(),
  done: z.boolean(),
});
export type Milestone = z.infer<typeof Milestone>;

export const VendorStatus = z.enum(['to-find', 'enquired', 'booked', 'paid']);
export type VendorStatus = z.infer<typeof VendorStatus>;

export const VendorContact = z.strictObject({
  name: z.string().max(80).optional(),
  phone: z.string().max(30).optional(),
  notes: z.string().max(300).optional(),
});
export type VendorContact = z.infer<typeof VendorContact>;

export const VendorItem = z.strictObject({
  id,
  label: z.string().max(80),
  reason: z.string().max(300),
  bookByDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  questions: z.array(z.string().max(200)).max(12),
  status: VendorStatus,
  contact: VendorContact.optional(),
});
export type VendorItem = z.infer<typeof VendorItem>;

export const Severity = z.enum(['info', 'advice', 'warning', 'critical']);
export type Severity = z.infer<typeof Severity>;

export const Insight = z.strictObject({
  id,
  ruleId: z.string().regex(/^R\d{2}$/),
  severity: Severity,
  title: z.string().max(140),
  detail: z.string().max(500),
});
export type Insight = z.infer<typeof Insight>;

export const RunSlot = z.strictObject({
  id,
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  title: z.string().max(120),
  owner: z.string().max(60),
  note: z.string().max(200).optional(),
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
  title: z.string().max(60),
  description: z.string().max(240),
  costBand: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  fitsBecause: z.string().max(140),
  saved: z.boolean(),
});
export type Idea = z.infer<typeof Idea>;

export const Verdict = z.enum(['comfortable', 'workable', 'tight', 'unrealistic']);
export type Verdict = z.infer<typeof Verdict>;

export const Feasibility = z.strictObject({
  verdict: Verdict,
  perGuestMinor: z.number().int().min(0),
  benchmarkMinor: z.number().int().min(0),
  ratio: z.number().min(0),
  reason: z.string().max(240),
});
export type Feasibility = z.infer<typeof Feasibility>;

export const IdeasSource = z.enum(['gemini', 'library', 'pending']);
export type IdeasSource = z.infer<typeof IdeasSource>;

export const SCHEMA_VERSION = 1;

export const Plan = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id,
  createdAt: z.string().max(40),
  updatedAt: z.string().max(40),
  brief: EventBrief,
  feasibility: Feasibility,
  ledger: z.array(LedgerLine).max(24),
  timeline: z.array(Milestone).max(80),
  vendors: z.array(VendorItem).max(40),
  runSheet: z.array(RunSlot).max(40),
  insights: z.array(Insight).max(40),
  ideas: z.array(Idea).max(60),
  ideasSource: IdeasSource,
});
export type Plan = z.infer<typeof Plan>;
