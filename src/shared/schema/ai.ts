import { z } from 'zod';

import { EventBrief } from './brief.js';
import { CategoryId, Idea, IdeaCategory, Verdict, VendorStatus } from './plan.js';

const safeId = z.string().regex(/^[a-z0-9-]{1,64}$/i);

/** One idea as drafted by the model (no id, no saved flag, bounded strings). */
export const RawIdea = z.object({
  category: IdeaCategory,
  title: z.string().min(1).max(60),
  description: z.string().min(1).max(240),
  costBand: z.number().int().min(1).max(3),
  fitsBecause: z.string().min(1).max(140),
});
export type RawIdea = z.infer<typeof RawIdea>;

export const IdeasModelOutput = z.object({ ideas: z.array(RawIdea).max(12) });

export const IdeasRequest = z.strictObject({
  brief: EventBrief,
  focus: z.union([z.literal('all'), IdeaCategory]).default('all'),
  exclude: z.array(z.string().max(80)).max(20).default([]),
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
        percent: z.number().min(0).max(100),
        amountMinor: z.number().int().min(0),
      }),
    )
    .max(24),
  openMilestones: z
    .array(
      z.strictObject({
        title: z.string().max(120),
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        critical: z.boolean(),
      }),
    )
    .max(8),
  vendors: z
    .array(
      z.strictObject({
        id: safeId,
        label: z.string().max(80),
        status: VendorStatus,
        bookByDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .max(40),
  feasibility: z.strictObject({
    verdict: Verdict,
    perGuestMinor: z.number().int().min(0),
    benchmarkMinor: z.number().int().min(0),
  }),
  leadDays: z.number().int().min(0).max(1200),
});
export type PlanDigest = z.infer<typeof PlanDigest>;

export const SuggestedAction = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('shiftBudget'),
    from: CategoryId,
    to: CategoryId,
    percent: z.number().min(0.5).max(20),
    rationale: z.string().max(200),
  }),
  z.strictObject({
    type: z.literal('addTask'),
    title: z.string().min(1).max(80),
    daysBeforeEvent: z.number().int().min(0).max(730),
    category: z.union([CategoryId, z.literal('general')]),
    rationale: z.string().max(200),
  }),
  z.strictObject({
    type: z.literal('markVendor'),
    vendorId: safeId,
    status: VendorStatus,
    rationale: z.string().max(200),
  }),
]);
export type SuggestedAction = z.infer<typeof SuggestedAction>;

export const ChatTurn = z.strictObject({
  role: z.enum(['user', 'planner']),
  text: z.string().max(600),
});
export type ChatTurn = z.infer<typeof ChatTurn>;

export const AssistantRequest = z.strictObject({
  brief: EventBrief,
  plan: PlanDigest,
  history: z.array(ChatTurn).max(10).default([]),
  question: z.string().trim().min(1).max(500),
});
export type AssistantRequest = z.infer<typeof AssistantRequest>;

export const AssistantResponse = z.strictObject({
  answer: z.string().max(900),
  suggestedActions: z.array(SuggestedAction).max(3),
  source: z.enum(['gemini', 'rules']),
});
export type AssistantResponse = z.infer<typeof AssistantResponse>;
