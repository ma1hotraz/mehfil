import { createHash } from 'node:crypto';

import { conflictsWithBrief, containsContactDetails } from '../../shared/conflicts.js';
import { feasibility } from '../../shared/engine/feasibility.js';
import { ideaId, selectFallbackIdeas } from '../../shared/engine/ideas.js';
import {
  type IdeasRequest,
  type IdeasResponse,
  IdeasModelOutput,
  type RawIdea,
} from '../../shared/schema/ai.js';
import type { Idea } from '../../shared/schema/plan.js';
import { sanitizeText } from '../../shared/text.js';
import type { Logger } from '../logger.js';

import type { AiClient } from './client.js';
import type { TtlCache } from './cache.js';
import { IDEAS_SCHEMA, IDEAS_SYSTEM, buildIdeasPrompt } from './prompts.js';

export interface IdeasDeps {
  ai: AiClient;
  cache: TtlCache<IdeasResponse>;
  inflight: Map<string, Promise<IdeasResponse>>;
  logger: Logger;
  timeoutMs: number;
}

const IDEAS_MAX_TOKENS = 2048;
/** Fewest ideas to return (topping up from the library) and fewest model ideas to call it "gemini". */
const ALL_LIMITS = { minimum: 6, minimumFromModel: 4 } as const;
const FOCUS_LIMITS = { minimum: 1, minimumFromModel: 1 } as const;

/** Cache key: hash of the sanitised prompt (which contains every model-visible input). */
export const ideasCacheKey = (request: IdeasRequest): string =>
  createHash('sha256')
    .update(`${request.focus}\n${buildIdeasPrompt(request)}`)
    .digest('hex');

function cleanIdea(raw: RawIdea, request: IdeasRequest): Idea | undefined {
  const title = sanitizeText(raw.title, 60);
  const description = sanitizeText(raw.description, 240);
  const fitsBecause = sanitizeText(raw.fitsBecause, 140);
  const text = `${title} ${description} ${fitsBecause}`;
  const isUsable =
    title !== '' &&
    description !== '' &&
    fitsBecause !== '' &&
    !containsContactDetails(text) &&
    !conflictsWithBrief(text, request.brief);
  const costBand = Math.min(3, Math.max(1, Math.round(raw.costBand))) as 1 | 2 | 3;
  return isUsable
    ? {
        id: ideaId(title),
        category: raw.category,
        title,
        description,
        costBand,
        fitsBecause,
        saved: false,
      }
    : undefined;
}

/** Applies the post-processing pipeline of docs/05 §4 to model output. */
export function cleanModelIdeas(raw: readonly RawIdea[], request: IdeasRequest): Idea[] {
  const seen = new Set(request.exclude.map((title) => title.toLowerCase()));
  const kept: Idea[] = [];
  for (const item of raw) {
    const idea = cleanIdea(item, request);
    const key = idea?.title.toLowerCase();
    const isSecondTheme =
      request.focus === 'all' &&
      idea?.category === 'theme' &&
      kept.some((k) => k.category === 'theme');
    if (idea && key && !seen.has(key) && !isSecondTheme) {
      seen.add(key);
      kept.push(idea);
    }
  }
  return kept;
}

export function libraryIdeas(
  request: IdeasRequest,
  count: number,
  skip: readonly string[] = [],
): Idea[] {
  return selectFallbackIdeas(
    request.brief,
    request.focus,
    count,
    [...request.exclude, ...skip],
    feasibility(request.brief),
  );
}

function assemble(request: IdeasRequest, fromModel: Idea[]): IdeasResponse {
  const { minimum, minimumFromModel } = request.focus === 'all' ? ALL_LIMITS : FOCUS_LIMITS;
  const missing = Math.max(0, minimum - fromModel.length);
  const topUp =
    missing > 0
      ? libraryIdeas(
          request,
          missing,
          fromModel.map((i) => i.title),
        )
      : [];
  return {
    ideas: [...fromModel, ...topUp],
    source: fromModel.length >= minimumFromModel ? 'gemini' : 'library',
  };
}

async function askModel(deps: IdeasDeps, request: IdeasRequest): Promise<Idea[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, deps.timeoutMs);
  try {
    const json = await deps.ai.generateJson({
      system: IDEAS_SYSTEM,
      prompt: buildIdeasPrompt(request),
      schema: IDEAS_SCHEMA,
      maxOutputTokens: IDEAS_MAX_TOKENS,
      signal: controller.signal,
    });
    const parsed = IdeasModelOutput.parse(json);
    return cleanModelIdeas(parsed.ideas, request);
  } finally {
    clearTimeout(timer);
  }
}

async function generate(
  deps: IdeasDeps,
  request: IdeasRequest,
  key: string,
): Promise<IdeasResponse> {
  try {
    const response = assemble(request, await askModel(deps, request));
    if (response.source === 'gemini') {
      deps.cache.set(key, response);
    }
    return response;
  } catch (error) {
    deps.logger.log('warn', 'ai_error', {
      route: 'ideas',
      reason: error instanceof Error ? error.name : 'unknown',
    });
    return { ideas: libraryIdeas(request, request.focus === 'all' ? 10 : 3), source: 'library' };
  }
}

/**
 * Drafts ideas with the model, validating and filtering everything it returns. Falls back to
 * the Mehfil library on any failure. Identical requests are cached, and identical in-flight
 * requests share one model call.
 * @example await generateIdeas(deps, { brief, focus: 'all', exclude: [] })
 */
export async function generateIdeas(
  deps: IdeasDeps,
  request: IdeasRequest,
): Promise<IdeasResponse> {
  if (!deps.ai.enabled) {
    return { ideas: libraryIdeas(request, request.focus === 'all' ? 10 : 3), source: 'library' };
  }
  const key = ideasCacheKey(request);
  const cached = deps.cache.get(key);
  if (cached) {
    return cached;
  }
  const pending = deps.inflight.get(key);
  if (pending) {
    return pending;
  }
  const run = generate(deps, request, key).finally(() => {
    deps.inflight.delete(key);
  });
  deps.inflight.set(key, run);
  return run;
}
