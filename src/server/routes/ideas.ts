import { type RequestHandler, Router } from 'express';

import { type IdeasRequest, IdeasRequest as IdeasRequestSchema } from '../../shared/schema/ai.js';
import { checkBriefDate } from '../../shared/schema/brief.js';
import { type Clock, todayOf } from '../clock.js';
import { type IdeasDeps, generateIdeas } from '../ai/ideas.js';
import { validate } from '../middleware/validate.js';

/** Event dates may be one day in the past to absorb timezone differences (docs/08 §3). */
export const PAST_TOLERANCE_DAYS = 1;

export function dateGuard(clock: Clock): RequestHandler {
  return (req, res, next) => {
    const body = req.body as { brief: { date: string } };
    const problem = checkBriefDate(body.brief.date, todayOf(clock), PAST_TOLERANCE_DAYS);
    if (problem) {
      res.status(400).json({ error: 'invalid_request', fields: { 'brief.date': problem } });
      return;
    }
    next();
  };
}

export function ideasRouter(deps: IdeasDeps, clock: Clock, limits: RequestHandler[]): Router {
  const router = Router();
  router.post(
    '/ideas',
    ...limits,
    validate(IdeasRequestSchema),
    dateGuard(clock),
    async (req, res) => {
      res.json(await generateIdeas(deps, req.body as IdeasRequest));
    },
  );
  return router;
}
