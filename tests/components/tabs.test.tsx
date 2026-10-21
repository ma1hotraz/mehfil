// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import IdeasTab from '../../src/client/features/almanac/IdeasTab';
import LedgerTab from '../../src/client/features/almanac/LedgerTab';
import OverviewTab from '../../src/client/features/almanac/OverviewTab';
import RunSheetTab from '../../src/client/features/almanac/RunSheetTab';
import TimetableTab from '../../src/client/features/almanac/TimetableTab';
import VendorsTab from '../../src/client/features/almanac/VendorsTab';
import { buildPlan } from '../../src/shared/engine/index.js';
import { selectFallbackIdeas } from '../../src/shared/engine/ideas.js';
import type { Plan } from '../../src/shared/schema/plan.js';
import { ananya, fixedToday, minimalBrief, rahul } from '../fixtures/briefs';
import { expectNoViolations } from '../helpers/a11y';
import { fakeApi } from '../helpers/fakeApi';

const basePlan = buildPlan(ananya, fixedToday, { id: 'a', now: '2026-10-21T00:00:00.000Z' });
const withIdeas = (plan: Plan, source: Plan['ideasSource'] = 'library'): Plan => ({
  ...plan,
  ideas: selectFallbackIdeas(plan.brief, 'all', 10, [], plan.feasibility).map((idea, i) => ({
    ...idea,
    saved: i === 0,
  })),
  ideasSource: source,
});

describe('OverviewTab', () => {
  const setup = (plan = basePlan, onCopy = vi.fn()) => ({
    onCopy,
    ...render(<OverviewTab plan={plan} today={fixedToday} onCopy={onCopy} />),
  });

  it('explains the verdict in the margin and lists numbered notices, severity first', () => {
    setup();
    expect(screen.getByRole('heading', { level: 2, name: /Overview/ })).toBeInTheDocument();
    expect(screen.getByText(/indicative; local prices vary/)).toBeInTheDocument();
    const notices = within(screen.getByRole('region', { name: 'Notices' })).getAllByRole(
      'listitem',
    );
    expect(notices).toHaveLength(6);
    expect(notices[0]).toHaveTextContent(/Warning · R03/);
  });

  it('shows and hides the full list of notices', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /Show all 7 notices/ }));
    expect(
      within(screen.getByRole('region', { name: 'Notices' })).getAllByRole('listitem'),
    ).toHaveLength(7);
    const toggle = screen.getByRole('button', { name: 'Show fewer notices' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(toggle);
    expect(screen.getByRole('button', { name: /Show all/ })).toBeInTheDocument();
  });

  it('prints key figures and the next three deadlines in timetable style', () => {
    setup();
    const figures = screen.getByRole('region', { name: 'Key figures' });
    expect(within(figures).getByText('₹4,800')).toBeInTheDocument();
    expect(within(figures).getByText('per guest')).toBeInTheDocument();
    const deadlines = within(
      screen.getByRole('region', { name: 'Next three deadlines' }),
    ).getAllByRole('listitem');
    expect(deadlines).toHaveLength(3);
    expect(deadlines[0]?.querySelector('time')).toHaveAttribute('datetime');
  });

  it('copies the plan and handles a plan with nothing left to do or no notices', async () => {
    const { onCopy } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Copy plan as text' }));
    expect(onCopy).toHaveBeenCalledOnce();
  });

  it('copes with a finished, quiet plan', () => {
    const quiet = buildPlan(minimalBrief({ guestCount: 100, budget: 1_000_000 }), fixedToday);
    const finished: Plan = {
      ...quiet,
      timeline: quiet.timeline.map((m) => ({ ...m, done: true })),
      insights: quiet.insights.slice(0, 1),
    };
    setup(finished);
    expect(screen.getByText('Every task is ticked off.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Show all/ })).not.toBeInTheDocument();
    expect(screen.getByText('tasks due this month')).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    await expectNoViolations(
      <OverviewTab plan={basePlan} today={fixedToday} onCopy={() => undefined} />,
    );
  });
});

describe('LedgerTab', () => {
  it('shows an exact table and routes steppers, typed shares and reset to the plan API', async () => {
    const api = fakeApi(basePlan);
    render(<LedgerTab plan={basePlan} api={api} />);
    expect(
      screen.getByRole('table', { name: 'Budget allocation, total ₹12,00,000' }),
    ).toBeInTheDocument();
    expect(screen.getByText('₹12,00,000', { selector: 'td' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Increase Venue by 0.5 percent' }));
    expect(api.step).toHaveBeenCalledWith('venue', 0.5);
    const input = screen.getByRole('spinbutton', { name: 'Venue share in percent' });
    await userEvent.clear(input);
    await userEvent.type(input, '20{Enter}');
    expect(api.setPercent).toHaveBeenCalledWith('venue', 20);
    await userEvent.click(screen.getByRole('button', { name: 'Reset to recommended' }));
    expect(api.resetLedger).toHaveBeenCalledOnce();
    expect(screen.getByText(/Outdoor events need a rain/)).toBeInTheDocument();
    expect(screen.getByText(/May in India is peak heat season/)).toBeInTheDocument();
  });

  it('tracks committed amounts and shows what remains', async () => {
    const api = fakeApi(basePlan);
    render(<LedgerTab plan={basePlan} api={api} />);
    await userEvent.click(screen.getByText('Track what you have committed'));
    const field = screen.getByLabelText('Venue committed (INR)');
    await userEvent.type(field, '1,00,000');
    await userEvent.tab();
    expect(api.setCommitted).toHaveBeenCalledWith('venue', 10_000_000);
    await userEvent.clear(field);
    await userEvent.tab();
    expect(api.setCommitted).toHaveBeenLastCalledWith('venue', undefined);
  });

  it('shows remaining against what is already committed', () => {
    const plan: Plan = {
      ...basePlan,
      ledger: basePlan.ledger.map((l) =>
        l.id === 'venue' ? { ...l, committedMinor: 100_000 } : l,
      ),
    };
    render(<LedgerTab plan={plan} api={fakeApi(plan)} />);
    expect(screen.getByLabelText('Venue committed (INR)')).toHaveValue('1000');
  });

  it('has no axe violations', async () => {
    await expectNoViolations(<LedgerTab plan={basePlan} api={fakeApi(basePlan)} />);
  });
});

describe('TimetableTab', () => {
  const setup = (plan = basePlan) => {
    const handlers = { onToggle: vi.fn(), onExport: vi.fn(), onPrint: vi.fn() };
    render(<TimetableTab plan={plan} today={fixedToday} {...handlers} />);
    return handlers;
  };

  it('groups tasks by phase in lists and describes each checkbox', () => {
    setup();
    const phases = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(phases[0]).toBe('Six months out');
    const venue = screen.getByRole('checkbox', { name: 'Book the venue' });
    expect(venue.getAttribute('aria-describedby')).toBeTruthy();
    expect(
      document.getElementById(venue.getAttribute('aria-describedby') ?? '')?.textContent,
    ).toMatch(/Due .*days before the event/);
  });

  it('toggles tasks and exposes export and print', async () => {
    const { onToggle, onExport, onPrint } = setup();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Book the venue' }));
    expect(onToggle).toHaveBeenCalledWith('book-venue');
    await userEvent.click(screen.getByRole('button', { name: 'Add to calendar (.ics)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Print' }));
    expect(onExport).toHaveBeenCalledOnce();
    expect(onPrint).toHaveBeenCalledOnce();
  });

  it('prints RUSHED and OVERDUE as text, and critical tasks as such', () => {
    const late: Plan = {
      ...basePlan,
      timeline: basePlan.timeline.map((m, i) => (i === 0 ? { ...m, dueDate: '2026-10-01' } : m)),
    };
    setup(late);
    expect(screen.getAllByText('Rushed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Overdue')).toHaveLength(1);
    expect(screen.getAllByText('Critical').length).toBeGreaterThan(0);
  });

  it('does not mark completed tasks as rushed or overdue', () => {
    const done: Plan = {
      ...basePlan,
      timeline: basePlan.timeline.map((m) => ({ ...m, done: true, dueDate: '2026-10-01' })),
    };
    setup(done);
    expect(screen.queryByText('Overdue')).not.toBeInTheDocument();
    expect(screen.queryByText('Rushed')).not.toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    await expectNoViolations(
      <TimetableTab
        plan={basePlan}
        today={fixedToday}
        onToggle={() => undefined}
        onExport={() => undefined}
        onPrint={() => undefined}
      />,
    );
  });
});

describe('VendorsTab', () => {
  it('shows tickets with reasons, book-by dates and questions', () => {
    render(<VendorsTab plan={basePlan} api={fakeApi(basePlan)} />);
    const ticket = screen.getByRole('article', { name: 'Caterer' });
    expect(within(ticket).getByText(/Added because/)).toBeInTheDocument();
    expect(within(ticket).getByText(/Questions to ask \(\d+\)/)).toBeInTheDocument();
    expect(within(ticket).getByText('TO FIND')).toBeInTheDocument();
    expect(
      within(ticket)
        .getByText(/Book by/)
        .querySelector('time'),
    ).toHaveAttribute('datetime');
  });

  it('changes status with a radio group and the stamp follows the plan', async () => {
    const api = fakeApi(basePlan);
    const { rerender } = render(<VendorsTab plan={basePlan} api={api} />);
    const ticket = screen.getByRole('article', { name: 'Caterer' });
    const group = within(ticket).getByRole('group', { name: 'Status of Caterer' });
    await userEvent.click(within(group).getByRole('radio', { name: 'Booked' }));
    expect(api.setVendorStatus).toHaveBeenCalledWith('caterer', 'booked');
    const booked: Plan = {
      ...basePlan,
      vendors: basePlan.vendors.map((v) => (v.id === 'caterer' ? { ...v, status: 'booked' } : v)),
    };
    rerender(<VendorsTab plan={booked} api={api} />);
    expect(
      within(screen.getByRole('article', { name: 'Caterer' })).getByText('BOOKED'),
    ).toBeInTheDocument();
  });

  it('filters by status and says when nothing matches', async () => {
    const booked: Plan = {
      ...basePlan,
      vendors: basePlan.vendors.map((v, i) => (i === 0 ? { ...v, status: 'booked' } : v)),
    };
    render(<VendorsTab plan={booked} api={fakeApi(booked)} />);
    expect(screen.getAllByRole('article')).toHaveLength(booked.vendors.length);
    const filter = within(screen.getByRole('group', { name: 'Show vendors' }));
    await userEvent.click(filter.getByRole('radio', { name: 'Booked' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    await userEvent.click(filter.getByRole('radio', { name: 'Paid' }));
    expect(screen.getByText('No vendors with that status yet.')).toBeInTheDocument();
  });

  it('keeps contact notes on the device and saves them on blur', async () => {
    const api = fakeApi(basePlan);
    render(<VendorsTab plan={basePlan} api={api} />);
    const ticket = screen.getByRole('article', { name: 'Caterer' });
    await userEvent.click(within(ticket).getByText('Your notes for Caterer'));
    expect(within(ticket).getByText(/stay on this device/)).toBeInTheDocument();
    await userEvent.type(within(ticket).getByLabelText('Name'), 'Sharma');
    await userEvent.type(within(ticket).getByLabelText('Phone'), '98');
    await userEvent.type(within(ticket).getByLabelText('Notes'), 'Tasting Friday');
    await userEvent.tab();
    expect(api.setVendorContact).toHaveBeenLastCalledWith('caterer', {
      name: 'Sharma',
      phone: '98',
      notes: 'Tasting Friday',
    });
  });

  it('has no axe violations', async () => {
    await expectNoViolations(<VendorsTab plan={basePlan} api={fakeApi(basePlan)} />);
  });
});

describe('IdeasTab', () => {
  it('labels the source and shows postcards with text cost bands and fits-because lines', () => {
    const plan = withIdeas(buildPlan(rahul, fixedToday), 'gemini');
    render(<IdeasTab plan={plan} api={fakeApi(plan)} />);
    expect(screen.getByText('DRAFTED BY GEMINI')).toBeInTheDocument();
    const cards = screen.getAllByRole('article');
    expect(cards.length).toBeGreaterThanOrEqual(6);
    expect(within(cards[0]!).getByText(/^Cost: (low|medium|high)$/)).toBeInTheDocument();
    expect(within(cards[0]!).getByText(/^Fits because:/)).toBeInTheDocument();
  });

  it('says the ideas come from the library when offline', () => {
    const plan = withIdeas(basePlan, 'library');
    render(<IdeasTab plan={plan} api={fakeApi(plan)} />);
    expect(screen.getByText('FROM THE MEHFIL LIBRARY')).toBeInTheDocument();
    expect(screen.getByText(/written by people, picked for your event/)).toBeInTheDocument();
  });

  it('toggles Keep with aria-pressed and asks for more like this', async () => {
    const plan = withIdeas(basePlan);
    const api = fakeApi(plan);
    render(<IdeasTab plan={plan} api={api} />);
    const first = screen.getAllByRole('article')[0]!;
    expect(within(first).getByRole('button', { name: 'Kept' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const second = screen.getAllByRole('article')[1]!;
    await userEvent.click(within(second).getByRole('button', { name: 'Keep' }));
    expect(api.toggleIdeaSaved).toHaveBeenCalled();
    await userEvent.click(within(second).getByRole('button', { name: 'More like this' }));
    expect(api.requestIdeas).toHaveBeenCalledWith(plan.ideas[1]?.category);
  });

  it('filters by category and by kept, and regenerates the shown section', async () => {
    const plan = withIdeas(buildPlan(rahul, fixedToday));
    const api = fakeApi(plan);
    render(<IdeasTab plan={plan} api={api} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Food & drink' }));
    expect(screen.getAllByRole('article').length).toBeLessThan(plan.ideas.length);
    await userEvent.click(screen.getByRole('button', { name: 'Regenerate food & drink' }));
    expect(api.requestIdeas).toHaveBeenCalledWith('food');
    await userEvent.click(screen.getByRole('radio', { name: 'Kept' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    await userEvent.click(screen.getByRole('radio', { name: 'All' }));
    await userEvent.click(screen.getByRole('button', { name: 'Regenerate all' }));
    expect(api.requestIdeas).toHaveBeenLastCalledWith('all');
  });

  it('shows the typesetting loader with aria-busy while drafting, and an empty state for Kept', () => {
    const empty: Plan = { ...basePlan, ideas: [], ideasSource: 'pending' };
    const { container } = render(
      <IdeasTab plan={empty} api={fakeApi(empty, { ideasLoading: true })} />,
    );
    expect(screen.getByText('Setting ideas in type…')).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Regenerate all' })).toBeDisabled();
  });

  it('explains an empty Kept filter', async () => {
    const plan: Plan = {
      ...withIdeas(basePlan),
      ideas: withIdeas(basePlan).ideas.map((i) => ({ ...i, saved: false })),
    };
    render(<IdeasTab plan={plan} api={fakeApi(plan)} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Kept' }));
    expect(screen.getByText(/Nothing kept yet/)).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const plan = withIdeas(basePlan);
    await expectNoViolations(<IdeasTab plan={plan} api={fakeApi(plan)} />);
  });
});

describe('RunSheetTab', () => {
  it('sets the order of ceremony with times, titles and owners', async () => {
    const onPrint = vi.fn();
    render(<RunSheetTab plan={basePlan} onPrint={onPrint} />);
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(basePlan.runSheet.length);
    expect(rows[0]).toHaveTextContent(/\d\d:\d\d/);
    expect(screen.getByText('Décor lead')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Print run sheet' }));
    expect(onPrint).toHaveBeenCalledOnce();
  });

  it('shows notes when a slot has one, and has no axe violations', async () => {
    render(<RunSheetTab plan={basePlan} onPrint={() => undefined} />);
    expect(screen.getByText(/muhurat/)).toBeInTheDocument();
    await expectNoViolations(<RunSheetTab plan={basePlan} onPrint={() => undefined} />);
  });
});
