import { Router } from 'express';

import type { AiClient } from '../ai/client.js';

/** Current semantic application version string. */
export const APP_VERSION = '1.0.0';

/** Express router exposing the health check and AI status endpoint. */
export function healthRouter(ai: AiClient): Router {
  const router = Router();
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', ai: ai.enabled ? 'enabled' : 'disabled', version: APP_VERSION });
  });
  return router;
}
