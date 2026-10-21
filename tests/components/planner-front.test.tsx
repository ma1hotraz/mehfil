// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { FrontPage } from '../../src/client/features/front/FrontPage';
import { describeAction } from '../../src/client/features/almanac/planner/describeAction';
import PlannerPanel from '../../src/client/features/almanac/planner/PlannerPanel';
import { usePlanner } from '../../src/client/features/almanac/planner/usePlanner';
import type { ApiOptions } from '../../src/client/lib/api';
import { sampleBriefs } from '../../src/client/lib/samples';
import { buildPlan } from '../../src/shared/engine/index.js';
import type {
  AssistantRequest,
  AssistantResponse,
  SuggestedAction,
} from '../../src/shared/schema/ai.js';
import type { Result } from '../../src/shared/result.js';
import { ananya, fixedToday } from '../fixtures/briefs';
import { expectNoViolations } from '../helpers/a11y';

const plan = buildPlan(ananya, fixedToday, { id: 'a', now: '2026-10-21T00:00:00.000Z' });
const shift: SuggestedAction = {
  type: 'shiftBudget',
  from: 'decor',
  to: 'contingency',
  percent: 3,
  rationale: 'Safer',
};

type AskResult = Result<AssistantResponse, { kind: 'network' | 'server' }>;

function Harness({
  ask,
  apply = () =>
    Promise.resolve({ notice: 'Moved 3% (₹36,000) from Décor & flowers to Contingency.' }),
}: {
  ask: (r: AssistantRequest, o?: ApiOptions) => Promise<AskResult>;
  apply?: () => Promise<{ notice: string } | { error: string }>;
}) {
  const [notice, setNotice] = useState('');
  const planner = usePlanner({
    plan,
    today: fixedToday,
    api: { applyPlannerAction: apply },
    announce: vi.fn(),
    onNotice: setNotice,
    ask: ask,
  });
  return (
    <>
      <PlannerPanel plan={plan} planner={planner} />
      <p data-testid="notice">{notice}</p>
    </>
  );
}

const reply = (
  answer: string,
  actions: SuggestedAction[] = [shift],
  source: 'gemini' | 'rules' = 'gemini',
): AskResult => ({
  ok: true,
  value: { answer, suggestedActions: actions, source },
});

describe('PlannerPanel', () => {
  it('sets questions and answers as correspondence, not chat', async () => {
    const ask = vi.fn<(r: AssistantRequest) => Promise<AskResult>>(() =>
      Promise.resolve(reply('Trim décor a little.')),
    );
    render(<Harness ask={ask} />);
    expect(screen.getByRole('heading', { name: 'Letters to the Planner' })).toBeInTheDocument();
    await userEvent.type(
      screen.getByLabelText('Your question for the Planner'),
      'Can I cut decor?',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    const letters = await screen.findByRole('list', { name: 'Correspondence' });
    expect(within(letters).getByText('You asked')).toBeInTheDocument();
    expect(await within(letters).findByText('Trim décor a little.')).toBeInTheDocument();
    expect(within(letters).getByText('The Planner replies')).toBeInTheDocument();
    expect(within(letters).getByText('Answered by Gemini')).toBeInTheDocument();
    expect(ask).toHaveBeenCalledOnce();
    const request = ask.mock.calls[0]?.[0];
    expect(request?.question).toBe('Can I cut decor?');
    expect(request?.plan.ledger.length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Your question for the Planner')).toHaveValue('');
  });

  it('applies a suggestion only on click and leaves focus on the slip with the notice', async () => {
    const apply = vi.fn(() =>
      Promise.resolve({ notice: 'Moved 3% (₹36,000) from Décor & flowers to Contingency.' }),
    );
    render(<Harness ask={() => Promise.resolve(reply('Do this.'))} apply={apply} />);
    await userEvent.type(screen.getByLabelText('Your question for the Planner'), 'Help');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    const slip = await screen.findByRole('article', {
      name: /Move 3% from Décor & flowers to Contingency \(₹36,000\)/,
    });
    expect(apply).not.toHaveBeenCalled();
    await userEvent.click(within(slip).getByRole('button', { name: /^Apply: Move 3%/ }));
    expect(apply).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(slip).toHaveFocus();
    });
    expect(within(slip).getByText(/^Moved 3% \(₹36,000\)/)).toBeInTheDocument();
    expect(screen.getByTestId('notice')).toHaveTextContent('Moved 3%');
    expect(within(slip).queryByRole('button')).not.toBeInTheDocument();
  });

  it('removes a slip with Not now and reports engine errors politely', async () => {
    render(
      <Harness
        ask={() =>
          Promise.resolve(
            reply('Two options.', [
              shift,
              { type: 'markVendor', vendorId: 'caterer', status: 'booked', rationale: 'Done' },
            ]),
          )
        }
        apply={() => Promise.resolve({ error: 'That vendor is not on your checklist.' })}
      />,
    );
    await userEvent.type(screen.getByLabelText('Your question for the Planner'), 'Help');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    const slips = await screen.findAllByRole('article');
    expect(slips).toHaveLength(2);
    await userEvent.click(within(slips[0]!).getByRole('button', { name: /^Not now/ }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: /^Apply: Mark Caterer as booked/ }));
    expect(await screen.findByText('That vendor is not on your checklist.')).toBeInTheDocument();
  });

  it('falls back to the offline rules locally when the server cannot be reached', async () => {
    render(<Harness ask={() => Promise.resolve({ ok: false, error: { kind: 'network' } })} />);
    await userEvent.type(
      screen.getByLabelText('Your question for the Planner'),
      'What should I do next?',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText(/^Offline planner mode — Your next tasks/)).toBeInTheDocument();
    expect(screen.getByText('Offline planner')).toBeInTheDocument();
  });

  it('apologises on a server failure and still answers from the plan', async () => {
    render(<Harness ask={() => Promise.resolve({ ok: false, error: { kind: 'server' } })} />);
    await userEvent.type(
      screen.getByLabelText('Your question for the Planner'),
      'Which vendors should I book?',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText(/^I couldn’t reach the AI just now/)).toBeInTheDocument();
  });

  it('keeps conversation history in context for follow-ups and blocks sending while waiting', async () => {
    let release: (r: AskResult) => void = () => undefined;
    const ask = vi.fn<(r: AssistantRequest) => Promise<AskResult>>(
      () =>
        new Promise<AskResult>((resolve) => {
          release = resolve;
        }),
    );
    render(<Harness ask={ask} />);
    const box = screen.getByLabelText('Your question for the Planner');
    await userEvent.type(box, 'First');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(screen.getByText('The Planner is writing…')).toBeInTheDocument();
    await userEvent.type(box, 'Second');
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    release(reply('Answer one', []));
    expect(await screen.findByText('Answer one')).toBeInTheDocument();
    ask.mockImplementationOnce(() => Promise.resolve(reply('Answer two', [])));
    await userEvent.clear(box);
    await userEvent.type(box, 'Second');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByText('Answer two');
    const second = ask.mock.calls[1]?.[0];
    expect(second?.history).toEqual([
      { role: 'user', text: 'First' },
      { role: 'planner', text: 'Answer one' },
    ]);
  });

  it('shows a character count only near the limit and ignores blank questions', async () => {
    const ask = vi.fn();
    render(<Harness ask={ask} />);
    const box = screen.getByLabelText('Your question for the Planner');
    expect(screen.queryByText(/characters left/)).not.toBeInTheDocument();
    await userEvent.click(box);
    await userEvent.paste('x'.repeat(460));
    expect(screen.getByText('40 characters left')).toBeInTheDocument();
    expect(screen.getByText(/confirm with the local authority/)).toBeInTheDocument();
    await userEvent.clear(box);
    await userEvent.type(box, '   ');
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('has no axe violations', async () => {
    await expectNoViolations(<Harness ask={() => Promise.resolve(reply('Hi', []))} />);
  });
});

describe('describeAction', () => {
  it('words each action with the plan’s own numbers', () => {
    expect(describeAction(shift, plan)).toBe(
      'Move 3% from Décor & flowers to Contingency (₹36,000)',
    );
    expect(
      describeAction(
        {
          type: 'addTask',
          title: 'Call florist',
          daysBeforeEvent: 1,
          category: 'decor',
          rationale: '',
        },
        plan,
      ),
    ).toBe('Add the task “Call florist”, 1 day before the event');
    expect(
      describeAction(
        { type: 'markVendor', vendorId: 'caterer', status: 'to-find', rationale: '' },
        plan,
      ),
    ).toBe('Mark Caterer as to find');
    expect(
      describeAction(
        { type: 'markVendor', vendorId: 'ghost', status: 'paid', rationale: '' },
        plan,
      ),
    ).toBe('Mark the vendor as paid');
  });
});

describe('FrontPage', () => {
  const samples = sampleBriefs(fixedToday);
  const setup = (plans = [plan], discarded = 0) => {
    const handlers = { onBegin: vi.fn(), onSample: vi.fn(), onOpen: vi.fn(), onRemove: vi.fn() };
    const ui = (
      <FrontPage
        today={fixedToday}
        plans={plans}
        samples={samples}
        discarded={discarded}
        headingRef={createRef()}
        {...handlers}
      />
    );
    return { ...handlers, ui, ...render(ui) };
  };

  it('sets a masthead with a dateline, contents and a primary action', async () => {
    const { onBegin } = setup([]);
    expect(screen.getByRole('heading', { level: 1, name: 'Mehfil' })).toBeInTheDocument();
    expect(screen.getByText(/VOL\. I · NO\. 294 · WED 21 OCT 2026/)).toBeInTheDocument();
    const contents = screen.getByRole('region', { name: 'Contents' });
    expect(within(contents).getAllByRole('listitem')).toHaveLength(6);
    await userEvent.click(screen.getByRole('button', { name: /Begin a plan/ }));
    expect(onBegin).toHaveBeenCalledOnce();
    expect(
      screen.getByText('Nothing on the shelf yet. Your first plan will live here.'),
    ).toBeInTheDocument();
  });

  it('offers three sample slips that prefill the intake', async () => {
    const { onSample } = setup([]);
    const slips = within(screen.getByRole('region', { name: 'Or try a sample' })).getAllByRole(
      'button',
    );
    expect(slips.map((s) => s.textContent)).toEqual([
      'A Jaipur wedding · 250 guests',
      'A seventh birthday · 25 children',
      'A Diwali mela · 400 neighbours',
    ]);
    await userEvent.click(slips[0]!);
    expect(onSample).toHaveBeenCalledWith(samples[0]);
  });

  it('shows saved plans as spines with days to go and opens them', async () => {
    const { onOpen } = setup();
    const spine = screen.getByRole('button', {
      name: /Open Ananya & Kabir, wedding, 203 days to go/,
    });
    await userEvent.click(spine);
    expect(onOpen).toHaveBeenCalledWith('a');
  });

  it('asks before removing a plan and moves focus on afterwards', async () => {
    const second = {
      ...plan,
      id: 'b',
      updatedAt: '2026-10-20T00:00:00.000Z',
      brief: { ...plan.brief, title: 'Second' },
    };
    const onRemove = vi.fn();
    render(
      <FrontPage
        today={fixedToday}
        plans={[plan, second]}
        samples={samples}
        discarded={0}
        headingRef={createRef()}
        onBegin={vi.fn()}
        onSample={vi.fn()}
        onOpen={vi.fn()}
        onRemove={onRemove}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Remove Ananya & Kabir' }));
    const dialog = await screen.findByRole('dialog', { name: 'Remove this plan?' });
    expect(onRemove).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep it' }));
    expect(onRemove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Remove Ananya & Kabir' }));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Remove plan' }),
    );
    expect(onRemove).toHaveBeenCalledWith('a');
  });

  it('says so when saved plans could not be read', () => {
    setup([], 1);
    expect(screen.getByRole('status')).toHaveTextContent('One saved plan could not be read');
  });

  it('pluralises the unreadable-plans notice', () => {
    setup([], 3);
    expect(screen.getByRole('status')).toHaveTextContent('3 saved plans could not be read');
  });

  it('has no axe violations with and without saved plans', async () => {
    await expectNoViolations(
      <FrontPage
        today={fixedToday}
        plans={[plan]}
        samples={samples}
        discarded={1}
        headingRef={createRef()}
        onBegin={() => undefined}
        onSample={() => undefined}
        onOpen={() => undefined}
        onRemove={() => undefined}
      />,
    );
    await expectNoViolations(
      <FrontPage
        today={fixedToday}
        plans={[]}
        samples={samples}
        discarded={0}
        headingRef={createRef()}
        onBegin={() => undefined}
        onSample={() => undefined}
        onOpen={() => undefined}
        onRemove={() => undefined}
      />,
    );
  });
});
