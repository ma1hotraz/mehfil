import type {
  CategoryId,
  Idea,
  IdeaCategory,
  LedgerLine,
  IdeasSource,
  Plan,
  VendorContact,
  VendorStatus,
} from '../../shared/schema/plan.js';

export interface PlansState {
  plans: Plan[];
  openId: string | undefined;
}

/** Every change carries `now` so the reducer stays pure. */
export type PlansAction =
  | { type: 'loaded'; plans: Plan[]; openId: string | undefined }
  | { type: 'save'; plan: Plan }
  | { type: 'open'; id: string | undefined }
  | { type: 'remove'; id: string }
  | { type: 'setLedger'; ledger: LedgerLine[]; now: string }
  | { type: 'setCommitted'; id: CategoryId; minor: number | undefined; now: string }
  | { type: 'toggleTask'; id: string; now: string }
  | { type: 'setVendorStatus'; id: string; status: VendorStatus; now: string }
  | { type: 'setVendorContact'; id: string; contact: VendorContact; now: string }
  | {
      type: 'setIdeas';
      planId: string;
      ideas: Idea[];
      focus: 'all' | IdeaCategory;
      source: IdeasSource;
      now: string;
    }
  | { type: 'toggleIdeaSaved'; id: string; now: string };

export const initialPlansState: PlansState = { plans: [], openId: undefined };

export const openPlan = (state: PlansState): Plan | undefined =>
  state.plans.find((plan) => plan.id === state.openId);

/** Applies `change` to plan `id`, sharing structure for everything that did not change. */
function updatePlan(
  state: PlansState,
  id: string | undefined,
  now: string,
  change: (plan: Plan) => Plan,
): PlansState {
  const current = state.plans.find((plan) => plan.id === id);
  if (!current) {
    return state;
  }
  const next = { ...change(current), updatedAt: now };
  return { ...state, plans: state.plans.map((plan) => (plan === current ? next : plan)) };
}

/** Fresh ideas replace unsaved ones (of the focused category only, for a focused request). */
function mergeIdeas(plan: Plan, action: Extract<PlansAction, { type: 'setIdeas' }>): Plan {
  const kept = plan.ideas.filter(
    (idea) => idea.saved || (action.focus !== 'all' && idea.category !== action.focus),
  );
  const fresh = action.ideas.filter((idea) => !kept.some((k) => k.id === idea.id));
  return { ...plan, ideas: [...kept, ...fresh], ideasSource: action.source };
}

type OpenPlanAction = Exclude<
  PlansAction,
  { type: 'loaded' | 'save' | 'open' | 'remove' | 'setIdeas' }
>;

type VendorAction = Extract<PlansAction, { type: 'setVendorStatus' | 'setVendorContact' }>;
type IdeaAction = Extract<PlansAction, { type: 'toggleIdeaSaved' }>;

const changeVendor = (action: VendorAction) => (plan: Plan) => ({
  ...plan,
  vendors: plan.vendors.map((v) => {
    if (v.id !== action.id) {
      return v;
    }
    return action.type === 'setVendorStatus'
      ? { ...v, status: action.status }
      : { ...v, contact: action.contact };
  }),
});

const toggleIdea = (action: IdeaAction) => (plan: Plan) => ({
  ...plan,
  ideas: plan.ideas.map((idea) => (idea.id === action.id ? { ...idea, saved: !idea.saved } : idea)),
});

/** The change each plan-editing action makes to the open plan. */
function changeFor(action: OpenPlanAction): (plan: Plan) => Plan {
  switch (action.type) {
    case 'setLedger':
      return (plan) => ({ ...plan, ledger: action.ledger });
    case 'setCommitted':
      return (plan) => ({
        ...plan,
        ledger: plan.ledger.map((line) => {
          if (line.id !== action.id) {
            return line;
          }
          const { committedMinor: _previous, ...rest } = line;
          return action.minor === undefined ? rest : { ...rest, committedMinor: action.minor };
        }),
      });
    case 'toggleTask':
      return (plan) => ({
        ...plan,
        timeline: plan.timeline.map((m) => (m.id === action.id ? { ...m, done: !m.done } : m)),
      });
    case 'setVendorStatus':
    case 'setVendorContact':
      return changeVendor(action);
    case 'toggleIdeaSaved':
      return toggleIdea(action);
  }
}

function saveShelf(state: PlansState, plan: Plan): PlansState {
  const exists = state.plans.some((p) => p.id === plan.id);
  const plans = exists
    ? state.plans.map((p) => (p.id === plan.id ? plan : p))
    : [plan, ...state.plans];
  return { plans, openId: plan.id };
}

/** Pure state transitions for the plan shelf and the open plan. */
export function plansReducer(state: PlansState, action: PlansAction): PlansState {
  switch (action.type) {
    case 'loaded':
      return { plans: action.plans, openId: action.openId };
    case 'save':
      return saveShelf(state, action.plan);
    case 'open':
      return { ...state, openId: action.id };
    case 'remove':
      return {
        plans: state.plans.filter((plan) => plan.id !== action.id),
        openId: state.openId === action.id ? undefined : state.openId,
      };
    case 'setIdeas':
      return updatePlan(state, action.planId, action.now, (plan) => mergeIdeas(plan, action));
    default:
      return updatePlan(state, state.openId, action.now, changeFor(action));
  }
}
