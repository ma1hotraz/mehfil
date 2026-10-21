import { describe, expect, it, vi } from 'vitest';

import { TtlCache } from '../../../src/server/ai/cache.js';
import { AiDisabledError, DisabledAiClient } from '../../../src/server/ai/client.js';
import { todayOf } from '../../../src/server/clock.js';
import { loadConfig } from '../../../src/server/config.js';
import { createLogger, redact, silentLogger } from '../../../src/server/logger.js';
import { fieldErrors } from '../../../src/server/middleware/validate.js';
import { fixedClock } from '../../helpers/app.js';

describe('loadConfig', () => {
  it('applies defaults and treats an empty key as no key', () => {
    const config = loadConfig({ GEMINI_API_KEY: '' });
    expect(config).toMatchObject({
      port: 8080,
      geminiModel: 'gemini-3.6-flash',
      aiTimeoutMs: 20_000,
      rateLimitPerMin: 20,
    });
    expect(config.geminiApiKey).toBeUndefined();
    expect(loadConfig({ GEMINI_API_KEY: ' abc ' }).geminiApiKey).toBe('abc');
  });

  it('fails fast naming the variable but never printing its value', () => {
    expect(() => loadConfig({ PORT: 'not-a-number', GEMINI_API_KEY: 'secret-value' })).toThrow(
      'PORT',
    );
    try {
      loadConfig({ PORT: 'secret-value' });
    } catch (error) {
      expect(String(error)).not.toContain('secret-value');
    }
  });
});

describe('logger', () => {
  it('writes JSON lines and redacts credential-like fields', () => {
    const lines: string[] = [];
    createLogger((line) => lines.push(line)).log('info', 'hello', {
      route: '/x',
      apiKey: 'abc',
      Authorization: 'Bearer z',
    });
    const entry = JSON.parse(lines[0] ?? '{}') as Record<string, unknown>;
    expect(entry).toMatchObject({
      level: 'info',
      msg: 'hello',
      route: '/x',
      apiKey: '[redacted]',
      Authorization: '[redacted]',
    });
    expect(typeof entry.time).toBe('string');
  });

  it('writes to stdout by default and has a silent variant', () => {
    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    createLogger().log('warn', 'x');
    expect(write).toHaveBeenCalledOnce();
    write.mockRestore();
    silentLogger.log('info', 'x');
    expect(redact({ token: 't', ok: 1 })).toEqual({ token: '[redacted]', ok: 1 });
  });
});

describe('TtlCache', () => {
  it('hits, misses and expires entries by TTL', () => {
    let now = 0;
    const cache = new TtlCache<string>(5, 1000, () => now);
    cache.set('a', '1');
    expect(cache.get('a')).toBe('1');
    expect(cache.get('b')).toBeUndefined();
    now = 1000;
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('evicts the least recently used entry when full', () => {
    const cache = new TtlCache<number>(2, 1000, () => 0);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a');
    cache.set('c', 3);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
    expect(cache.get('c')).toBe(3);
    expect(cache.size).toBe(2);
  });

  it('overwrites a key without growing', () => {
    const cache = new TtlCache<number>(2, 1000, () => 0);
    cache.set('a', 1);
    cache.set('a', 2);
    expect(cache.size).toBe(1);
    expect(cache.get('a')).toBe(2);
  });

  it('uses the real clock by default', () => {
    const cache = new TtlCache<number>(1, 60_000);
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
  });
});

describe('small helpers', () => {
  it('formats today from the injected clock', () => {
    expect(todayOf(fixedClock)).toBe('2026-10-21');
  });

  it('the disabled client rejects with AiDisabledError', async () => {
    const client = new DisabledAiClient();
    expect(client.enabled).toBe(false);
    await expect(client.generateJson()).rejects.toBeInstanceOf(AiDisabledError);
  });

  it('fieldErrors keeps the first message per path and names the body when path is empty', () => {
    expect(
      fieldErrors([
        { path: ['a', 0, 'b'], message: 'x' },
        { path: ['a', 0, 'b'], message: 'y' },
        { path: [], message: 'z' },
      ]),
    ).toEqual({ 'a.0.b': 'x', body: 'z' });
  });
});

describe('error plumbing', () => {
  it('uses the system clock by default', async () => {
    const { systemClock } = await import('../../../src/server/clock.js');
    expect(Math.abs(systemClock.now().getTime() - Date.now())).toBeLessThan(1000);
  });

  it('reads an empty request id when none was set', async () => {
    const { requestIdOf, setRequestId } = await import('../../../src/server/requestId.js');
    const res = { locals: {} } as Parameters<typeof requestIdOf>[0];
    expect(requestIdOf(res)).toBe('');
    setRequestId(res, 'abc');
    expect(requestIdOf(res)).toBe('abc');
  });

  it('turns a non-object throw into a generic 500', async () => {
    const { errorHandler } = await import('../../../src/server/middleware/errors.js');
    const json = vi.fn();
    const res = { locals: {}, status: vi.fn(() => ({ json })) } as never;
    errorHandler(silentLogger)('plain string', {} as never, res, vi.fn());
    expect(json).toHaveBeenCalledWith({ error: 'internal_error', requestId: '' });
  });
});
