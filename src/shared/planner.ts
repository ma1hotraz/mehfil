import * as z from 'zod/mini';

import {
  type AssistantRequest,
  type AssistantResponse,
  type PlanDigest,
  SuggestedAction,
} from './schema/ai.js';
import { type CategoryId } from './schema/plan.js';
import { CATEGORY_LABELS } from './engine/data/allocations.js';
import { formatLongDate } from './engine/dates.js';
import { formatMoney } from './engine/money.js';
import { sanitizeText } from './text.js';

const MAX_ACTIONS = 3;
const MAX_ANSWER = 900;
/** Lines the Planner may create when they are absent from the ledger (docs/04 §10). */
const CREATABLE: readonly CategoryId[] = ['contingency', 'accessibility', 'weatherCover'];

/** Zod schema for the raw model JSON: answer is required, actions default to empty. */
export const ModelOutput = z.object({
  answer: z.string().check(z.minLength(1)),
  suggestedActions: z._default(z.array(z.unknown()), []),
});

/** Clamps every string in a raw model action before schema validation. */
function tidyAction(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) {
    return raw;
  }
  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      typeof value === 'string' ? sanitizeText(value, key === 'title' ? 80 : 200) : value,
    ]),
  );
}

/** True when every id the action mentions exists in the digest the model was shown. */
export function isGrounded(action: SuggestedAction, digest: PlanDigest): boolean {
  const known = new Set<string>(digest.ledger.map((line) => line.id));
  if (action.type === 'shiftBudget') {
    const canCreate = CREATABLE.includes(action.to);
    return (
      action.from !== action.to && known.has(action.from) && (known.has(action.to) || canCreate)
    );
  }
  if (action.type === 'addTask') {
    return action.category === 'general' || known.has(action.category);
  }
  return digest.vendors.some((vendor) => vendor.id === action.vendorId);
}

/** Validates actions one by one (dropping bad ones, not the answer) and keeps at most three. */
export function vetActions(raw: readonly unknown[], digest: PlanDigest): SuggestedAction[] {
  return raw
    .map((item) => SuggestedAction.safeParse(tidyAction(item)))
    .flatMap((result) => (result.success && isGrounded(result.data, digest) ? [result.data] : []))
    .slice(0, MAX_ACTIONS);
}

/** Clamps the answer to the configured maximum length. */
export const trimAnswer = (text: string): string => sanitizeText(text, MAX_ANSWER);

// ---------------------------------------------------------------- rule-based fallback

const OFFLINE_PREFIX = 'Offline planner mode — ';
const FAILURE_PREFIX = 'I couldn’t reach the AI just now, here’s what the plan suggests — ';
const DISCRETIONARY: readonly CategoryId[] = ['decor', 'entertainment', 'favors', 'attire'];

const INTENTS = {
  cut: /\b(cut|reduce|short|over budget|afford|save|cheaper)\b/,
  next: /\b(next|start|first|todo|to-do|what should)\b/,
  vendor: /\b(vendor|vendors|book|booking)\b/,
  weather: /\b(rain\w*|weather|monsoon|heat|cold)\b/,
  diet: /(allerg|diet|vegan|jain|halal|gluten)/,
} as const;

interface Reply {
  answer: string;
  actions: SuggestedAction[];
}

function mentionedCategory(question: string, digest: PlanDigest): CategoryId | undefined {
  return digest.ledger.find((line) =>
    CATEGORY_LABELS[line.id]
      .toLowerCase()
      .split(/[^a-zé]+/)
      .some((word) => word.length > 3 && question.includes(word)),
  )?.id;
}

function cutReply(request: AssistantRequest, question: string): Reply {
  const { plan, brief } = request;
  const options = plan.ledger
    .filter((line) => DISCRETIONARY.includes(line.id))
    .sort((a, b) => b.percent - a.percent);
  const biggest = options[0];
  if (!biggest) {
    return {
      answer:
        'None of the flexible lines (décor, entertainment, favours, attire) are in this budget. Look at the largest line in the Ledger first.',
      actions: [],
    };
  }
  const mentioned = mentionedCategory(question, plan);
  const to: CategoryId = mentioned && mentioned !== biggest.id ? mentioned : 'contingency';
  const percent = Math.min(3, biggest.percent);
  const amount = formatMoney(Math.round((percent * (brief.budget * 100)) / 100), brief.currency);
  const names = options
    .slice(0, 2)
    .map((o) => `${CATEGORY_LABELS[o.id]} (${o.percent}%)`)
    .join(' and ');
  return {
    answer: `The most flexible lines are ${names}. Moving ${percent}% (about ${amount}) from ${CATEGORY_LABELS[biggest.id]} to ${CATEGORY_LABELS[to]} is the gentlest change.`,
    actions: [
      {
        type: 'shiftBudget',
        from: biggest.id,
        to,
        percent,
        rationale: `${CATEGORY_LABELS[biggest.id]} is your largest flexible line.`,
      },
    ],
  };
}

function nextReply(plan: PlanDigest): Reply {
  const next = plan.openMilestones.slice(0, 3);
  const list = next
    .map((m) => `${m.title} (by ${formatLongDate(m.dueDate)}${m.critical ? ', critical' : ''})`)
    .join('; ');
  return {
    answer:
      next.length > 0
        ? `Your next tasks: ${list}.`
        : 'Every task in the Timetable is done. Check the Run Sheet for the day itself.',
    actions: [],
  };
}

function vendorReply(plan: PlanDigest): Reply {
  const open = plan.vendors
    .filter((v) => v.status === 'to-find')
    .sort((a, b) => a.bookByDate.localeCompare(b.bookByDate));
  const list = open
    .slice(0, 4)
    .map((v) => `${v.label} (book by ${formatLongDate(v.bookByDate)})`)
    .join('; ');
  return {
    answer:
      open.length > 0
        ? `Still to find: ${list}.`
        : 'Every vendor has been enquired about or booked. Confirm the payment schedules next.',
    actions: [],
  };
}

function weatherReply(request: AssistantRequest): Reply {
  const line = request.plan.ledger.find((l) => l.id === 'weatherCover');
  const money = line ? formatMoney(line.amountMinor, request.brief.currency) : undefined;
  const answer = line
    ? `Weather cover is ${line.percent}% of the budget (${money ?? ''}). Book a canopy or covered backup, and agree a go/no-go time on the morning of the event.`
    : `Your event is ${request.brief.setting}, so there is no weather line in the budget. Still keep a backup space in mind in case plans change.`;
  return { answer, actions: [] };
}

function dietReply(request: AssistantRequest): Reply {
  const diets = request.brief.dietary;
  const named =
    diets.length > 0 ? `You listed ${diets.join(', ')}.` : 'No dietary needs are listed yet.';
  return {
    answer: `${named} Share the full list with the caterer, ask how they prevent cross-contamination, and have every dish labelled. For allergies, confirm with the caterer and a medical professional.`,
    actions: [],
  };
}

function helpReply(): Reply {
  return {
    answer:
      'I can suggest where to trim the budget, list your next tasks and unbooked vendors, and explain weather cover or dietary checks. Try “What should I do next?” or “How can I cut décor?”.',
    actions: [],
  };
}

/** Deterministic answers for common intents; used when AI is off or has failed. */
export function rulesAnswer(request: AssistantRequest, aiDisabled: boolean): AssistantResponse {
  const question = request.question.toLowerCase();
  const reply = INTENTS.cut.test(question)
    ? cutReply(request, question)
    : INTENTS.next.test(question)
      ? nextReply(request.plan)
      : INTENTS.vendor.test(question)
        ? vendorReply(request.plan)
        : INTENTS.weather.test(question)
          ? weatherReply(request)
          : INTENTS.diet.test(question)
            ? dietReply(request)
            : helpReply();
  return {
    answer: trimAnswer(`${aiDisabled ? OFFLINE_PREFIX : FAILURE_PREFIX}${reply.answer}`),
    suggestedActions: vetActions(reply.actions, request.plan),
    source: 'rules',
  };
}
