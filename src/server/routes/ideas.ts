import { type RequestHandler, Router } from 'express';

import { IdeasRequest } from '../../shared/schema/ai.js';
import type { Clock } from '../clock.js';
import { type IdeasDeps, generateIdeas } from '../ai/ideas.js';

import { briefRoute } from './briefRoute.js';

/** `POST /api/ideas`: drafted or library ideas for a brief, behind the AI rate limits. */
export function ideasRouter(deps: IdeasDeps, clock: Clock, limits: RequestHandler[]): Router {
  const router = Router();
  router.post(
    '/ideas',
    ...limits,
    briefRoute(IdeasRequest, clock, (body) => generateIdeas(deps, body)),
  );
  return router;
}
