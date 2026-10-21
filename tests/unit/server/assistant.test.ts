import { describe, expect, it } from 'vitest';

import { answer, isGrounded, rulesAnswer, vetActions } from '../../../src/server/ai/assistant.js';
import { silentLogger } from '../../../src/server/logger.js';
import { buildDigest } from '../../../src/shared/engine/digest.js';
import { applyAction } from '../../../src/shared/engine/actions.js';
import { buildPlan } from '../../../src/shared/engine/index.js';
import { AssistantRequest } from '../../../src/shared/schema/ai.js';
import { ananya, fixedToday, minimalBrief } from '../../fixtures/briefs.js';
import { FakeAiClient, rejectWithNonError, slow } from '../../helpers/fakeAi.js';

const plan = buildPlan(ananya, fixedToday);
const digest = buildDigest(plan, fixedToday);
const request = (question: string, brief = ananya, p = plan) =>
  AssistantRequest.parse({ brief, plan: buildDigest(p, fixedToday), question });
const deps = (ai: FakeAiClient, timeoutMs = 1000) => ({ ai, logger: silentLogger, timeoutMs });

const shift = {
  type: 'shiftBudget',
  from: 'decor',
  to: 'contingency',
  percent: 3,
  rationale: 'Safer',
};
const task = {
  type: 'addTask',
  title: 'Call the florist',
  daysBeforeEvent: 30,
  category: 'decor',
  rationale: 'Early',
};
const vendor = { type: 'markVendor', vendorId: 'caterer', status: 'booked', rationale: 'Done' };

describe('answer with a model', () => {
  it('returns the answer and valid actions', async () => {
    const client = new FakeAiClient(() => ({
      answer: 'Trim decor a little.',
      suggestedActions: [shift, task, vendor],
    }));
    const result = await answer(deps(client), request('Can I cut decor?'));
    expect(result.source).toBe('gemini');
    expect(result.answer).toBe('Trim decor a little.');
    expect(result.suggestedActions.map((a) => a.type)).toEqual([
      'shiftBudget',
      'addTask',
      'markVendor',
    ]);
  });

  it('drops invalid types, unknown ids and out-of-range values but keeps the rest', async () => {
    const bad = [
      { type: 'deleteEverything', rationale: 'x' },
      { ...shift, from: 'nonsense' },
      { ...shift, from: 'safety' },
      { ...shift, percent: 50 },
      { ...shift, to: 'decor' },
      { ...vendor, vendorId: 'ghost' },
      { ...task, category: 'safety' },
      'a string',
      null,
      vendor,
    ];
    const client = new FakeAiClient(() => ({ answer: 'ok', suggestedActions: bad }));
    const result = await answer(deps(client), request('hi'));
    expect(result.suggestedActions).toEqual([vendor]);
  });

  it('truncates to three actions and accepts general tasks and creatable lines', async () => {
    const many = [
      shift,
      { ...task, category: 'general' },
      { ...shift, to: 'weatherCover' },
      vendor,
    ];
    const client = new FakeAiClient(() => ({ answer: 'ok', suggestedActions: many }));
    expect((await answer(deps(client), request('hi'))).suggestedActions).toHaveLength(3);
  });

  it('sanitises long action text and delimiters in the answer', async () => {
    const long = { ...task, title: 't'.repeat(200), rationale: 'r'.repeat(500) };
    const client = new FakeAiClient(() => ({
      answer: `Hi <<<x ${'a'.repeat(2000)}`,
      suggestedActions: [long],
    }));
    const result = await answer(deps(client), request('hi'));
    expect(result.answer.length).toBeLessThanOrEqual(900);
    expect(result.answer).not.toContain('<<<');
    expect(result.suggestedActions[0]).toMatchObject({ title: 't'.repeat(80) });
  });

  it('defaults missing actions to none', async () => {
    const client = new FakeAiClient(() => ({ answer: 'Just words.' }));
    expect((await answer(deps(client), request('hi'))).suggestedActions).toEqual([]);
  });

  it('falls back to rules with an apology on failures and timeouts', async () => {
    for (const responder of [
      () => 'junk',
      () => {
        throw new Error('x');
      },
      () => rejectWithNonError(),
    ]) {
      const result = await answer(
        deps(new FakeAiClient(responder)),
        request('What should I do next?'),
      );
      expect(result.source).toBe('rules');
      expect(result.answer.startsWith('I couldn’t reach the AI just now')).toBe(true);
    }
    const slowClient = new FakeAiClient((args) => slow(500, { answer: 'late' }, args.signal));
    expect((await answer(deps(slowClient, 20), request('hi'))).source).toBe('rules');
  });

  it('proposals survive the engine: grounded actions apply cleanly', () => {
    for (const action of vetActions([shift, task, vendor], digest)) {
      expect('error' in applyAction(plan, action, fixedToday)).toBe(false);
    }
  });
});

describe('offline planner (rules)', () => {
  const offline = async (question: string, brief = ananya) =>
    answer(
      deps(new FakeAiClient(() => ({}), false)),
      request(question, brief, buildPlan(brief, fixedToday)),
    );

  it('prefixes every offline answer and labels the source', async () => {
    const result = await offline('hello there');
    expect(result.source).toBe('rules');
    expect(result.answer.startsWith('Offline planner mode — ')).toBe(true);
    expect(result.suggestedActions).toEqual([]);
    expect(result.answer).toContain('What should I do next');
  });

  it('cut: explains flexible lines and proposes moving 3% to contingency', async () => {
    const result = await offline("We're short by 50,000, what should I cut?");
    expect(result.answer).toMatch(/most flexible lines/);
    expect(result.suggestedActions).toHaveLength(1);
    expect(result.suggestedActions[0]).toMatchObject({
      type: 'shiftBudget',
      to: 'contingency',
      percent: 3,
    });
  });

  it('cut: moves to the category named in the question', async () => {
    const result = await offline('Can I cut decor to afford a photographer?');
    expect(result.suggestedActions[0]).toMatchObject({
      type: 'shiftBudget',
      from: 'attire',
      to: 'photo',
    });
  });

  it('cut: says so when no flexible line exists', () => {
    const lean = buildPlan(minimalBrief({ eventType: 'community', subType: 'drive' }), fixedToday);
    const result = rulesAnswer(
      request('cut costs', minimalBrief({ eventType: 'community', subType: 'drive' }), lean),
      true,
    );
    expect(result.answer).toMatch(/None of the flexible lines/);
    expect(result.suggestedActions).toEqual([]);
  });

  it('next: lists the next three open tasks', async () => {
    const result = await offline('What should I do first?');
    expect(result.answer).toMatch(/Your next tasks: .*\(by /);
    const empty = rulesAnswer(
      AssistantRequest.parse({
        brief: ananya,
        plan: { ...digest, openMilestones: [] },
        question: 'next?',
      }),
      true,
    );
    expect(empty.answer).toMatch(/Every task/);
  });

  it('vendor: lists unbooked vendors by book-by date', async () => {
    const result = await offline('Which vendors should I book?');
    expect(result.answer).toMatch(/Still to find: /);
    const done = {
      ...digest,
      vendors: digest.vendors.map((v) => ({ ...v, status: 'booked' as const })),
    };
    expect(
      rulesAnswer(AssistantRequest.parse({ brief: ananya, plan: done, question: 'vendors' }), true)
        .answer,
    ).toMatch(/Every vendor/);
  });

  it('weather: reports the weather line, or its absence', async () => {
    expect((await offline('What if it rains?')).answer).toMatch(/Weather cover is 8%/);
    const indoor = minimalBrief({ setting: 'indoor' });
    expect((await offline('weather?', indoor)).answer).toMatch(/no weather line/);
  });

  it('diet: lists dietary needs and defers to professionals', async () => {
    expect(
      (await offline('Is there a nut allergy risk?', minimalBrief({ dietary: ['nut-allergy'] })))
        .answer,
    ).toMatch(/nut-allergy.*confirm with the caterer/);
    expect((await offline('any diet needs?', minimalBrief())).answer).toMatch(/No dietary needs/);
  });
});

describe('isGrounded', () => {
  it('requires ids that appear in the digest', () => {
    expect(
      isGrounded(
        { type: 'markVendor', vendorId: 'caterer', status: 'paid', rationale: '' },
        digest,
      ),
    ).toBe(true);
    expect(
      isGrounded({ type: 'markVendor', vendorId: 'zzz', status: 'paid', rationale: '' }, digest),
    ).toBe(false);
  });
});
