import { CATEGORY_LABELS } from '../../../../shared/engine/data/allocations.js';
import type { SuggestedAction } from '../../../../shared/schema/ai.js';
import type { Plan } from '../../../../shared/schema/plan.js';
import { STATUS_LABELS, money, plural } from '../../../lib/format';

/**
 * A suggested action in plain words, with money worked out from the plan's own numbers.
 * @example describeAction(shift, plan) // 'Move 3% from Décor & flowers to Contingency (₹54,000)'
 */
export function describeAction(action: SuggestedAction, plan: Plan): string {
  switch (action.type) {
    case 'shiftBudget': {
      const minor = Math.round((action.percent * plan.brief.budget * 100) / 100);
      return `Move ${action.percent}% from ${CATEGORY_LABELS[action.from]} to ${CATEGORY_LABELS[action.to]} (${money(minor, plan.brief.currency)})`;
    }
    case 'addTask':
      return `Add the task “${action.title}”, ${plural(action.daysBeforeEvent, 'day')} before the event`;
    case 'markVendor': {
      const vendor = plan.vendors.find((v) => v.id === action.vendorId);
      return `Mark ${vendor?.label ?? 'the vendor'} as ${STATUS_LABELS[action.status].toLowerCase()}`;
    }
  }
}
