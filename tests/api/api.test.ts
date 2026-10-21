import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import request from 'supertest';
import { describe, expect, it } from 'vitest';

import type { AiClient } from '../../src/server/ai/client.js';
import { buildDigest } from '../../src/shared/engine/digest.js';
import { buildPlan } from '../../src/shared/engine/index.js';
import { ananya, fixedToday } from '../fixtures/briefs.js';
import { makeApp } from '../helpers/app.js';
import { FakeAiClient } from '../helpers/fakeAi.js';

const post = (app: ReturnType<typeof makeApp>, url: string, body: unknown) =>
  request(app).post(url).set('Content-Type', 'application/json').send(JSON.stringify(body));
const ideasBody = { brief: ananya, focus: 'all', exclude: [] };
const assistantBody = {
  brief: ananya,
  plan: buildDigest(buildPlan(ananya, fixedToday), fixedToday),
  history: [],
  question: 'What next?',
};

describe('GET /api/health', () => {
  it('reports ok and whether AI is enabled', async () => {
    const off = await request(makeApp()).get('/api/health');
    expect(off.status).toBe(200);
    expect(off.body).toEqual({ status: 'ok', ai: 'disabled', version: '1.0.0' });
    const on = await request(makeApp({ ai: new FakeAiClient() })).get('/api/health');
    expect(on.body.ai).toBe('enabled');
  });
});

describe('security headers', () => {
  it('sets a strict CSP and companion headers, and hides x-powered-by', async () => {
    const res = await request(makeApp()).get('/api/health');
    const csp = String(res.headers['content-security-policy']);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['permissions-policy']).toContain('camera=()');
    expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('marks every API response no-store', async () => {
    for (const res of [
      await request(makeApp()).get('/api/health'),
      await request(makeApp()).get('/api/nope'),
    ]) {
      expect(res.headers['cache-control']).toBe('no-store');
    }
  });
});

describe('POST /api/ideas', () => {
  it('returns library ideas without a key', async () => {
    const res = await post(makeApp(), '/api/ideas', ideasBody);
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('library');
    expect(res.body.ideas.length).toBeGreaterThanOrEqual(6);
  });

  it('applies defaults for focus and exclude', async () => {
    const res = await post(makeApp(), '/api/ideas', { brief: ananya });
    expect(res.status).toBe(200);
  });

  it('returns 400 with field errors for an invalid body', async () => {
    const res = await post(makeApp(), '/api/ideas', { brief: { ...ananya, guestCount: 0 } });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_request');
    expect(res.body.fields['brief.guestCount']).toBeDefined();
  });

  it('rejects unknown keys', async () => {
    const res = await post(makeApp(), '/api/ideas', { ...ideasBody, extra: true });
    expect(res.status).toBe(400);
  });

  it('rejects event dates in the past or more than three years away', async () => {
    for (const date of ['2026-10-01', '2031-01-01']) {
      const res = await post(makeApp(), '/api/ideas', { brief: { ...ananya, date } });
      expect(res.status).toBe(400);
      expect(res.body.fields['brief.date']).toMatch(/three years/);
    }
  });

  it('accepts yesterday as timezone tolerance', async () => {
    const res = await post(makeApp(), '/api/ideas', { brief: { ...ananya, date: '2026-10-20' } });
    expect(res.status).toBe(200);
  });

  it('rejects bodies over 16 kB with 413', async () => {
    const res = await post(makeApp(), '/api/ideas', {
      ...ideasBody,
      exclude: ['x'.repeat(20_000)],
    });
    expect(res.status).toBe(413);
  });

  it('rejects other content types with 415', async () => {
    const res = await request(makeApp())
      .post('/api/ideas')
      .set('Content-Type', 'text/plain')
      .send('hello');
    expect(res.status).toBe(415);
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await request(makeApp())
      .post('/api/ideas')
      .set('Content-Type', 'application/json')
      .send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.fields.body).toBeDefined();
  });

  it('never turns an AI failure into a 5xx', async () => {
    const ai = new FakeAiClient(() => {
      throw new Error('upstream down with secret details');
    });
    const res = await post(makeApp({ ai }), '/api/ideas', ideasBody);
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('library');
    expect(JSON.stringify(res.body)).not.toContain('secret details');
  });
});

describe('POST /api/ideas with a model', () => {
  it('serves the second identical request from the cache', async () => {
    const ideas = Array.from({ length: 6 }, (_, i) => ({
      category: i === 0 ? 'theme' : 'decor',
      title: `Model idea ${i}`,
      description: 'Specific and safe.',
      costBand: 2,
      fitsBecause: 'Fits the brief.',
    }));
    const ai = new FakeAiClient(() => ({ ideas }));
    const app = makeApp({ ai });
    const first = await post(app, '/api/ideas', ideasBody);
    const second = await post(app, '/api/ideas', ideasBody);
    expect(first.body.source).toBe('gemini');
    expect(second.body).toEqual(first.body);
    expect(ai.calls).toHaveLength(1);
  });
});

describe('POST /api/assistant', () => {
  it('answers with the rule-based planner when AI is off', async () => {
    const res = await post(makeApp(), '/api/assistant', assistantBody);
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('rules');
    expect(res.body.answer).toMatch(/^Offline planner mode/);
  });

  it('validates the request', async () => {
    const res = await post(makeApp(), '/api/assistant', { ...assistantBody, question: '' });
    expect(res.status).toBe(400);
    expect(res.body.fields.question).toBeDefined();
  });

  it('uses the model when available', async () => {
    const ai = new FakeAiClient(() => ({ answer: 'Sure.', suggestedActions: [] }));
    const res = await post(makeApp({ ai }), '/api/assistant', assistantBody);
    expect(res.body).toEqual({ answer: 'Sure.', suggestedActions: [], source: 'gemini' });
  });
});

describe('rate limiting', () => {
  it('returns 429 JSON on the 21st AI request in a minute', async () => {
    const app = makeApp();
    for (let i = 0; i < 20; i += 1) {
      expect((await post(app, '/api/ideas', ideasBody)).status).toBe(200);
    }
    const res = await post(app, '/api/ideas', ideasBody);
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: 'rate_limited' });
  });

  it('honours RATE_LIMIT_PER_MIN', async () => {
    const app = makeApp({ env: { RATE_LIMIT_PER_MIN: '2' } });
    await post(app, '/api/ideas', ideasBody);
    await post(app, '/api/ideas', ideasBody);
    expect((await post(app, '/api/ideas', ideasBody)).status).toBe(429);
  });

  it('limits the whole API globally', async () => {
    const app = makeApp();
    let last = 200;
    for (let i = 0; i < 121; i += 1) {
      last = (await request(app).get('/api/health')).status;
    }
    expect(last).toBe(429);
  });
});

describe('errors', () => {
  it('returns JSON 404s for unknown routes', async () => {
    const res = await request(makeApp()).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'not_found' });
    expect((await request(makeApp()).get('/elsewhere')).status).toBe(404);
  });

  it('turns a thrown error into a 500 with a request id and no stack', async () => {
    const exploding: AiClient = {
      get enabled(): boolean {
        throw new Error('kaboom at /secret/path.ts:12');
      },
      generateJson: () => Promise.reject(new Error('unused')),
    };
    const res = await request(makeApp({ ai: exploding })).get('/api/health');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('internal_error');
    expect(res.body.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.stringify(res.body)).not.toMatch(/kaboom|secret|\.ts/);
  });
});

describe('static client', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mehfil-static-'));
  fs.mkdirSync(path.join(dir, 'assets'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>Mehfil</title>');
  fs.writeFileSync(path.join(dir, 'assets', 'app-abc.js'), 'console.log(1)');
  const app = makeApp({ staticDir: dir });

  it('falls back to index.html for non-API paths with no-cache', async () => {
    const res = await request(app).get('/some/path');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<title>Mehfil</title>');
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it('serves hashed assets as immutable and keeps /api 404 as JSON', async () => {
    const asset = await request(app).get('/assets/app-abc.js');
    expect(asset.headers['cache-control']).toContain('immutable');
    const miss = await request(app).get('/api/nope');
    expect(miss.status).toBe(404);
    expect(miss.body).toEqual({ error: 'not_found' });
  });
});
