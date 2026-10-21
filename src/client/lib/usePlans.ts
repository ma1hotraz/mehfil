import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import type { SuggestedAction } from '../../shared/schema/ai.js';
import type { EventBrief } from '../../shared/schema/brief.js';
import type {
  CategoryId,
  IdeaCategory,
  Plan,
  VendorContact,
  VendorStatus,
} from '../../shared/schema/plan.js';

import { type ApiOptions, fetchIdeas as defaultFetchIdeas } from './api';
import { localToday, nowIso } from './clock';
import { loadEngine } from './engine';
import { money, plural } from './format';
import { openPlan, plansReducer } from './planReducer';
import { type KeyValueStore, loadOpenId, loadPlans, saveOpenId, savePlans } from './storage';
import type { Announce } from './useAnnouncer';

export interface PlansDeps {
  store: KeyValueStore;
  announce: Announce;
  /** Injected for tests; the defaults use the real clock, crypto and network. */
  today?: () => string;
  now?: () => string;
  newId?: () => string;
  fetchIdeas?: typeof defaultFetchIdeas;
}

/** Debounce for writing to localStorage; also flushed when the page is hidden. */
const PERSIST_DELAY_MS = 500;
/** "Plan saved" is announced at most this often. */
const SAVE_ANNOUNCE_GAP_MS = 10_000;
/** Ideas asked for when one category is refreshed. */
const FOCUS_COUNT = 3;
const ALL_COUNT = 10;

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

function boot(store: KeyValueStore) {
  const { plans, discarded } = loadPlans(store);
  const stored = loadOpenId(store);
  return {
    state: { plans, openId: plans.some((p) => p.id === stored) ? stored : undefined },
    discarded,
  };
}

/**
 * Owns the shelf of plans: reducer state, debounced persistence, engine calls and the background
 * ideas request (server first, local library when the server is unreachable).
 */
export function usePlans(deps: PlansDeps): PlansApi {
  const [initial] = useState(() => boot(deps.store));
  const [state, dispatch] = useReducer(plansReducer, initial.state);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const latest = useRef({ state, deps });
  const abort = useRef<AbortController | undefined>(undefined);
  const lastSaveAnnounce = useRef(0);
  const plan = openPlan(state);

  useEffect(() => {
    latest.current = { state, deps };
  });

  const flush = useCallback(() => {
    const { state: current, deps: d } = latest.current;
    savePlans(d.store, current.plans);
    saveOpenId(d.store, current.openId);
  }, []);

  useEffect(() => {
    if (state === initial.state) {
      return undefined;
    }
    const timer = setTimeout(() => {
      flush();
      if (Date.now() - lastSaveAnnounce.current > SAVE_ANNOUNCE_GAP_MS) {
        lastSaveAnnounce.current = Date.now();
        latest.current.deps.announce('Plan saved on this device.');
      }
    }, PERSIST_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [state, initial.state, flush]);

  useEffect(() => {
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      abort.current?.abort();
    };
  }, [flush]);

  const clock = useCallback(() => {
    const d = latest.current.deps;
    return { today: (d.today ?? localToday)(), now: (d.now ?? nowIso)() };
  }, []);

  const loadIdeas = useCallback(
    (target: Plan, focus: 'all' | IdeaCategory) => {
      const d = latest.current.deps;
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      setIdeasLoading(true);
      const exclude = target.ideas.map((idea) => idea.title).slice(-20);
      const options: ApiOptions = { signal: controller.signal };
      const isStale = (): boolean => controller.signal.aborted;
      const request = { brief: target.brief, focus, exclude };
      void (async () => {
        const result = await (d.fetchIdeas ?? defaultFetchIdeas)(request, options);
        if (isStale()) {
          return;
        }
        const response = result.ok
          ? result.value
          : {
              ideas: (await loadEngine()).selectFallbackIdeas(
                target.brief,
                focus,
                focus === 'all' ? ALL_COUNT : FOCUS_COUNT,
                exclude,
                target.feasibility,
              ),
              source: 'library' as const,
            };
        if (isStale()) {
          return;
        }
        dispatch({
          type: 'setIdeas',
          planId: target.id,
          ideas: response.ideas,
          focus,
          source: response.source,
          now: clock().now,
        });
        setIdeasLoading(false);
        d.announce(
          `${plural(response.ideas.length, 'idea')} added, from ${response.source === 'gemini' ? 'Gemini' : 'the Mehfil library'}.`,
        );
      })();
    },
    [clock],
  );

  const create = useCallback(
    async (brief: EventBrief): Promise<Plan> => {
      const engine = await loadEngine();
      const { today, now } = clock();
      const id = (latest.current.deps.newId ?? (() => crypto.randomUUID()))();
      const built = engine.buildPlan(brief, today, { id, now });
      dispatch({ type: 'save', plan: built });
      latest.current.deps.announce(
        `Your almanac is ready. ${plural(built.insights.length, 'notice')}, ${plural(built.timeline.length, 'task')}, ${plural(built.vendors.length, 'vendor')}. Ideas are being drafted.`,
      );
      loadIdeas(built, 'all');
      return built;
    },
    [clock, loadIdeas],
  );

  const editBrief = useCallback(
    async (brief: EventBrief): Promise<Plan | undefined> => {
      if (!plan) {
        return undefined;
      }
      const engine = await loadEngine();
      const { today, now } = clock();
      const merged = engine.carryOverState(
        plan,
        engine.buildPlan(brief, today, { id: plan.id, now }),
      );
      dispatch({ type: 'save', plan: merged });
      latest.current.deps.announce('Your almanac is updated. Ideas are being redrafted.');
      loadIdeas(merged, 'all');
      return merged;
    },
    [plan, clock, loadIdeas],
  );

  const setPercent = useCallback(
    (id: CategoryId, percent: number) => {
      if (!plan) {
        return;
      }
      void loadEngine().then((engine) => {
        const ledger = engine.rebalance(
          plan.ledger,
          id,
          percent,
          engine.toMinor(plan.brief.budget),
        );
        dispatch({ type: 'setLedger', ledger, now: clock().now });
        const next = ledger.find((l) => l.id === id);
        if (next) {
          latest.current.deps.announce(
            `${next.label} now ${next.percent.toFixed(1)} percent, ${money(next.amountMinor, plan.brief.currency)}. Other categories adjusted. Total unchanged.`,
          );
        }
      });
    },
    [plan, clock],
  );

  const resetLedger = useCallback(() => {
    if (!plan) {
      return;
    }
    void loadEngine().then((engine) => {
      const ledger = engine.resetToRecommended(plan.ledger, engine.toMinor(plan.brief.budget));
      dispatch({ type: 'setLedger', ledger, now: clock().now });
      latest.current.deps.announce('Budget reset to the recommended split.');
    });
  }, [plan, clock]);

  const step = useCallback(
    (id: CategoryId, delta: number) => {
      const line = plan?.ledger.find((l) => l.id === id);
      if (line) {
        setPercent(id, Math.round((line.percent + delta) * 10) / 10);
      }
    },
    [plan, setPercent],
  );

  const toggleTask = useCallback(
    (id: string) => {
      const task = plan?.timeline.find((m) => m.id === id);
      if (!plan || !task) {
        return;
      }
      dispatch({ type: 'toggleTask', id, now: clock().now });
      const remaining = plan.timeline.filter((m) => !m.done).length + (task.done ? 1 : -1);
      latest.current.deps.announce(
        `${task.title} marked ${task.done ? 'not done' : 'done'}. ${plural(remaining, 'task')} remain${remaining === 1 ? 's' : ''}.`,
      );
    },
    [plan, clock],
  );

  const setVendorStatus = useCallback(
    (id: string, status: VendorStatus) => {
      const vendor = plan?.vendors.find((v) => v.id === id);
      if (vendor) {
        dispatch({ type: 'setVendorStatus', id, status, now: clock().now });
        latest.current.deps.announce(`${vendor.label} marked ${status.replace('-', ' ')}.`);
      }
    },
    [plan, clock],
  );

  const applyPlannerAction = useCallback(
    async (action: SuggestedAction): Promise<{ notice: string } | { error: string }> => {
      if (!plan) {
        return { error: 'Open a plan first.' };
      }
      const engine = await loadEngine();
      const { today, now } = clock();
      const result = engine.applyAction(plan, action, today);
      if ('error' in result) {
        return result;
      }
      dispatch({ type: 'save', plan: { ...result.plan, updatedAt: now } });
      return { notice: result.notice };
    },
    [plan, clock],
  );

  return useMemo(
    () => ({
      plan,
      plans: state.plans,
      discarded: initial.discarded,
      ideasLoading,
      create,
      editBrief,
      open: (id) => {
        dispatch({ type: 'open', id });
      },
      close: () => {
        dispatch({ type: 'open', id: undefined });
      },
      remove: (id) => {
        dispatch({ type: 'remove', id });
      },
      step,
      setPercent,
      resetLedger,
      setCommitted: (id, minor) => {
        dispatch({ type: 'setCommitted', id, minor, now: clock().now });
      },
      toggleTask,
      setVendorStatus,
      setVendorContact: (id, contact) => {
        dispatch({ type: 'setVendorContact', id, contact, now: clock().now });
      },
      toggleIdeaSaved: (id) => {
        dispatch({ type: 'toggleIdeaSaved', id, now: clock().now });
      },
      requestIdeas: (focus) => {
        if (plan) {
          loadIdeas(plan, focus);
        }
      },
      applyPlannerAction,
    }),
    [
      plan,
      state.plans,
      initial.discarded,
      ideasLoading,
      create,
      editBrief,
      step,
      setPercent,
      resetLedger,
      toggleTask,
      setVendorStatus,
      loadIdeas,
      applyPlannerAction,
      clock,
    ],
  );
}
