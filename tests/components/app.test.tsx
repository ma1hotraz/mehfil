// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../../src/client/App';
import { PLANS_KEY } from '../../src/client/lib/storage';

const printSpy = vi.fn();

beforeEach(() => {
  printSpy.mockClear();
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
  window.print = printSpy;
});

afterEach(() => {
  cleanup();
  document.documentElement.style.removeProperty('--text-scale');
});

async function createJaipurPlan(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'A Jaipur wedding · 250 guests' }));
  expect(
    await screen.findByRole('heading', { level: 1, name: /The Invitation/ }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Set it in type/ }));
  await screen.findByRole('heading', { level: 1, name: 'Ananya & Kabir' });
}

describe('App: flow 1, the first plan', () => {
  it('goes from a sample to a focused plan heading with an announcement and library ideas', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('link', { name: 'Skip to content' })).toBeInTheDocument();
    expect(document.title).toBe('Mehfil — a planning almanac');

    await user.click(screen.getByRole('button', { name: 'A Jaipur wedding · 250 guests' }));
    const invitation = await screen.findByRole('heading', { level: 1, name: /The Invitation/ });
    expect(invitation).toHaveFocus();
    expect(document.title).toBe('The Invitation — Mehfil');
    expect(screen.getByLabelText(/Number of guests/)).toHaveValue('250');
    expect(screen.getByLabelText(/^City/)).toHaveValue('Jaipur');

    await user.click(screen.getByRole('button', { name: /Set it in type/ }));
    const heading = await screen.findByRole('heading', { level: 1, name: 'Ananya & Kabir' });
    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
    expect(document.title).toBe('Ananya & Kabir · Overview — Mehfil');
    expect(window.location.hash).toBe('#overview');
    expect(
      screen.getAllByText(/WEDDING · TRADITIONAL · 250 GUESTS · JAIPUR/).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('WORKABLE')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('live-polite')).toHaveTextContent(
        /Your almanac is ready\. \d+ notices, \d+ tasks, \d+ vendors\. Ideas are being drafted\./,
      );
    });

    await user.click(screen.getByRole('tab', { name: /Ideas/ }));
    expect(await screen.findByText('FROM THE MEHFIL LIBRARY')).toBeInTheDocument();
    expect(screen.getAllByRole('article').length).toBeGreaterThanOrEqual(6);
    expect(window.location.hash).toBe('#ideas');
  });

  it('shows an error summary and stays on the intake when the form is incomplete', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Begin a plan/ }));
    await user.click(await screen.findByRole('button', { name: /Set it in type/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Check these before setting it in type',
    );
    expect(screen.queryByRole('heading', { name: 'Ananya & Kabir' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Mehfil' })).toBeInTheDocument();
  });
});

describe('App: the almanac', () => {
  it('changes the ledger, keeps the total, announces it and survives a refresh (AC10)', async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await createJaipurPlan(user);
    await user.click(screen.getByRole('tab', { name: /Ledger/ }));
    const input = await screen.findByRole('spinbutton', { name: 'Photo & video share in percent' });
    expect(input).toHaveValue(10);
    await user.click(screen.getByRole('button', { name: 'Increase Photo & video by 0.5 percent' }));
    await waitFor(() => {
      expect(
        screen.getByRole('spinbutton', { name: 'Photo & video share in percent' }),
      ).toHaveValue(10.5);
    });
    expect(screen.getByRole('table')).toHaveAccessibleName('Budget allocation, total ₹12,00,000');
    await waitFor(() => {
      expect(screen.getByTestId('live-polite')).toHaveTextContent(
        /Photo & video now 10\.5 percent/,
      );
    });

    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(window.localStorage.getItem(PLANS_KEY)).toContain('"percent":10.5');
    first.unmount();

    window.location.hash = '#ledger';
    render(<App />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ananya & Kabir' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('spinbutton', { name: 'Photo & video share in percent' }),
    ).toHaveValue(10.5);
  });

  it('ticks a task, changes a vendor, edits the brief and keeps that progress', async () => {
    const user = userEvent.setup();
    render(<App />);
    await createJaipurPlan(user);
    await user.click(screen.getByRole('tab', { name: /Timetable/ }));
    await user.click(await screen.findByRole('checkbox', { name: 'Book the venue' }));
    expect(screen.getByRole('checkbox', { name: 'Book the venue' })).toBeChecked();
    await user.click(screen.getByRole('tab', { name: /Vendors/ }));
    const ticket = await screen.findByRole('article', { name: 'Caterer' });
    await user.click(within(ticket).getByRole('radio', { name: 'Booked' }));
    expect(
      within(await screen.findByRole('article', { name: 'Caterer' })).getByText('BOOKED'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit brief' }));
    expect(await screen.findByText(/Ticked tasks, vendor statuses/)).toBeInTheDocument();
    const guests = screen.getByLabelText(/Number of guests/);
    await user.clear(guests);
    await user.type(guests, '300');
    await user.click(screen.getByRole('button', { name: /Set it in type/ }));
    await screen.findByRole('heading', { level: 1, name: 'Ananya & Kabir' });
    expect(screen.getAllByText(/300 GUESTS/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('tab', { name: /Timetable/ }));
    expect(await screen.findByRole('checkbox', { name: 'Book the venue' })).toBeChecked();
    await user.click(screen.getByRole('tab', { name: /Vendors/ }));
    expect(
      within(await screen.findByRole('article', { name: 'Caterer' })).getByText('BOOKED'),
    ).toBeInTheDocument();
  });

  it('exports the calendar and copies the plan, with a telegram notice for each', async () => {
    const user = userEvent.setup();
    const createUrl = vi.fn(() => 'blob:mock');
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: vi.fn() }),
    );
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<App />);
    await createJaipurPlan(user);
    await user.click(screen.getByRole('button', { name: 'Copy plan as text' }));
    expect(await screen.findByText(/PLAN COPIED TO THE CLIPBOARD · STOP/)).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('LEDGER'));
    await user.click(screen.getByRole('tab', { name: /Timetable/ }));
    await user.click(await screen.findByRole('button', { name: 'Add to calendar (.ics)' }));
    expect(createUrl).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(await screen.findByText(/SAVED ANANYA-KABIR\.ICS · STOP/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Print' }));
    expect(printSpy).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });

  it('reports when the clipboard is unavailable', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('denied')) },
    });
    render(<App />);
    await createJaipurPlan(user);
    await user.click(screen.getByRole('button', { name: 'Copy plan as text' }));
    expect(
      await screen.findByText(/COPYING IS NOT AVAILABLE IN THIS BROWSER · STOP/),
    ).toBeInTheDocument();
  });

  it('opens the Planner as a sheet, answers offline and applies a suggestion (flow 3)', async () => {
    const user = userEvent.setup();
    render(<App />);
    await createJaipurPlan(user);
    await user.click(screen.getByRole('button', { name: 'Ask the Planner' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(
      await within(dialog).findByLabelText('Your question for the Planner'),
      'We are short, what should I cut?',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Send' }));
    expect(await within(dialog).findByText(/^Offline planner mode —/)).toBeInTheDocument();
    await user.click(await within(dialog).findByRole('button', { name: /^Apply: Move 3%/ }));
    await waitFor(() => {
      expect(within(dialog).getByText(/^Moved 3% \(₹36,000\)/)).toBeInTheDocument();
    });
    expect(
      await screen.findByText(
        /MOVED 3% \(₹36,000\) FROM ATTIRE & BEAUTY TO CONTINGENCY\. · STOP|MOVED 3%/,
      ),
    ).toBeInTheDocument();
  });

  it('dismisses notices and keeps the print copy out of the accessibility tree', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.resolve() },
    });
    render(<App />);
    await createJaipurPlan(user);
    await user.click(screen.getByRole('button', { name: 'Copy plan as text' }));
    await user.click(await screen.findByRole('button', { name: 'Dismiss notice' }));
    expect(screen.queryByText(/PLAN COPIED/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Ananya & Kabir' })).toBeInTheDocument();
    expect(document.querySelectorAll('[data-print="show"][aria-hidden="true"]')).toHaveLength(1);
  });
});

describe('App: print, sheet and idle prefetch', () => {
  it('prints the run sheet, closes the Planner sheet, and works with requestIdleCallback', async () => {
    Object.assign(window, {
      requestIdleCallback: (callback: () => void) => {
        callback();
        return 1;
      },
      cancelIdleCallback: () => undefined,
    });
    try {
      const user = userEvent.setup();
      render(<App />);
      await createJaipurPlan(user);
      await user.click(screen.getByRole('tab', { name: /Run sheet/ }));
      await user.click(await screen.findByRole('button', { name: 'Print run sheet' }));
      expect(printSpy).toHaveBeenCalledOnce();
      await user.click(screen.getByRole('button', { name: 'Ask the Planner' }));
      const dialog = await screen.findByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: 'Close' }));
      await waitFor(() => {
        expect(dialog).not.toHaveAttribute('open');
      });
    } finally {
      cleanup();
      Reflect.deleteProperty(window, 'requestIdleCallback');
      Reflect.deleteProperty(window, 'cancelIdleCallback');
    }
  });
});

describe('App: shelf, preferences and recovery', () => {
  it('lists the saved plan on the front page, opens it and removes it after confirming (flow 5)', async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await createJaipurPlan(user);
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    first.unmount();
    window.history.replaceState(null, '', '/');
    render(<App />);
    const spine = await screen.findByRole('button', {
      name: /Open Ananya & Kabir, wedding, \d+ days to go/,
    });
    await user.click(spine);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ananya & Kabir' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Mehfil/ }));
    await user.click(await screen.findByRole('button', { name: 'Remove Ananya & Kabir' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Remove plan' }),
    );
    expect(
      await screen.findByText('Nothing on the shelf yet. Your first plan will live here.'),
    ).toBeInTheDocument();
  });

  it('applies and remembers theme and text size', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Lamplight theme' }));
    expect(document.documentElement.dataset.theme).toBe('lamplight');
    await user.click(screen.getByRole('radio', { name: '130 percent' }));
    expect(document.documentElement.style.getPropertyValue('--text-scale')).toBe('1.3');
    expect(window.localStorage.getItem('mehfil:v1:prefs')).toContain('lamplight');
  });

  it('falls back to the front page when the hash names a plan that does not exist', () => {
    window.location.hash = '#ledger';
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Mehfil' })).toBeInTheDocument();
  });

  it('sets aside unreadable saved data and says so', async () => {
    window.localStorage.setItem(PLANS_KEY, '{broken');
    render(<App />);
    expect(await screen.findByText(/could not be read and was set aside/)).toBeInTheDocument();
  });
});
