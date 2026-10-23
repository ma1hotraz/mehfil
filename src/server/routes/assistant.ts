import { type RequestHandler, Router } from 'express';

import {
  type AssistantRequest,
  AssistantRequest as AssistantRequestSchema,
} from '../../shared/schema/ai.js';
import { type AssistantDeps, answer } from '../ai/assistant.js';
import type { Clock } from '../clock.js';
import { validate } from '../middleware/validate.js';

import { dateGuard } from './ideas.js';

/** Express router handling AI planner conversation and action suggestion requests. */
export function assistantRouter(
  deps: AssistantDeps,
  clock: Clock,
  limits: RequestHandler[],
): Router {
  const router = Router();
  router.post(
    '/assistant',
    ...limits,
    validate(AssistantRequestSchema),
    dateGuard(clock),
    async (req, res) => {
      res.json(await answer(deps, req.body as AssistantRequest));
    },
  );
  return router;
}
