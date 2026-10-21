import type { ErrorRequestHandler, RequestHandler } from 'express';

import type { Logger } from '../logger.js';
import { requestIdOf } from '../requestId.js';

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'not_found' });
};

interface HttpishError {
  status?: number;
  type?: string;
}

/**
 * Central error handler. Maps body-parser failures to 400/413 and everything else to a generic
 * 500 with a request id. Stack traces and upstream error text are logged by name only, never sent.
 */
export const errorHandler =
  (logger: Logger): ErrorRequestHandler =>
  (error: unknown, _req, res, _next) => {
    const { status, type } = (
      typeof error === 'object' && error !== null ? error : {}
    ) as HttpishError;
    if (type === 'entity.too.large') {
      res.status(413).json({ error: 'payload_too_large' });
      return;
    }
    if (type === 'entity.parse.failed' || status === 400) {
      res.status(400).json({ error: 'invalid_request', fields: { body: 'Send valid JSON' } });
      return;
    }
    const requestId = requestIdOf(res);
    logger.log('error', 'unhandled_error', {
      requestId,
      reason: error instanceof Error ? error.name : 'unknown',
    });
    res.status(500).json({ error: 'internal_error', requestId });
  };
