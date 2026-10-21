import { type Dispatch, useCallback } from 'react';

import type { SuggestedAction } from '../../shared/schema/ai.js';
import type { EventBrief } from '../../shared/schema/brief.js';
import type { CategoryId, IdeaCategory, Plan, VendorStatus } from '../../shared/schema/plan.js';

import { type Engine, loadEngine } from './engine';
import { money, plural } from './format';
import type { PlansAction } from './planReducer';
import { type Latest, readClock } from './plansInfra';

interface Context {
  plan: Plan | undefined;
  dispatch: Dispatch<PlansAction>;
  latest: Latest;
}

type Loader = (target: Plan, focus: 'all' | IdeaCategory) => void;

/** Creating a plan, and editing its brief while keeping the user's progress. */
export function usePlanLifecycle({ plan, dispatch, latest }: Context, loadIdeas: Loader) {
  const create = useCallback(
    async (brief: EventBrief): Promise<Plan> => {
      const engine = await loadEngine();
      const { today, now } = readClock(latest);
      const id = (latest.current.deps.newId ?? (() => crypto.randomUUID()))();
      const built = engine.buildPlan(brief, today, { id, now });
      dispatch({ type: 'save', plan: built });
      latest.current.deps.announce(
        `Your almanac is ready. ${plural(built.insights.length, 'notice')}, ${plural(built.timeline.length, 'task')}, ${plural(built.vendors.length, 'vendor')}. Ideas are being drafted.`,
      );
      loadIdeas(built, 'all');
      return built;
    },
    [dispatch, latest, loadIdeas],
  );

  const editBrief = useCallback(
    async (brief: EventBrief): Promise<Plan | undefined> => {
      if (!plan) {
        return undefined;
      }
      const engine = await loadEngine();
      const { today, now } = readClock(latest);
      const merged = engine.carryOverState(
        plan,
        engine.buildPlan(brief, today, { id: plan.id, now }),
      );
      dispatch({ type: 'save', plan: merged });
      latest.current.deps.announce('Your almanac is updated. Ideas are being redrafted.');
      loadIdeas(merged, 'all');
      return merged;
    },
    [plan, dispatch, latest, loadIdeas],
  );

  return { create, editBrief };
}

/** Runs `build` against the loaded engine and stores the resulting ledger, announcing `message`. */
function commitLedger(
  { dispatch, latest }: Pick<Context, 'dispatch' | 'latest'>,
  build: (engine: Engine) => Plan['ledger'],
  message: (ledger: Plan['ledger']) => string | undefined,
): void {
  void loadEngine().then((engine) => {
    const ledger = build(engine);
    dispatch({ type: 'setLedger', ledger, now: readClock(latest).now });
    const text = message(ledger);
    if (text) {
      latest.current.deps.announce(text);
    }
  });
}

/** The announcement for a changed share: the line's new percent and amount. */
function shareMessage(plan: Plan, id: CategoryId, ledger: Plan['ledger']): string | undefined {
  const next = ledger.find((l) => l.id === id);
  return next
    ? `${next.label} now ${next.percent.toFixed(1)} percent, ${money(next.amountMinor, plan.brief.currency)}. Other categories adjusted. Total unchanged.`
    : undefined;
}

/** Budget edits: set a share, step it, or reset the whole ledger. */
export function useLedgerActions({ plan, dispatch, latest }: Context) {
  const setPercent = useCallback(
    (id: CategoryId, percent: number) => {
      if (plan) {
        commitLedger(
          { dispatch, latest },
          (engine) => engine.rebalance(plan.ledger, id, percent, engine.toMinor(plan.brief.budget)),
          (ledger) => shareMessage(plan, id, ledger),
        );
      }
    },
    [plan, dispatch, latest],
  );

  const step = useCallback(
    (id: CategoryId, delta: number) => {
      const line = plan?.ledger.find((l) => l.id === id);
      if (line) {
        setPercent(id, Math.round((line.percent + delta) * 10) / 10);
      }
    },
    [plan, setPercent],
  );

  const resetLedger = useCallback(() => {
    if (plan) {
      commitLedger(
        { dispatch, latest },
        (engine) => engine.resetToRecommended(plan.ledger, engine.toMinor(plan.brief.budget)),
        () => 'Budget reset to the recommended split.',
      );
    }
  }, [plan, dispatch, latest]);

  return { setPercent, step, resetLedger };
}

/** Applies a Planner suggestion through the engine; never throws. */
function useApplyAction({ plan, dispatch, latest }: Context) {
  return useCallback(
    async (action: SuggestedAction): Promise<{ notice: string } | { error: string }> => {
      if (!plan) {
        return { error: 'Open a plan first.' };
      }
      const engine = await loadEngine();
      const { today, now } = readClock(latest);
      const result = engine.applyAction(plan, action, today);
      if ('error' in result) {
        return result;
      }
      dispatch({ type: 'save', plan: { ...result.plan, updatedAt: now } });
      return { notice: result.notice };
    },
    [plan, dispatch, latest],
  );
}

/** Task and vendor edits, and applying a Planner suggestion. */
export function useProgressActions(context: Context) {
  const { plan, dispatch, latest } = context;
  const applyPlannerAction = useApplyAction(context);

  const toggleTask = useCallback(
    (id: string) => {
      const task = plan?.timeline.find((m) => m.id === id);
      if (!plan || !task) {
        return;
      }
      dispatch({ type: 'toggleTask', id, now: readClock(latest).now });
      const remaining = plan.timeline.filter((m) => !m.done).length + (task.done ? 1 : -1);
      latest.current.deps.announce(
        `${task.title} marked ${task.done ? 'not done' : 'done'}. ${plural(remaining, 'task')} remain${remaining === 1 ? 's' : ''}.`,
      );
    },
    [plan, dispatch, latest],
  );

  const setVendorStatus = useCallback(
    (id: string, status: VendorStatus) => {
      const vendor = plan?.vendors.find((v) => v.id === id);
      if (vendor) {
        dispatch({ type: 'setVendorStatus', id, status, now: readClock(latest).now });
        latest.current.deps.announce(`${vendor.label} marked ${status.replace('-', ' ')}.`);
      }
    },
    [plan, dispatch, latest],
  );

  return { toggleTask, setVendorStatus, applyPlannerAction };
}
