import { type CSSProperties, useState } from 'react';

import type { CategoryId } from '../../shared/schema/plan.js';
import { cx } from '../lib/cx';

import { Icon } from './Icon';
import styles from './LedgerTable.module.css';

export interface LedgerRowView {
  id: CategoryId;
  label: string;
  percent: number;
  amount: string;
  perGuest: string;
  note: string;
}

interface LedgerTableProps {
  caption: string;
  rows: readonly LedgerRowView[];
  totalAmount: string;
  /** Percentage points per stepper click. */
  step?: number;
  onStep: (id: CategoryId, delta: number) => void;
  onSetPercent: (id: CategoryId, percent: number) => void;
}

const formatPercent = (value: number): string => value.toFixed(1);

function ShareEditor({
  row,
  step,
  onStep,
  onSetPercent,
}: { row: LedgerRowView; step: number } & Pick<LedgerTableProps, 'onStep' | 'onSetPercent'>) {
  const [draft, setDraft] = useState<string | undefined>(undefined);
  const commit = (): void => {
    const value = Number(draft);
    if (draft !== undefined && draft.trim() !== '' && Number.isFinite(value)) {
      onSetPercent(row.id, value);
    }
    setDraft(undefined);
  };
  return (
    <div className={styles.editor}>
      <button
        type="button"
        className={styles.stepper}
        aria-label={`Decrease ${row.label} by ${step} percent`}
        onClick={() => {
          onStep(row.id, -step);
        }}
      >
        <Icon name="minus" size={14} />
      </button>
      <input
        className={cx(styles.percent, 'figures')}
        type="number"
        inputMode="decimal"
        min={0}
        max={90}
        step={step}
        aria-label={`${row.label} share in percent`}
        value={draft ?? formatPercent(row.percent)}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            commit();
          }
        }}
      />
      <button
        type="button"
        className={styles.stepper}
        aria-label={`Increase ${row.label} by ${step} percent`}
        onClick={() => {
          onStep(row.id, step);
        }}
      >
        <Icon name="plus" size={14} />
      </button>
    </div>
  );
}

/** The printed ledger: a real table with tally bars (always paired with the printed percent). */
export function LedgerTable({
  caption,
  rows,
  totalAmount,
  step = 0.5,
  onStep,
  onSetPercent,
}: LedgerTableProps) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <caption className={styles.caption}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Share</th>
            <th scope="col" className={styles.num}>
              Amount
            </th>
            <th scope="col" className={styles.num}>
              Per guest
            </th>
            <th scope="col">Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row" className={styles.category}>
                <span>{row.label}</span>
                <span
                  className={styles.tally}
                  aria-hidden="true"
                  style={{ '--share': `${row.percent}%` } as CSSProperties}
                />
              </th>
              <td>
                <ShareEditor row={row} step={step} onStep={onStep} onSetPercent={onSetPercent} />
              </td>
              <td className={cx(styles.num, 'figures')}>{row.amount}</td>
              <td className={cx(styles.num, 'figures')}>{row.perGuest}</td>
              <td className={styles.note}>{row.note}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={styles.total}>
            <th scope="row">Total</th>
            <td className="figures">100.0%</td>
            <td className={cx(styles.num, 'figures')}>{totalAmount}</td>
            <td />
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
