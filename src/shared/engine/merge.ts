import type { Plan } from '../schema/plan.js';

import { amountsFromPercents, toMinor } from './money.js';

const isCustom = (id: string): boolean => id.startsWith('custom-');

/** True when every ledger line in `a` has a counterpart in `b` and vice versa. */
const sameLines = (a: Plan, b: Plan): boolean =>
  a.ledger.length === b.ledger.length &&
  a.ledger.every((line) => b.ledger.some((l) => l.id === line.id));

const wasEdited = (plan: Plan): boolean =>
  plan.ledger.some((line) => Math.abs(line.percent - line.recommendedPercent) > 1e-9);

function mergeTimeline(previous: Plan, fresh: Plan): Plan['timeline'] {
  const doneIds = new Set(previous.timeline.filter((m) => m.done).map((m) => m.id));
  const custom = previous.timeline.filter(
    (m) => isCustom(m.id) && !fresh.timeline.some((f) => f.id === m.id),
  );
  return [...fresh.timeline.map((m) => ({ ...m, done: doneIds.has(m.id) })), ...custom].sort(
    (a, b) => a.dueDate.localeCompare(b.dueDate),
  );
}

function mergeVendors(previous: Plan, fresh: Plan): Plan['vendors'] {
  return fresh.vendors.map((vendor) => {
    const old = previous.vendors.find((v) => v.id === vendor.id);
    return old
      ? { ...vendor, status: old.status, ...(old.contact ? { contact: old.contact } : {}) }
      : vendor;
  });
}

function mergeLedger(previous: Plan, fresh: Plan): Plan['ledger'] {
  const keepShares = sameLines(previous, fresh) && wasEdited(previous);
  const percents = fresh.ledger.map(
    (line) => previous.ledger.find((l) => l.id === line.id)?.percent ?? line.percent,
  );
  const amounts = amountsFromPercents(percents, toMinor(fresh.brief.budget));
  return fresh.ledger.map((line, index) => {
    const committed = previous.ledger.find((l) => l.id === line.id)?.committedMinor;
    return {
      ...line,
      ...(keepShares
        ? {
            percent: percents[index] ?? line.percent,
            amountMinor: amounts[index] ?? line.amountMinor,
          }
        : {}),
      ...(committed === undefined ? {} : { committedMinor: committed }),
    };
  });
}

/**
 * Re-applies what the user did to `previous` onto a freshly built plan after the brief changed:
 * ticked tasks, vendor statuses and contacts, custom tasks, committed amounts, saved ideas and
 * custom ledger shares (when the set of budget lines is unchanged).
 */
export function carryOverState(previous: Plan, fresh: Plan): Plan {
  return {
    ...fresh,
    id: previous.id,
    createdAt: previous.createdAt,
    timeline: mergeTimeline(previous, fresh),
    vendors: mergeVendors(previous, fresh),
    ledger: mergeLedger(previous, fresh),
    ideas: previous.ideas.filter((idea) => idea.saved),
    ideasSource: 'pending',
  };
}
