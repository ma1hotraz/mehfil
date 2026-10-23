import fs from 'node:fs';
import path from 'node:path';

import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { bootstrap } from '../../../src/server/bootstrap.js';
import { CSP_DIRECTIVES } from '../../../src/server/middleware/security.js';

const generateContent = vi.fn();
vi.mock('@google/genai', async (importActual) => {
  const actual = await importActual<typeof import('@google/genai')>();
  class FakeGoogleGenAI {
    models = { generateContent };
  }
  return { ...actual, GoogleGenAI: FakeGoogleGenAI };
});

describe('bootstrap', () => {
  it('logs token usage (counts only, never content) after a model call', async () => {
    generateContent.mockResolvedValue({
      text: '{}',
      usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 5 },
    });
    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const { ai } = bootstrap({ NODE_ENV: 'test', GEMINI_API_KEY: 'k' });
    await ai.generateJson({
      system: 's',
      prompt: 'secret prompt text',
      schema: {},
      maxOutputTokens: 10,
      signal: new AbortController().signal,
    });
    const lines = write.mock.calls.map((call) => String(call[0]));
    write.mockRestore();
    const usage = lines.find((line) => line.includes('ai_usage')) ?? '';
    expect(JSON.parse(usage)).toMatchObject({ promptTokens: 12, outputTokens: 5 });
    expect(lines.join('')).not.toContain('secret prompt text');
  });

  it('uses the disabled client without a key', async () => {
    const { app, ai } = bootstrap({ NODE_ENV: 'test' });
    expect(ai.enabled).toBe(false);
    expect((await request(app).get('/api/health')).body.ai).toBe('disabled');
  });

  it('enables Gemini when a key is present, without exposing it', async () => {
    const { app, ai } = bootstrap({ NODE_ENV: 'test', GEMINI_API_KEY: 'test-key-value' });
    expect(ai.enabled).toBe(true);
    const res = await request(app).get('/api/health');
    expect(res.body.ai).toBe('enabled');
    expect(JSON.stringify(res.body) + JSON.stringify(res.headers)).not.toContain('test-key-value');
  });
});

describe('vercel.json', () => {
  const config = JSON.parse(fs.readFileSync(path.resolve('vercel.json'), 'utf8')) as {
    headers: { source: string; headers: { key: string; value: string }[] }[];
    rewrites: { source: string; destination: string }[];
  };
  const allHeaders = config.headers.find((h) => h.source === '/(.*)')?.headers ?? [];
  const header = (key: string) => allHeaders.find((h) => h.key === key)?.value ?? '';

  it('sends the same CSP as the Express app, with no unsafe directives', async () => {
    const { app } = bootstrap({ NODE_ENV: 'test' });
    const served = String(
      (await request(app).get('/api/health')).headers['content-security-policy'],
    );
    const normalise = (csp: string) =>
      csp
        .split(';')
        .map((d) => d.trim())
        .filter(Boolean)
        .sort();
    expect(normalise(header('Content-Security-Policy'))).toEqual(normalise(served));
    expect(header('Content-Security-Policy')).not.toMatch(/unsafe-/);
    expect(Object.keys(CSP_DIRECTIVES).length).toBeGreaterThan(5);
  });

  it('carries the companion security headers and routes /api to the function', () => {
    expect(header('X-Content-Type-Options')).toBe('nosniff');
    expect(header('Permissions-Policy')).toContain('camera=()');
    expect(header('X-Frame-Options')).toBe('DENY');
    expect(header('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(header('Cross-Origin-Resource-Policy')).toBe('same-origin');
    expect(header('Strict-Transport-Security')).toContain('max-age=31536000');
    expect(config.rewrites[0]).toEqual({ source: '/api/(.*)', destination: '/api' });
  });
});
