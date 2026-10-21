import { randomUUID } from 'node:crypto';
import path from 'node:path';

import express, { type Express, type NextFunction, type Request, type Response } from 'express';

import { TtlCache } from './ai/cache.js';
import type { AiClient } from './ai/client.js';
import type { Clock } from './clock.js';
import type { Config } from './config.js';
import type { Logger } from './logger.js';
import { setRequestId } from './requestId.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { aiRateLimits, applySecurity, noStore, requireJson } from './middleware/security.js';
import { assistantRouter } from './routes/assistant.js';
import { healthRouter } from './routes/health.js';
import { ideasRouter } from './routes/ideas.js';
import type { IdeasResponse } from '../shared/schema/ai.js';

export interface AppDeps {
  ai: AiClient;
  clock: Clock;
  logger: Logger;
  config: Config;
  /** Directory of the built client; when set, it is served with an SPA fallback. */
  staticDir?: string | undefined;
}

const BODY_LIMIT = '16kb';
const YEAR_SECONDS = 31_536_000;

function requestLogging(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = randomUUID();
    const started = Date.now();
    setRequestId(res, requestId);
    res.on('finish', () => {
      logger.log('info', 'request', {
        requestId,
        route: req.path,
        status: res.statusCode,
        ms: Date.now() - started,
      });
    });
    next();
  };
}

function serveClient(app: Express, staticDir: string): void {
  app.use(
    '/assets',
    express.static(path.join(staticDir, 'assets'), {
      dotfiles: 'deny',
      immutable: true,
      maxAge: YEAR_SECONDS * 1000,
    }),
  );
  app.use(express.static(staticDir, { index: false, dotfiles: 'deny' }));
  app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(staticDir, 'index.html'));
  });
}

/**
 * Builds the Express app. Everything with side effects (AI, clock, logger, config) is injected so
 * tests can run the real app with fakes.
 */
export function createApp(deps: AppDeps): Express {
  const { ai, clock, logger, config } = deps;
  const app = express();
  app.use(requestLogging(logger));
  applySecurity(app);
  const ideas = {
    ai,
    cache: new TtlCache<IdeasResponse>(config.cacheMaxEntries, config.cacheTtlSeconds * 1000, () =>
      clock.now().getTime(),
    ),
    inflight: new Map<string, Promise<IdeasResponse>>(),
    logger,
    timeoutMs: config.aiTimeoutMs,
  };
  const limits = aiRateLimits(config);
  app.use(
    '/api',
    noStore,
    requireJson,
    express.json({ limit: BODY_LIMIT, strict: true, type: 'application/json' }),
  );
  app.use(
    '/api',
    healthRouter(ai),
    ideasRouter(ideas, clock, limits),
    assistantRouter({ ai, logger, timeoutMs: config.aiTimeoutMs }, clock, limits),
  );
  app.use('/api', notFound);
  if (deps.staticDir) {
    serveClient(app, deps.staticDir);
  }
  app.use(notFound);
  app.use(errorHandler(logger));
  return app;
}
