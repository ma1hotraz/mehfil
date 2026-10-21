import * as z from 'zod/mini';

import { type Result, err, ok } from '../../shared/result.js';
import {
  type AssistantRequest,
  AssistantResponse,
  type IdeasRequest,
  IdeasResponse,
} from '../../shared/schema/ai.js';

export type ApiErrorKind = 'network' | 'timeout' | 'rate_limited' | 'invalid' | 'server';
export interface ApiError {
  kind: ApiErrorKind;
}

export interface ApiOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  timeoutMs?: number;
}

/** Client-side ceiling for a model call; the server enforces its own shorter timeout. */
export const CLIENT_TIMEOUT_MS = 25_000;

function statusKind(status: number): ApiErrorKind {
  if (status === 429) {
    return 'rate_limited';
  }
  return status === 400 || status === 413 || status === 415 ? 'invalid' : 'server';
}

async function postJson<S extends z.ZodMiniType>(
  path: string,
  body: unknown,
  schema: S,
  options: ApiOptions,
): Promise<Result<z.infer<S>, ApiError>> {
  const controller = new AbortController();
  const outcome = { timedOut: false };
  const timer = setTimeout(() => {
    outcome.timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? CLIENT_TIMEOUT_MS);
  const relay = (): void => {
    controller.abort();
  };
  options.signal?.addEventListener('abort', relay);
  try {
    const response = await (options.fetchImpl ?? fetch)(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      return err({ kind: statusKind(response.status) });
    }
    const parsed = schema.safeParse(await response.json());
    return parsed.success ? ok(parsed.data) : err({ kind: 'server' });
  } catch {
    return err({ kind: outcome.timedOut ? 'timeout' : 'network' });
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', relay);
  }
}

/** Asks the server for ideas. Never throws: callers fall back to the local library on error. */
export const fetchIdeas = (request: IdeasRequest, options: ApiOptions = {}) =>
  postJson('/api/ideas', request, IdeasResponse, options);

/** Asks the Planner a question. Never throws. */
export const askPlanner = (request: AssistantRequest, options: ApiOptions = {}) =>
  postJson('/api/assistant', request, AssistantResponse, options);
