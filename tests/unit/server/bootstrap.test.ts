import fs from 'node:fs';
import path from 'node:path';

import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { bootstrap } from '../../../src/server/bootstrap.js';
import { CSP_DIRECTIVES } from '../../../src/server/middleware/security.js';

describe('bootstrap', () => {
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
    expect(header('Strict-Transport-Security')).toContain('max-age=31536000');
    expect(config.rewrites[0]).toEqual({ source: '/api/(.*)', destination: '/api' });
  });
});
