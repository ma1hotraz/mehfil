import { Router } from 'express';

import type { AiClient } from '../ai/client.js';

export const APP_VERSION = '1.0.0';

export function healthRouter(ai: AiClient): Router {
  const router = Router();
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', ai: ai.enabled ? 'enabled' : 'disabled', version: APP_VERSION });
  });
  return router;
}
