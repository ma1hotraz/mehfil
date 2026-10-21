import { z } from 'zod';

const positiveInt = (fallback: number) => z.coerce.number().int().positive().default(fallback);

const ConfigSchema = z.object({
  PORT: positiveInt(8080),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  GEMINI_API_KEY: z.string().trim().optional(),
  GEMINI_MODEL: z.string().trim().min(1).default('gemini-3.6-flash'),
  AI_TIMEOUT_MS: positiveInt(20_000),
  RATE_LIMIT_PER_MIN: positiveInt(20),
  CACHE_TTL_SECONDS: positiveInt(3600),
  CACHE_MAX_ENTRIES: positiveInt(200),
});

export interface Config {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  /** Never logged or returned to clients. */
  geminiApiKey: string | undefined;
  geminiModel: string;
  aiTimeoutMs: number;
  rateLimitPerMin: number;
  cacheTtlSeconds: number;
  cacheMaxEntries: number;
}

/**
 * Parses and validates environment variables, failing fast with a clear message. The message
 * names the offending variables but never prints their values (the key must stay secret).
 */
export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((issue) => issue.path.join('.')))];
    throw new Error(`Invalid configuration: ${names.join(', ')}`);
  }
  const data = parsed.data;
  return {
    port: data.PORT,
    nodeEnv: data.NODE_ENV,
    geminiApiKey: data.GEMINI_API_KEY === '' ? undefined : data.GEMINI_API_KEY,
    geminiModel: data.GEMINI_MODEL,
    aiTimeoutMs: data.AI_TIMEOUT_MS,
    rateLimitPerMin: data.RATE_LIMIT_PER_MIN,
    cacheTtlSeconds: data.CACHE_TTL_SECONDS,
    cacheMaxEntries: data.CACHE_MAX_ENTRIES,
  };
}
