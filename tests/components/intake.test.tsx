// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { IntakeView } from '../../src/client/features/intake/IntakeView';
import { draftFromBrief, emptyDraft } from '../../src/client/lib/draft';
import { ananya, fixedToday } from '../fixtures/briefs';
import { expectNoViolations } from '../helpers/a11y';

const setup = (initial = emptyDraft(fixedToday), editing = false) => {
  const onSubmit = vi.fn();
  const onBack = vi.fn();
  const ui = (
    <IntakeView
      initial={initial}
      today={fixedToday}
      editing={editing}
      headingRef={createRef()}
      onSubmit={onSubmit}
      onBack={onBack}
    />
  );
  return { ui, onSubmit, onBack, ...render(ui) };
};

describe('IntakeView', () => {
  it('sets the invitation sentence as labelled controls in a fieldset', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: /The Invitation/ })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Event details' })).toBeInTheDocument();
    for (const name of [
      /Event type/,
      /Kind of event/,
      /Number of guests/,
      /^City/,
      /Event date/,
      /^Setting/,
      /Currency/,
      /Total budget/,
    ]) {
      expect(screen.getByLabelText(name)).toBeInTheDocument();
    }
    expect(screen.getByLabelText(/Number of guests/)).toBeRequired();
  });

  it('offers the sub-types that belong to the chosen event type', async () => {
    setup();
    const sub = screen.getByLabelText(/Kind of event/);
    expect(
      within(sub)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['traditional', 'intimate', 'destination', 'court and reception']);
    await userEvent.selectOptions(screen.getByLabelText(/Event type/), 'birthday');
    expect(
      within(screen.getByLabelText(/Kind of event/))
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['children’s', 'teenage', 'adult', 'milestone']);
    await userEvent.selectOptions(screen.getByLabelText(/Event type/), 'community');
    expect(screen.getByLabelText(/Kind of event/)).toHaveValue('festival');
  });

  it('announces validation errors on submit, links the summary to each field and focuses the summary', async () => {
    const { onSubmit } = setup();
    await userEvent.click(screen.getByRole('button', { name: /Set it in type/ }));
    expect(onSubmit).not.toHaveBeenCalled();
    const summary = await screen.findByRole('alert');
    expect(within(summary).getByRole('heading', { name: /Check these/ })).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(summary).toHaveFocus();
    });
    const guests = screen.getByLabelText(/Number of guests/);
    expect(guests).toHaveAttribute('aria-invalid', 'true');
    expect(
      (guests.getAttribute('aria-describedby') ?? '')
        .split(' ')
        .some((id) => document.getElementById(id)?.textContent.startsWith('Check:')),
    ).toBe(true);
    await userEvent.click(within(summary).getByRole('link', { name: 'Number of guests' }));
    expect(guests).toHaveFocus();
    expect(window.location.hash).toBe('');
  });

  it('validates a field on blur before any submit', async () => {
    setup();
    const city = screen.getByLabelText(/^City/);
    await userEvent.click(city);
    await userEvent.tab();
    expect(
      await screen.findByText('Check: Enter a city (up to 60 characters)'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('submits a valid brief parsed from typed values', async () => {
    const { onSubmit } = setup(emptyDraft(fixedToday));
    await userEvent.type(screen.getByLabelText(/Number of guests/), '250');
    await userEvent.type(screen.getByLabelText(/^City/), 'Jaipur');
    await userEvent.type(screen.getByLabelText(/Total budget/), '18,00,000');
    await userEvent.selectOptions(screen.getByLabelText(/^Setting/), 'outdoor');
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Vibe: placeholder'.replace('Vibe: placeholder', 'Festive'),
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: /Set it in type/ }));
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      guestCount: 250,
      city: 'Jaipur',
      budget: 1_800_000,
      setting: 'outdoor',
      vibe: ['festive'],
      currency: 'INR',
    });
  });

  it('prefills from a brief, limits vibes to three and edits the optional fields', async () => {
    setup(draftFromBrief(ananya), true);
    expect(screen.getByLabelText(/Number of guests/)).toHaveValue('250');
    expect(screen.getByText(/ticked tasks, vendor statuses/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Rustic' }));
    expect(screen.getByRole('button', { name: 'Classic' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Nut allergy' }));
    expect(screen.getByRole('button', { name: 'Nut allergy' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Sensory-friendly' }));
    await userEvent.type(screen.getByLabelText('Title of the event'), '!');
    await userEvent.type(screen.getByLabelText('Traditions to honour'), ' x');
    await userEvent.type(screen.getByLabelText('Must-haves'), ' y');
    expect(screen.getByText(/^\d+ of 200 characters$/)).toBeInTheDocument();
    expect(screen.getByText(/^\d+ of 300 characters$/)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Currency'), 'GBP');
  });

  it('edits the date and the sub-type, validating the date on blur', async () => {
    setup(draftFromBrief(ananya));
    const date = screen.getByLabelText(/Event date/);
    await userEvent.clear(date);
    await userEvent.type(date, '2020-01-01');
    await userEvent.tab();
    expect(await screen.findByText(/Check: Enter a date from today/)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText(/Kind of event/), 'intimate');
    expect(screen.getByLabelText(/Kind of event/)).toHaveValue('intimate');
  });

  it('goes back when asked', async () => {
    const { onBack } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('has no axe violations, with and without errors', async () => {
    await expectNoViolations(
      <IntakeView
        initial={draftFromBrief(ananya)}
        today={fixedToday}
        editing={false}
        headingRef={createRef()}
        onSubmit={() => undefined}
        onBack={() => undefined}
      />,
    );
    const { unmount } = setup();
    await userEvent.click(screen.getByRole('button', { name: /Set it in type/ }));
    await screen.findByRole('alert');
    const { axe } = await import('vitest-axe');
    expect(
      await axe(document.body, { rules: { 'color-contrast': { enabled: false } } }),
    ).toHaveNoViolations();
    unmount();
  });
});
