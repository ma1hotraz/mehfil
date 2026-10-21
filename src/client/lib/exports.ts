import { type Result, err, ok } from '../../shared/result.js';
import { toICS } from '../../shared/ics.js';
import { planTitle } from '../../shared/labels.js';
import { planToText } from '../../shared/planText.js';
import type { Plan } from '../../shared/schema/plan.js';

/** File-name-safe slug of the plan title. */
export const fileSlug = (plan: Plan): string =>
  planTitle(plan.brief)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'mehfil-plan';

/** Downloads the open milestones as an .ics file via a Blob (no server round trip). */
export function downloadIcs(plan: Plan): string {
  const name = `${fileSlug(plan)}.ics`;
  const url = URL.createObjectURL(new Blob([toICS(plan)], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return name;
}

/** Copies the plain-text plan; only ever called from an explicit click. */
export async function copyPlanText(plan: Plan): Promise<Result<void, 'unavailable'>> {
  try {
    await navigator.clipboard.writeText(planToText(plan));
    return ok(undefined);
  } catch {
    return err('unavailable');
  }
}
