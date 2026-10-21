import * as z from 'zod/mini';

import { EventBrief } from './brief.js';
import { CategoryId, Idea, IdeaCategory, VendorStatus, Verdict } from './plan.js';

const safeId = z.string().check(z.regex(/^[a-z0-9-]{1,64}$/i));
const isoDate = z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}$/));
const str = (max: number) => z.string().check(z.maxLength(max));
const minor = z.int().check(z.gte(0));

/** One idea as drafted by the model (no id, no saved flag, bounded strings). */
export const RawIdea = z.object({
  category: IdeaCategory,
  title: z.string().check(z.minLength(1), z.maxLength(60)),
  description: z.string().check(z.minLength(1), z.maxLength(240)),
  costBand: z.int().check(z.gte(1), z.lte(3)),
  fitsBecause: z.string().check(z.minLength(1), z.maxLength(140)),
});
export type RawIdea = z.infer<typeof RawIdea>;

export const IdeasModelOutput = z.object({
  ideas: z.array(RawIdea).check(z.maxLength(12)),
});

export const IdeasRequest = z.strictObject({
  brief: EventBrief,
  focus: z._default(z.union([z.literal('all'), IdeaCategory]), 'all'),
  exclude: z._default(z.array(str(80)).check(z.maxLength(20)), []),
});
export type IdeasRequest = z.infer<typeof IdeasRequest>;

export const IdeasResponse = z.strictObject({
  ideas: z.array(Idea),
  source: z.enum(['gemini', 'library']),
});
export type IdeasResponse = z.infer<typeof IdeasResponse>;

/** Compact view of the plan sent to the assistant (docs/03 §5). Ids are pattern-checked. */
export const PlanDigest = z.strictObject({
  ledger: z
    .array(
      z.strictObject({
        id: CategoryId,
        percent: z.number().check(z.gte(0), z.lte(100)),
        amountMinor: minor,
      }),
    )
    .check(z.maxLength(24)),
  openMilestones: z
    .array(
      z.strictObject({
        title: str(120),
        dueDate: isoDate,
        critical: z.boolean(),
      }),
    )
    .check(z.maxLength(8)),
  vendors: z
    .array(
      z.strictObject({
        id: safeId,
        label: str(80),
        status: VendorStatus,
        bookByDate: isoDate,
      }),
    )
    .check(z.maxLength(40)),
  feasibility: z.strictObject({
    verdict: Verdict,
    perGuestMinor: minor,
    benchmarkMinor: minor,
  }),
  leadDays: z.int().check(z.gte(0), z.lte(1200)),
});
export type PlanDigest = z.infer<typeof PlanDigest>;

export const SuggestedAction = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('shiftBudget'),
    from: CategoryId,
    to: CategoryId,
    percent: z.number().check(z.gte(0.5), z.lte(20)),
    rationale: str(200),
  }),
  z.strictObject({
    type: z.literal('addTask'),
    title: z.string().check(z.minLength(1), z.maxLength(80)),
    daysBeforeEvent: z.int().check(z.gte(0), z.lte(730)),
    category: z.union([CategoryId, z.literal('general')]),
    rationale: str(200),
  }),
  z.strictObject({
    type: z.literal('markVendor'),
    vendorId: safeId,
    status: VendorStatus,
    rationale: str(200),
  }),
]);
export type SuggestedAction = z.infer<typeof SuggestedAction>;

export const ChatTurn = z.strictObject({
  role: z.enum(['user', 'planner']),
  text: str(600),
});
export type ChatTurn = z.infer<typeof ChatTurn>;

export const AssistantRequest = z.strictObject({
  brief: EventBrief,
  plan: PlanDigest,
  history: z._default(z.array(ChatTurn).check(z.maxLength(10)), []),
  question: z.string().check(z.trim(), z.minLength(1), z.maxLength(500)),
});
export type AssistantRequest = z.infer<typeof AssistantRequest>;

export const AssistantResponse = z.strictObject({
  answer: str(900),
  suggestedActions: z.array(SuggestedAction).check(z.maxLength(3)),
  source: z.enum(['gemini', 'rules']),
});
export type AssistantResponse = z.infer<typeof AssistantResponse>;
