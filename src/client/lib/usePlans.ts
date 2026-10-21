import { type Dispatch, useReducer, useState } from 'react';

import type { SuggestedAction } from '../../shared/schema/ai.js';
import type { EventBrief } from '../../shared/schema/brief.js';
import type {
  CategoryId,
  IdeaCategory,
  Plan,
  VendorContact,
  VendorStatus,
} from '../../shared/schema/plan.js';

import { type PlansAction, openPlan, plansReducer, type PlansState } from './planReducer';
import {
  type Latest,
  type PlansDeps,
  readClock,
  useIdeas,
  useLatest,
  usePersistence,
} from './plansInfra';
import { type KeyValueStore, loadOpenId, loadPlans } from './storage';
import { useLedgerActions, usePlanLifecycle, useProgressActions } from './usePlanActions';

export type { PlansDeps } from './plansInfra';

export interface PlansApi {
  plan: Plan | undefined;
  plans: Plan[];
  /** Saved entries thrown away at start-up because they were invalid. */
  discarded: number;
  ideasLoading: boolean;
  create: (brief: EventBrief) => Promise<Plan>;
  editBrief: (brief: EventBrief) => Promise<Plan | undefined>;
  open: (id: string) => void;
  close: () => void;
  remove: (id: string) => void;
  step: (id: CategoryId, delta: number) => void;
  setPercent: (id: CategoryId, percent: number) => void;
  resetLedger: () => void;
  setCommitted: (id: CategoryId, minor: number | undefined) => void;
  toggleTask: (id: string) => void;
  setVendorStatus: (id: string, status: VendorStatus) => void;
  setVendorContact: (id: string, contact: VendorContact) => void;
  toggleIdeaSaved: (id: string) => void;
  requestIdeas: (focus: 'all' | IdeaCategory) => void;
  applyPlannerAction: (action: SuggestedAction) => Promise<{ notice: string } | { error: string }>;
}

function boot(store: KeyValueStore): { state: PlansState; discarded: number } {
  const { plans, discarded } = loadPlans(store);
  const stored = loadOpenId(store);
  return {
    state: { plans, openId: plans.some((p) => p.id === stored) ? stored : undefined },
    discarded,
  };
}

/** Simple, engine-free operations on the shelf and the open plan. */
function shelfOps(
  context: { plan: Plan | undefined; dispatch: Dispatch<PlansAction>; latest: Latest },
  loadIdeas: (plan: Plan, focus: 'all' | IdeaCategory) => void,
) {
  const { plan, dispatch, latest } = context;
  const stamp = (): string => readClock(latest).now;
  return {
    open: (id: string) => {
      dispatch({ type: 'open', id });
    },
    close: () => {
      dispatch({ type: 'open', id: undefined });
    },
    remove: (id: string) => {
      dispatch({ type: 'remove', id });
    },
    setCommitted: (id: CategoryId, minor: number | undefined) => {
      dispatch({ type: 'setCommitted', id, minor, now: stamp() });
    },
    setVendorContact: (id: string, contact: VendorContact) => {
      dispatch({ type: 'setVendorContact', id, contact, now: stamp() });
    },
    toggleIdeaSaved: (id: string) => {
      dispatch({ type: 'toggleIdeaSaved', id, now: stamp() });
    },
    requestIdeas: (focus: 'all' | IdeaCategory) => {
      if (plan) {
        loadIdeas(plan, focus);
      }
    },
  };
}

/**
 * Owns the shelf of plans: reducer state, debounced persistence, engine calls (loaded lazily)
 * and the background ideas request. Components receive plain callbacks.
 */
export function usePlans(deps: PlansDeps): PlansApi {
  const [initial] = useState(() => boot(deps.store));
  const [state, dispatch] = useReducer(plansReducer, initial.state);
  const latest = useLatest(state, deps);
  const plan = openPlan(state);
  const context = { plan, dispatch, latest };

  usePersistence(state, initial.state, latest);
  const { ideasLoading, loadIdeas } = useIdeas(dispatch, latest);
  const lifecycle = usePlanLifecycle(context, loadIdeas);
  const ledger = useLedgerActions(context);
  const progress = useProgressActions(context);

  return {
    plan,
    plans: state.plans,
    discarded: initial.discarded,
    ideasLoading,
    ...lifecycle,
    ...ledger,
    ...progress,
    ...shelfOps(context, loadIdeas),
  };
}
