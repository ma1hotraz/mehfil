// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '../../src/client/components/Button';
import { ChipGroup } from '../../src/client/components/ChipGroup';
import { Dialog } from '../../src/client/components/Dialog';
import { ErrorBoundary } from '../../src/client/components/ErrorBoundary';
import { Field } from '../../src/client/components/Field';
import { Icon, type IconName } from '../../src/client/components/Icon';
import { LedgerTable, type LedgerRowView } from '../../src/client/components/LedgerTable';
import { Postage, Postcard } from '../../src/client/components/Postcard';
import { MOTIF_BY_TYPE, Rule } from '../../src/client/components/Rule';
import { SkipLink } from '../../src/client/components/SkipLink';
import { Stamp } from '../../src/client/components/Stamp';
import { Tabs } from '../../src/client/components/Tabs';
import { Telegram } from '../../src/client/components/Telegram';
import { TextSizeControl } from '../../src/client/components/TextSizeControl';
import { ThemeToggle } from '../../src/client/components/ThemeToggle';
import { Ticket } from '../../src/client/components/Ticket';
import { TypesetLoader } from '../../src/client/components/TypesetLoader';
import { expectNoViolations } from '../helpers/a11y';

describe('Button', () => {
  it('renders variants, defaults to type=button and fires clicks', async () => {
    const onClick = vi.fn();
    render(
      <>
        <Button variant="primary" icon="arrow" onClick={onClick}>
          Begin a plan
        </Button>
        <Button>Plain</Button>
        <Button variant="text" disabled>
          Gone
        </Button>
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Begin a plan' }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Plain' })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: 'Gone' })).toBeDisabled();
  });

  it('has no axe violations', async () => {
    await expectNoViolations(
      <>
        <Button variant="primary">One</Button>
        <Button variant="secondary" icon="download">
          Two
        </Button>
        <Button variant="text">Three</Button>
      </>,
    );
  });
});

describe('Icon', () => {
  it('draws every glyph as a decorative svg', () => {
    const names: IconName[] = [
      'arrow',
      'check',
      'cross',
      'calendar',
      'print',
      'download',
      'plus',
      'minus',
      'pencil',
      'bell',
    ];
    const { container } = render(
      <>
        {names.map((n) => (
          <Icon key={n} name={n} />
        ))}
      </>,
    );
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(10);
    svgs.forEach((svg) => {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });
});

describe('Field', () => {
  const Demo = ({ error }: { error?: string }) => (
    <Field label="Guests" hint="Between 1 and 5,000" error={error} required>
      {(control) => <input type="number" {...control} />}
    </Field>
  );

  it('wires label, hint and error to the control', () => {
    render(<Demo error="Enter a number" />);
    const input = screen.getByLabelText(/Guests/);
    expect(input).toBeRequired();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const described = input.getAttribute('aria-describedby') ?? '';
    expect(described.split(' ')).toHaveLength(2);
    expect(screen.getByText('Check: Enter a number')).toBeInTheDocument();
    expect(screen.getByText('Between 1 and 5,000')).toBeInTheDocument();
  });

  it('omits ARIA wiring when there is nothing to describe', () => {
    render(
      <Field label="City" hideLabel>
        {(control) => <input {...control} />}
      </Field>,
    );
    const input = screen.getByLabelText('City');
    expect(input).not.toHaveAttribute('aria-describedby');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('has no axe violations, with and without errors', async () => {
    await expectNoViolations(<Demo />);
    await expectNoViolations(<Demo error="Enter a number" />);
  });
});

describe('ChipGroup', () => {
  const options = ['a', 'b', 'c', 'd'].map((v) => ({ value: v, label: `Chip ${v}` }));

  function Multi({ max }: { max?: number }) {
    const [selected, setSelected] = useState<string[]>([]);
    return (
      <ChipGroup
        legend="Vibe"
        options={options}
        selected={selected}
        onChange={setSelected}
        {...(max ? { max } : {})}
      />
    );
  }

  it('toggles chips with aria-pressed inside a labelled group', async () => {
    render(<Multi />);
    expect(screen.getByRole('group', { name: 'Vibe' })).toBeInTheDocument();
    const chip = screen.getByRole('button', { name: 'Chip a' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks the rest aria-disabled at the limit and ignores clicks on them', async () => {
    render(<Multi max={2} />);
    await userEvent.click(screen.getByRole('button', { name: 'Chip a' }));
    await userEvent.click(screen.getByRole('button', { name: 'Chip b' }));
    const blocked = screen.getByRole('button', { name: 'Chip c' });
    expect(blocked).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(blocked);
    expect(blocked).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Up to two chosen')).toBeInTheDocument();
  });

  it('supports single selection with native radios and a hint', async () => {
    const onChange = vi.fn();
    render(
      <ChipGroup
        mode="single"
        legend="Setting"
        options={options}
        selected="a"
        onChange={onChange}
        hint="Pick one"
      />,
    );
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(screen.getByRole('radio', { name: 'Chip a' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Chip c' }));
    expect(onChange).toHaveBeenCalledWith('c');
    expect(screen.getByText('Pick one')).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    await expectNoViolations(<Multi max={3} />);
    await expectNoViolations(
      <ChipGroup
        mode="single"
        legend="Setting"
        options={options}
        selected="b"
        onChange={() => undefined}
      />,
    );
  });
});

describe('Tabs', () => {
  const tabs = [
    { id: 'one', label: 'Overview', number: 1 },
    { id: 'two', label: 'Ledger', number: 2 },
    { id: 'three', label: 'Timetable', number: 3 },
  ];
  function Demo() {
    const [active, setActive] = useState('one');
    return (
      <Tabs
        label="Plan sections"
        tabs={tabs}
        activeId={active}
        onChange={setActive}
        trailing={<Button variant="text">Ask</Button>}
      >
        <p>Panel {active}</p>
      </Tabs>
    );
  }

  it('exposes the tabs pattern with roving tabindex', () => {
    render(<Demo />);
    expect(screen.getByRole('tablist', { name: 'Plan sections' })).toBeInTheDocument();
    const [first, second] = screen.getAllByRole('tab');
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(first).toHaveAttribute('tabindex', '0');
    expect(second).toHaveAttribute('tabindex', '-1');
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', first?.id);
    expect(first).toHaveAttribute('aria-controls', panel.id);
  });

  it('navigates with arrows, Home and End, wrapping at the ends', async () => {
    render(<Demo />);
    const user = userEvent.setup();
    screen.getAllByRole('tab')[0]?.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Ledger');
    expect(screen.getByRole('tab', { selected: true })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Timetable');
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Overview');
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Timetable');
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Overview');
    await user.keyboard('{Tab}');
    expect(screen.getByRole('button', { name: 'Ask' })).toHaveFocus();
    await user.keyboard('{Tab}');
    expect(screen.getByRole('tabpanel')).toHaveFocus();
    expect(screen.getByText('Panel one')).toBeInTheDocument();
  });

  it('ignores other keys and changes the panel on click', async () => {
    render(<Demo />);
    await userEvent.click(screen.getByRole('tab', { name: /Ledger/ }));
    expect(screen.getByText('Panel two')).toBeInTheDocument();
    screen.getByRole('tab', { selected: true }).focus();
    await userEvent.keyboard('x');
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Ledger');
  });

  it('has no axe violations', async () => {
    await expectNoViolations(<Demo />);
  });
});

describe('Dialog', () => {
  it('opens, labels itself by its heading and closes via the Close button', async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Dialog open={false} onClose={onClose} title="Remove plan?">
        <p>Sure?</p>
      </Dialog>,
    );
    expect(document.querySelector('dialog')).not.toHaveAttribute('open');
    rerender(
      <Dialog open onClose={onClose} title="Remove plan?">
        <p>Sure?</p>
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Remove plan?' });
    expect(dialog).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
    rerender(
      <Dialog open={false} onClose={onClose} title="Remove plan?">
        <p>Sure?</p>
      </Dialog>,
    );
    expect(document.querySelector('dialog')).not.toHaveAttribute('open');
  });

  it('omits the Close button when the caller supplies its own actions, and supports sheets', () => {
    render(
      <Dialog open onClose={() => undefined} title="Letters" showClose={false} variant="sheet">
        <Button>Own action</Button>
      </Dialog>,
    );
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Own action' })).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    await expectNoViolations(
      <Dialog open onClose={() => undefined} title="Remove plan?">
        <p>Sure?</p>
      </Dialog>,
    );
  });
});

describe('ornaments', () => {
  it('Rule renders each motif as presentation only', async () => {
    for (const motif of Object.values(MOTIF_BY_TYPE)) {
      const { container, unmount } = render(<Rule motif={motif} />);
      expect(container.querySelector('[role="presentation"]')).toBeInTheDocument();
      expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
      unmount();
    }
    render(<Rule />);
    await expectNoViolations(<Rule motif="diya" />);
  });

  it('Stamp keeps its text real and supports tones, sizes and the fresh motion', async () => {
    render(
      <>
        <Stamp tone="peacock" size="lg" fresh>
          BOOKED
        </Stamp>
        <Stamp tilt={-8}>TO FIND</Stamp>
      </>,
    );
    expect(screen.getByText('BOOKED')).toBeInTheDocument();
    expect(screen.getByText('TO FIND')).toBeInTheDocument();
    await expectNoViolations(<Stamp tone="sindoor">TIGHT</Stamp>);
  });

  it('TypesetLoader shows a text label and decorative slugs', async () => {
    const { container } = render(<TypesetLoader label="Setting ideas in type…" />);
    expect(screen.getByText('Setting ideas in type…')).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
    await expectNoViolations(<TypesetLoader label="Setting ideas in type…" />);
  });
});

describe('Ticket and Postcard', () => {
  it('Ticket is an article labelled by its heading', async () => {
    const ui = (
      <Ticket id="caterer" title="Caterer" meta="Book by 3 Dec 2026" stamp={<Stamp>BOOKED</Stamp>}>
        <p>Added because you have 250 guests.</p>
      </Ticket>
    );
    render(ui);
    expect(screen.getByRole('article', { name: 'Caterer' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Caterer' })).toBeInTheDocument();
    await expectNoViolations(ui);
  });

  it('Ticket works without meta or stamp', () => {
    render(
      <Ticket id="x" title="Plain">
        <p>Body</p>
      </Ticket>,
    );
    expect(screen.getByRole('article', { name: 'Plain' })).toBeInTheDocument();
  });

  it('Postcard exposes the cost band as text and decorates the marks', async () => {
    const ui = (
      <Postcard
        id="idea-1"
        kicker="Theme"
        title="Marigold canopy"
        postage={<Postage band="₹₹" label="Cost: medium" initial="T" />}
        footer="Fits because: outdoor March ceremony"
        actions={<Button variant="text">Keep</Button>}
      >
        A canopy of marigolds.
      </Postcard>
    );
    const { container } = render(ui);
    expect(screen.getByRole('article', { name: 'Marigold canopy' })).toBeInTheDocument();
    expect(screen.getByText('Cost: medium')).toBeInTheDocument();
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(4);
    await expectNoViolations(ui);
  });

  it('Postcard renders without footer or actions', () => {
    render(
      <Postcard
        id="i"
        kicker="Food"
        title="Chaat"
        postage={<Postage band="₹" label="Cost: low" initial="F" />}
      >
        Tangy.
      </Postcard>,
    );
    expect(screen.getByText('Tangy.')).toBeInTheDocument();
  });
});

describe('LedgerTable', () => {
  const rows: LedgerRowView[] = [
    {
      id: 'venue',
      label: 'Venue',
      percent: 22,
      amount: '₹3,96,000',
      perGuest: '₹1,584',
      note: 'Hall hire',
    },
    {
      id: 'decor',
      label: 'Décor & flowers',
      percent: 12,
      amount: '₹2,16,000',
      perGuest: '₹864',
      note: 'Flowers',
    },
  ];
  const setup = () => {
    const onStep = vi.fn();
    const onSetPercent = vi.fn();
    render(
      <LedgerTable
        caption="Budget allocation, total ₹18,00,000"
        rows={rows}
        totalAmount="₹18,00,000"
        onStep={onStep}
        onSetPercent={onSetPercent}
      />,
    );
    return { onStep, onSetPercent };
  };

  it('is a real table with caption, scoped headers and named steppers', () => {
    setup();
    expect(
      screen.getByRole('table', { name: 'Budget allocation, total ₹18,00,000' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(5);
    expect(screen.getByRole('rowheader', { name: /Venue/ })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Increase Venue by 0.5 percent' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Decrease Venue by 0.5 percent' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Venue share in percent' })).toHaveValue(22);
    expect(screen.getByText('₹18,00,000')).toBeInTheDocument();
  });

  it('steps with the buttons and commits typed values on blur or Enter', async () => {
    const { onStep, onSetPercent } = setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Increase Venue by 0.5 percent' }));
    expect(onStep).toHaveBeenCalledWith('venue', 0.5);
    await user.click(screen.getByRole('button', { name: 'Decrease Venue by 0.5 percent' }));
    expect(onStep).toHaveBeenCalledWith('venue', -0.5);
    const input = screen.getByRole('spinbutton', { name: 'Venue share in percent' });
    await user.clear(input);
    await user.type(input, '25{Enter}');
    expect(onSetPercent).toHaveBeenCalledWith('venue', 25);
    await user.clear(input);
    await user.type(input, '30');
    await user.tab();
    expect(onSetPercent).toHaveBeenLastCalledWith('venue', 30);
  });

  it('ignores empty drafts', async () => {
    const { onSetPercent } = setup();
    const input = screen.getByRole('spinbutton', {
      name: 'Decor & flowers share in percent'.replace('Decor', 'Décor'),
    });
    await userEvent.clear(input);
    await userEvent.tab();
    expect(onSetPercent).not.toHaveBeenCalled();
  });

  it('has no axe violations', async () => {
    await expectNoViolations(
      <LedgerTable
        caption="Budget"
        rows={rows}
        totalAmount="₹1"
        onStep={() => undefined}
        onSetPercent={() => undefined}
      />,
    );
  });
});

describe('Telegram', () => {
  it('announces in mono caps and dismisses on the close button', async () => {
    const onDismiss = vi.fn();
    render(<Telegram message="Plan saved" onDismiss={onDismiss} />);
    expect(screen.getByRole('status')).toHaveTextContent('PLAN SAVED · STOP');
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss notice' }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('auto-dismisses after the timeout unless hovered or focused', () => {
    vi.useFakeTimers();
    try {
      const onDismiss = vi.fn();
      const { container } = render(
        <Telegram message="Saved" onDismiss={onDismiss} timeoutMs={1000} />,
      );
      const slip = container.firstElementChild as HTMLElement;
      act(() => {
        slip.dispatchEvent(new MouseEvent('mouseenter'));
      });
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(onDismiss).not.toHaveBeenCalled();
      act(() => {
        slip.dispatchEvent(new MouseEvent('mouseleave'));
      });
      act(() => {
        vi.advanceTimersByTime(1100);
      });
      expect(onDismiss).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it('pauses while a control inside has focus', () => {
    vi.useFakeTimers();
    try {
      const onDismiss = vi.fn();
      render(<Telegram message="Saved" onDismiss={onDismiss} timeoutMs={1000} />);
      act(() => {
        screen.getByRole('button').focus();
      });
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(onDismiss).not.toHaveBeenCalled();
      act(() => {
        screen.getByRole('button').blur();
      });
      act(() => {
        vi.advanceTimersByTime(1100);
      });
      expect(onDismiss).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it('has no axe violations', async () => {
    await expectNoViolations(<Telegram message="Saved" onDismiss={() => undefined} />);
  });
});

describe('preferences controls', () => {
  it('ThemeToggle reports and flips the theme', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<ThemeToggle theme="paper" onChange={onChange} />);
    const button = screen.getByRole('button', { name: 'Lamplight theme' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(button);
    expect(onChange).toHaveBeenCalledWith('lamplight');
    rerender(<ThemeToggle theme="lamplight" onChange={onChange} />);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(button);
    expect(onChange).toHaveBeenLastCalledWith('paper');
    await expectNoViolations(<ThemeToggle theme="paper" onChange={() => undefined} />);
  });

  it('TextSizeControl offers 100, 115 and 130 percent', async () => {
    const onChange = vi.fn();
    render(<TextSizeControl size={1} onChange={onChange} />);
    expect(screen.getByRole('group', { name: 'Text size' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '100 percent' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: '130 percent' }));
    expect(onChange).toHaveBeenCalledWith(1.3);
    await expectNoViolations(<TextSizeControl size={1.15} onChange={() => undefined} />);
  });
});

describe('SkipLink and ErrorBoundary', () => {
  it('SkipLink points at main and is the first tab stop', async () => {
    render(
      <>
        <SkipLink />
        <button type="button">Next</button>
        <main id="main" />
      </>,
    );
    await userEvent.tab();
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveFocus();
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
    await expectNoViolations(<SkipLink target="here" />);
  });

  it('ErrorBoundary shows the Misprint panel and recovers on Try again', async () => {
    let shouldThrow = true;
    const onError = vi.fn();
    const Bomb = () => {
      if (shouldThrow) {
        throw new Error('boom');
      }
      return <p>Recovered</p>;
    };
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary onError={onError}>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('This page came off the press smudged.');
    expect(onError).toHaveBeenCalled();
    shouldThrow = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Recovered')).toBeInTheDocument();
    quiet.mockRestore();
  });

  it('ErrorBoundary renders children untouched when nothing fails', () => {
    render(
      <ErrorBoundary>
        <p>Fine</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Fine')).toBeInTheDocument();
  });
});
