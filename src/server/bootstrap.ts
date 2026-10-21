import type { Express } from 'express';

import { type AiClient, DisabledAiClient, GeminiClient } from './ai/client.js';
import { createApp } from './app.js';
import { systemClock } from './clock.js';
import { type Config, loadConfig } from './config.js';
import { type Logger, createLogger } from './logger.js';

export interface Bootstrapped {
  app: Express;
  config: Config;
  logger: Logger;
  ai: AiClient;
}

/**
 * Wires real dependencies from the environment: Gemini when a key is set, otherwise the
 * disabled client (library ideas and the rule-based Planner). Shared by the Node server and the
 * Vercel function so both behave identically.
 */
export function bootstrap(
  env: Record<string, string | undefined> = process.env,
  staticDir?: string,
): Bootstrapped {
  const config = loadConfig(env);
  const logger = createLogger();
  const ai: AiClient = config.geminiApiKey
    ? new GeminiClient({
        apiKey: config.geminiApiKey,
        model: config.geminiModel,
        onUsage: (usage) => {
          logger.log('info', 'ai_usage', {
            promptTokens: usage.promptTokens,
            outputTokens: usage.outputTokens,
          });
        },
      })
    : new DisabledAiClient();
  return {
    app: createApp({ ai, clock: systemClock, logger, config, staticDir }),
    config,
    logger,
    ai,
  };
}
