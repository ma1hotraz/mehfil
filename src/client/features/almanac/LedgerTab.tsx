import type { Plan } from '../../../shared/schema/plan.js';
import { Button } from '../../components/Button';
import { LedgerTable } from '../../components/LedgerTable';
import { Section } from '../../components/Section';
import { cx } from '../../lib/cx';
import { money } from '../../lib/format';
import { parseAmount } from '../../lib/draft';
import type { PlansApi } from '../../lib/usePlans';
import { perGuestMinor } from '../../../shared/engine/money.js';

import styles from './almanac.module.css';
import own from './LedgerTab.module.css';

interface Props {
  plan: Plan;
  api: PlansApi;
}

/** §2 The Ledger: editable shares that rebalance the rest, plus optional spent-so-far tracking. */
export default function LedgerTab({ plan, api }: Props) {
  const { brief, ledger } = plan;
  const total = ledger.reduce((sum, line) => sum + line.amountMinor, 0);
  const rows = ledger.map((line) => ({
    id: line.id,
    label: line.label,
    percent: line.percent,
    amount: money(line.amountMinor, brief.currency),
    perGuest: money(perGuestMinor(line.amountMinor, brief.guestCount), brief.currency),
    note: line.note,
  }));
  const weather = plan.insights.filter((i) => ['R01', 'R02', 'R03'].includes(i.ruleId));

  return (
    <Section
      number={2}
      title="The Ledger"
      margin={
        <>
          <p>Change any share; the others give or take in proportion, and the total never moves.</p>
          {weather.map((insight) => (
            <p key={insight.id}>{insight.detail}</p>
          ))}
        </>
      }
      actions={
        <Button variant="text" onClick={api.resetLedger}>
          Reset to recommended
        </Button>
      }
    >
      <LedgerTable
        caption={`Budget allocation, total ${money(total, brief.currency)}`}
        rows={rows}
        totalAmount={money(total, brief.currency)}
        onStep={(id, delta) => {
          api.step(id, delta);
        }}
        onSetPercent={(id, percent) => {
          api.setPercent(id, percent);
        }}
      />
      <details className={own.track}>
        <summary>Track what you have committed</summary>
        <p className={styles.muted}>
          Optional. Enter what you have agreed to pay so far for each line; the remainder is worked
          out for you.
        </p>
        <ul className={cx(styles.plain, own.lines)}>
          {ledger.map((line) => {
            const committed = line.committedMinor ?? 0;
            return (
              <li key={line.id}>
                <label>
                  <span>
                    {line.label} committed ({brief.currency})
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    defaultValue={
                      line.committedMinor === undefined ? '' : String(line.committedMinor / 100)
                    }
                    onBlur={(event) => {
                      const value = parseAmount(event.target.value);
                      api.setCommitted(
                        line.id,
                        value === undefined ? undefined : Math.round(value * 100),
                      );
                    }}
                  />
                </label>
                <span className={cx(styles.mono, own.remaining)}>
                  {money(line.amountMinor - committed, brief.currency)} remaining
                </span>
              </li>
            );
          })}
        </ul>
      </details>
    </Section>
  );
}
