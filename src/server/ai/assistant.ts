import type { AssistantRequest, AssistantResponse } from '../../shared/schema/ai.js';
import { ModelOutput, rulesAnswer, trimAnswer, vetActions } from '../../shared/planner.js';
import type { Logger } from '../logger.js';

import type { AiClient } from './client.js';
import { ASSISTANT_SCHEMA, ASSISTANT_SYSTEM, buildAssistantPrompt } from './prompts.js';

export interface AssistantDeps {
  ai: AiClient;
  logger: Logger;
  timeoutMs: number;
}

const ASSISTANT_MAX_TOKENS = 700;

async function askModel(
  deps: AssistantDeps,
  request: AssistantRequest,
): Promise<AssistantResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, deps.timeoutMs);
  try {
    const json = await deps.ai.generateJson({
      system: ASSISTANT_SYSTEM,
      prompt: buildAssistantPrompt(request),
      schema: ASSISTANT_SCHEMA,
      maxOutputTokens: ASSISTANT_MAX_TOKENS,
      signal: controller.signal,
    });
    const parsed = ModelOutput.parse(json);
    return {
      answer: trimAnswer(parsed.answer),
      suggestedActions: vetActions(parsed.suggestedActions, request.plan),
      source: 'gemini',
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Answers a question about the plan. The model may only propose whitelisted, grounded actions;
 * anything invalid is dropped. Without AI, or on failure, a rule-based answer is returned.
 * @example await answer(deps, request)
 */
export async function answer(
  deps: AssistantDeps,
  request: AssistantRequest,
): Promise<AssistantResponse> {
  if (!deps.ai.enabled) {
    return rulesAnswer(request, true);
  }
  try {
    return await askModel(deps, request);
  } catch (error) {
    deps.logger.log('warn', 'ai_error', {
      route: 'assistant',
      reason: error instanceof Error ? error.name : 'unknown',
    });
    return rulesAnswer(request, false);
  }
}
