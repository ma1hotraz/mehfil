import type { RequestHandler } from 'express';
import type * as z from 'zod/mini';

import { checkBriefDate } from '../../shared/schema/brief.js';
import { type Clock, todayOf } from '../clock.js';
import { fieldErrors } from '../middleware/validate.js';

/** Event dates may be one day in the past to absorb timezone differences (docs/08 §3). */
export const PAST_TOLERANCE_DAYS = 1;

/** Every route body that carries an event brief. */
interface WithBrief {
  brief: { date: string };
}

/**
 * Builds a JSON handler for a route whose body contains a brief. The body is validated with
 * `schema` (400 with field errors), the event date is checked against the server clock, and only
 * then is `handle` called with the parsed, fully typed body.
 */
export function briefRoute<S extends z.ZodMiniType<WithBrief>>(
  schema: S,
  clock: Clock,
  handle: (body: z.output<S>) => Promise<unknown>,
): RequestHandler {
  return async (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_request', fields: fieldErrors(parsed.error.issues) });
      return;
    }
    const problem = checkBriefDate(parsed.data.brief.date, todayOf(clock), PAST_TOLERANCE_DAYS);
    if (problem) {
      res.status(400).json({ error: 'invalid_request', fields: { 'brief.date': problem } });
      return;
    }
    res.json(await handle(parsed.data));
  };
}
