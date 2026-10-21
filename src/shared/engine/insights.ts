import type { Insight, Severity } from '../schema/plan.js';

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, warning: 1, advice: 2, info: 3 };

/** Sorts insights critical → info, then by rule id, then id (docs/04 §9). */
export function sortInsights(insights: readonly Insight[]): Insight[] {
  return [...insights].sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      a.ruleId.localeCompare(b.ruleId) ||
      a.id.localeCompare(b.id),
  );
}
