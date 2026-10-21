import { useCallback, useState } from 'react';

import { buildDigest } from '../../../../shared/engine/digest.js';
import { rulesAnswer } from '../../../../shared/planner.js';
import type { AssistantRequest, SuggestedAction } from '../../../../shared/schema/ai.js';
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

/**
 * The conversation with the Planner, kept in memory for the session. Answers come from the
 * server; if it cannot be reached the same rule-based answers run locally, so asking never fails.
 */
export function usePlanner({
  plan,
  today,
  api,
  announce,
  onNotice,
  ask = defaultAsk,
}: Deps): Planner {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const busy = exchanges.some((e) => e.pending);

  const patch = useCallback((id: number, change: (e: Exchange) => Exchange) => {
    setExchanges((current) => current.map((e) => (e.id === id ? change(e) : e)));
  }, []);

  const askQuestion = useCallback(
    (question: string) => {
      const id = exchanges.length + 1;
      const request: AssistantRequest = {
        brief: plan.brief,
        plan: buildDigest(plan, today),
        history: historyOf(exchanges),
        question,
      };
      setExchanges((current) => [...current, { id, question, pending: true, actions: [] }]);
      void ask(request).then((result) => {
        const reply = result.ok
          ? result.value
          : rulesAnswer(request, result.error.kind === 'network');
        patch(id, (e) => ({
          ...e,
          pending: false,
          answer: reply.answer,
          source: reply.source,
          actions: reply.suggestedActions.map((action) => ({ action, status: 'open' })),
        }));
        announce('The Planner replied.');
      });
    },
    [exchanges, plan, today, ask, patch, announce],
  );

  const setAction = useCallback(
    (exchangeId: number, index: number, next: Partial<ActionState>) => {
      patch(exchangeId, (e) => ({
        ...e,
        actions: e.actions.map((a, i) => (i === index ? { ...a, ...next } : a)),
      }));
    },
    [patch],
  );

  const apply = useCallback(
    (exchangeId: number, index: number) => {
      const state = exchanges.find((e) => e.id === exchangeId)?.actions[index];
      if (!state) {
        return;
      }
      void api.applyPlannerAction(state.action).then((result) => {
        if ('notice' in result) {
          setAction(exchangeId, index, { status: 'applied', message: result.notice });
          onNotice(result.notice);
        } else {
          setAction(exchangeId, index, { status: 'failed', message: result.error });
        }
      });
    },
    [exchanges, api, setAction, onNotice],
  );

  const dismiss = useCallback(
    (exchangeId: number, index: number) => {
      setAction(exchangeId, index, { status: 'dismissed' });
    },
    [setAction],
  );

  return { exchanges, busy, ask: askQuestion, apply, dismiss };
}
