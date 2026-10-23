import type { Plan } from '../../../shared/schema/plan.js';
import { Button } from '../../components/Button';
import { LedgerTable } from '../../components/LedgerTable';
import { Section } from '../../components/Section';
import { cx } from '../../lib/cx';
import type { PlansApi } from '../../lib/usePlans';
import { buildLedgerViewModel, toCommittedMinor } from '../../lib/almanacViewModels';

import styles from './almanac.module.css';
import own from './LedgerTab.module.css';

interface Props {
  plan: Plan;
  api: PlansApi;
}

/** §2 The Ledger: editable shares that rebalance the rest, plus optional spent-so-far tracking. */
export default function LedgerTab({ plan, api }: Props) {
  const { brief } = plan;
  const { totalFormatted, rows, committedLines, weather } = buildLedgerViewModel(plan);

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
        caption={`Budget allocation, total ${totalFormatted}`}
        rows={rows}
        totalAmount={totalFormatted}
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
          {committedLines.map((line) => (
            <li key={line.id}>
              <label>
                <span>
                  {line.label} committed ({brief.currency})
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  defaultValue={line.defaultValue}
                  onBlur={(event) => {
                    api.setCommitted(line.id, toCommittedMinor(event.target.value));
                  }}
                />
              </label>
              <span className={cx(styles.mono, own.remaining)}>{line.remainingFormatted}</span>
            </li>
          ))}
        </ul>
      </details>
    </Section>
  );
}
