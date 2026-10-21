import { stableHash } from '../hash.js';
import type { EventBrief } from '../schema/brief.js';
import { SCHEMA_VERSION, type Plan } from '../schema/plan.js';

import { allocate, buildLedger } from './budget.js';
import { diffDays } from './dates.js';
import { feasibility, feasibilityInsights } from './feasibility.js';
import { sortInsights } from './insights.js';
import { toMinor } from './money.js';
import { buildRunSheet } from './runsheet.js';
import { buildTimeline, maxOffsetFor } from './timeline.js';
import { buildVendors } from './vendors.js';

export { applyAction } from './actions.js';
export { feasibility } from './feasibility.js';
export { rebalance } from './budget.js';

export interface PlanMeta {
  id: string;
  /** ISO timestamp used for createdAt/updatedAt; injected so the engine stays pure. */
  now: string;
}

/**
 * Builds a complete plan from a validated brief. Pure and deterministic: the same brief and
 * `today` always return deep-equal plans. Ideas start empty and are filled in afterwards.
 * @example buildPlan(brief, '2026-10-21').ledger // exact to the paisa
 */
export function buildPlan(brief: EventBrief, today: string, meta?: PlanMeta): Plan {
  const leadDays = Math.max(0, diffDays(today, brief.date));
  const totalMinor = toMinor(brief.budget);
  const budget = allocate(brief, leadDays);
  const fit = feasibility(brief);
  const timeline = buildTimeline(brief, leadDays);
  const vendors = buildVendors(brief, leadDays, maxOffsetFor(brief));
  const resolved = meta ?? {
    id: `plan-${stableHash(JSON.stringify(brief) + today)}`,
    now: `${today}T00:00:00.000Z`,
  };
  return {
    schemaVersion: SCHEMA_VERSION,
    id: resolved.id,
    createdAt: resolved.now,
    updatedAt: resolved.now,
    brief,
    feasibility: fit,
    ledger: buildLedger(budget.percents, totalMinor),
    timeline: timeline.milestones,
    vendors: vendors.vendors,
    runSheet: buildRunSheet(brief),
    insights: sortInsights([
      ...budget.insights,
      ...feasibilityInsights(brief, fit),
      ...timeline.insights,
      ...vendors.insights,
    ]),
    ideas: [],
    ideasSource: 'pending',
  };
}
