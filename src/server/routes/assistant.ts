import { type RequestHandler, Router } from 'express';

import { AssistantRequest } from '../../shared/schema/ai.js';
import { type AssistantDeps, answer } from '../ai/assistant.js';
import type { Clock } from '../clock.js';

import { briefRoute } from './briefRoute.js';

/** `POST /api/assistant`: the Planner's answer and whitelisted suggestions for a question. */
export function assistantRouter(
  deps: AssistantDeps,
  clock: Clock,
  limits: RequestHandler[],
): Router {
  const router = Router();
  router.post(
    '/assistant',
    ...limits,
    briefRoute(AssistantRequest, clock, (body) => answer(deps, body)),
  );
  return router;
}
