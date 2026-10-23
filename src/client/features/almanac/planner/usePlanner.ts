import { useCallback, useState } from 'react';

import { buildDigest } from '../../../../shared/engine/digest.js';
import { rulesAnswer } from '../../../../shared/planner.js';
import type {
  AssistantRequest,
  AssistantResponse,
  SuggestedAction,
} from '../../../../shared/schema/ai.js';
import type { Plan } from '../../../../shared/schema/plan.js';
import { type ApiOptions, askPlanner as defaultAsk } from '../../../lib/api';
import type { Announce } from '../../../lib/useAnnouncer';
import type { PlansApi } from '../../../lib/usePlans';

export interface ActionState {
  action: SuggestedAction;
  status: 'open' | 'applied' | 'dismissed' | 'failed';
  message?: string;
}

export interface Exchange {
  id: number;
  question: string;
  pending: boolean;
  answer?: string;
  source?: 'gemini' | 'rules';
  actions: ActionState[];
}

export interface Planner {
  exchanges: Exchange[];
  busy: boolean;
  ask: (question: string) => void;
  apply: (exchangeId: number, index: number) => void;
  dismiss: (exchangeId: number, index: number) => void;
}

/** Turns of conversation sent as context, each clipped to the API limit. */
const HISTORY_TURNS = 10;
const TURN_CHARS = 600;

interface Deps {
  plan: Plan;
  today: string;
  api: Pick<PlansApi, 'applyPlannerAction'>;
  announce: Announce;
  onNotice: (notice: string) => void;
  ask?: (request: AssistantRequest, options?: ApiOptions) => ReturnType<typeof defaultAsk>;
}

function historyOf(exchanges: readonly Exchange[]): AssistantRequest['history'] {
  return exchanges
    .filter((e) => e.answer !== undefined)
    .flatMap((e) => [
      { role: 'user' as const, text: e.question.slice(0, TURN_CHARS) },
      { role: 'planner' as const, text: (e.answer ?? '').slice(0, TURN_CHARS) },
    ])
    .slice(-HISTORY_TURNS);
}

const requestFor = (
  plan: Plan,
  today: string,
  exchanges: readonly Exchange[],
  question: string,
): AssistantRequest => ({
  brief: plan.brief,
  plan: buildDigest(plan, today),
  history: historyOf(exchanges),
  question,
});

/** The reply to show: the server's, or the same rules run locally when it cannot be reached. */
function replyFor(request: AssistantRequest, result: Awaited<ReturnType<typeof defaultAsk>>) {
  return result.ok ? result.value : rulesAnswer(request, result.error.kind === 'network');
}

const settle =
  (reply: AssistantResponse) =>
  (e: Exchange): Exchange => ({
    ...e,
    pending: false,
    answer: reply.answer,
    source: reply.source,
    actions: reply.suggestedActions.map((action) => ({ action, status: 'open' })),
  });

/** The list of exchanges with small, stable updaters for one exchange or one action. */
function useExchanges() {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const patch = useCallback((id: number, change: (e: Exchange) => Exchange) => {
    setExchanges((current) => current.map((e) => (e.id === id ? change(e) : e)));
  }, []);
  const setAction = useCallback(
    (id: number, index: number, next: Partial<ActionState>) => {
      patch(id, (e) => ({
        ...e,
        actions: e.actions.map((a, i) => (i === index ? { ...a, ...next } : a)),
      }));
    },
    [patch],
  );
  return { exchanges, setExchanges, patch, setAction };
}

/** Applies one suggestion through the plan API and records the outcome on its slip. */
async function applySuggestion(
  state: ActionState,
  api: Pick<PlansApi, 'applyPlannerAction'>,
  record: (next: Partial<ActionState>) => void,
  onNotice: (notice: string) => void,
): Promise<void> {
  const result = await api.applyPlannerAction(state.action);
  if ('notice' in result) {
    record({ status: 'applied', message: result.notice });
    onNotice(result.notice);
  } else {
    record({ status: 'failed', message: result.error });
  }
}

/**
 * The conversation with the Planner, kept in memory for the session. Answers come from the
 * server; if it cannot be reached the same rule-based answers run locally, so asking never fails.
 */
export function usePlanner(deps: Deps): Planner {
  const { plan, today, api, announce, onNotice, ask = defaultAsk } = deps;
  const { exchanges, setExchanges, patch, setAction } = useExchanges();

  const askQuestion = useCallback(
    (question: string) => {
      const id = exchanges.length + 1;
      const request = requestFor(plan, today, exchanges, question);
      setExchanges((current) => [...current, { id, question, pending: true, actions: [] }]);
      void ask(request).then((result) => {
        patch(id, settle(replyFor(request, result)));
        announce('The Planner replied.');
      });
    },
    [exchanges, plan, today, ask, patch, setExchanges, announce],
  );

  const apply = useCallback(
    (id: number, index: number) => {
      const state = exchanges.find((e) => e.id === id)?.actions[index];
      if (!state) {
        return;
      }
      void applySuggestion(
        state,
        api,
        (next) => {
          setAction(id, index, next);
        },
        onNotice,
      );
    },
    [exchanges, api, setAction, onNotice],
  );

  const dismiss = useCallback(
    (id: number, index: number) => {
      setAction(id, index, { status: 'dismissed' });
    },
    [setAction],
  );

  return { exchanges, busy: exchanges.some((e) => e.pending), ask: askQuestion, apply, dismiss };
}
