import type { EventBrief } from '../schema/brief.js';
import type { Insight, VendorItem } from '../schema/plan.js';

import {
  ACCESS_QUESTIONS,
  DIETARY_QUESTIONS,
  VENDOR_CATALOG,
  type VendorRole,
  type VendorTemplate,
} from './data/vendors.js';
import { scheduleOffset, dueDateFor } from './timeline.js';

/** Seating questions fall back to the venue when no vendor handles seating. */
const targetRole = (role: VendorRole, hasRole: (role: VendorRole) => boolean): VendorRole =>
  role === 'seating' && !hasRole('seating') ? 'venue' : role;

/** Questions added by the brief's dietary and access needs, for one vendor. */
function extraQuestions(
  brief: EventBrief,
  template: VendorTemplate,
  hasRole: (role: VendorRole) => boolean,
): string[] {
  const roles = template.roles ?? [];
  const fromAccess = ACCESS_QUESTIONS.filter(
    (entry) =>
      brief.accessibility.includes(entry.need) && roles.includes(targetRole(entry.role, hasRole)),
  ).map((entry) => entry.question);
  const fromDiet = roles.includes('food')
    ? brief.dietary.map((diet) => DIETARY_QUESTIONS[diet])
    : [];
  return [...new Set([...fromAccess, ...fromDiet])];
}

/** Whether `role` is covered by a vendor that applies to the brief. */
function roleExists(templates: readonly VendorTemplate[], role: VendorRole): boolean {
  return templates.some((template) => template.roles?.includes(role));
}

/**
 * Builds the vendor checklist. Every vendor carries the rule that added it, a book-by date that
 * uses the same compression as the timeline, and context-specific questions.
 */
export function buildVendors(
  brief: EventBrief,
  leadDays: number,
  maxOffset: number,
): { vendors: VendorItem[]; insights: Insight[] } {
  const templates = VENDOR_CATALOG.filter(
    (template) => template.appliesTo.includes(brief.eventType) && (template.when?.(brief) ?? true),
  );
  const hasRole = (role: VendorRole): boolean => roleExists(templates, role);
  const vendors = templates.map((template): VendorItem => {
    const { effective } = scheduleOffset(template.bookByOffset, leadDays, maxOffset);
    return {
      id: template.id,
      label: template.label,
      reason: template.reason(brief),
      bookByDate: dueDateFor(brief.date, effective),
      questions: [...template.questions(brief), ...extraQuestions(brief, template, hasRole)],
      status: 'to-find',
    };
  });
  const insights: Insight[] = brief.dietary.includes('nut-allergy')
    ? [
        {
          id: 'r30',
          ruleId: 'R30',
          severity: 'warning',
          title: 'Nut allergy: confirm the kitchen',
          detail:
            'A nut allergy can be serious. Ask the caterer and baker for a nut-free kitchen, labelled dishes and a written confirmation.',
        },
      ]
    : [];
  return { vendors, insights };
}
