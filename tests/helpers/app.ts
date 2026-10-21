import type { Express } from 'express';

import type { AiClient } from '../../src/server/ai/client.js';
import { DisabledAiClient } from '../../src/server/ai/client.js';
import { createApp } from '../../src/server/app.js';
import type { Clock } from '../../src/server/clock.js';
import { type Config, loadConfig } from '../../src/server/config.js';
import { silentLogger } from '../../src/server/logger.js';

export const fixedClock: Clock = { now: () => new Date('2026-10-21T12:00:00.000Z') };

export const testConfig = (env: Record<string, string> = {}): Config =>
  loadConfig({ NODE_ENV: 'test', ...env });

export function makeApp(
  options: { ai?: AiClient; env?: Record<string, string>; staticDir?: string } = {},
): Express {
  return createApp({
    ai: options.ai ?? new DisabledAiClient(),
    clock: fixedClock,
    logger: silentLogger,
    config: testConfig(options.env),
    staticDir: options.staticDir,
  });
}
