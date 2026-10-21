import { type Dispatch, type RefObject, useCallback, useEffect, useRef, useState } from 'react';

import type { IdeaCategory, Plan } from '../../shared/schema/plan.js';

import { type ApiOptions, fetchIdeas as defaultFetchIdeas } from './api';
import { localToday, nowIso } from './clock';
import { loadEngine } from './engine';
import { plural } from './format';
import type { PlansAction, PlansState } from './planReducer';
import { type KeyValueStore, saveOpenId, savePlans } from './storage';
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

/** The newest state and dependencies, readable from timers and event handlers. */
export type Latest = RefObject<{ state: PlansState; deps: PlansDeps }>;

/** Debounce for writing to localStorage; also flushed when the page is hidden. */
const PERSIST_DELAY_MS = 500;
/** "Plan saved" is announced at most this often. */
const SAVE_ANNOUNCE_GAP_MS = 10_000;
/** Ideas asked for when one category is refreshed, and for a full set. */
const FOCUS_COUNT = 3;
const ALL_COUNT = 10;

/** Keeps `latest` pointing at the newest render's state and dependencies. */
export function useLatest(state: PlansState, deps: PlansDeps): Latest {
  const latest = useRef({ state, deps });
  useEffect(() => {
    latest.current = { state, deps };
  });
  return latest;
}

export function readClock(latest: Latest): { today: string; now: string } {
  const { deps } = latest.current;
  return { today: (deps.today ?? localToday)(), now: (deps.now ?? nowIso)() };
}

/** Writes plans after a short pause, and immediately when the page is hidden or closed. */
export function usePersistence(state: PlansState, initial: PlansState, latest: Latest): void {
  const lastAnnounce = useRef(0);
  const flush = useCallback(() => {
    const { state: current, deps } = latest.current;
    savePlans(deps.store, current.plans);
    saveOpenId(deps.store, current.openId);
  }, [latest]);

  useEffect(() => {
    if (state === initial) {
      return undefined;
    }
    const timer = setTimeout(() => {
      flush();
      if (Date.now() - lastAnnounce.current > SAVE_ANNOUNCE_GAP_MS) {
        lastAnnounce.current = Date.now();
        latest.current.deps.announce('Plan saved on this device.');
      }
    }, PERSIST_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [state, initial, flush, latest]);

  useEffect(() => {
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
    };
  }, [flush]);
}

/** Ideas from the server, or from the local library when the server cannot be reached. */
async function ideasFor(
  target: Plan,
  focus: 'all' | IdeaCategory,
  exclude: string[],
  deps: PlansDeps,
  signal: AbortSignal,
) {
  const options: ApiOptions = { signal };
  const request = { brief: target.brief, focus, exclude };
  const result = await (deps.fetchIdeas ?? defaultFetchIdeas)(request, options);
  if (result.ok) {
    return result.value;
  }
  const engine = await loadEngine();
  const count = focus === 'all' ? ALL_COUNT : FOCUS_COUNT;
  return {
    ideas: engine.selectFallbackIdeas(target.brief, focus, count, exclude, target.feasibility),
    source: 'library' as const,
  };
}

/** Requests ideas in the background; a newer request cancels the one before it. */
export function useIdeas(dispatch: Dispatch<PlansAction>, latest: Latest) {
  const abort = useRef<AbortController | undefined>(undefined);
  const [ideasLoading, setIdeasLoading] = useState(false);

  useEffect(
    () => () => {
      abort.current?.abort();
    },
    [],
  );

  const loadIdeas = useCallback(
    (target: Plan, focus: 'all' | IdeaCategory) => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      setIdeasLoading(true);
      const exclude = target.ideas.map((idea) => idea.title).slice(-20);
      const deps = latest.current.deps;
      void ideasFor(target, focus, exclude, deps, controller.signal).then((response) => {
        if (controller.signal.aborted) {
          return;
        }
        const now = readClock(latest).now;
        dispatch({
          type: 'setIdeas',
          planId: target.id,
          ideas: response.ideas,
          focus,
          source: response.source,
          now,
        });
        setIdeasLoading(false);
        deps.announce(
          `${plural(response.ideas.length, 'idea')} added, from ${response.source === 'gemini' ? 'Gemini' : 'the Mehfil library'}.`,
        );
      });
    },
    [dispatch, latest],
  );

  return { ideasLoading, loadIdeas };
}
