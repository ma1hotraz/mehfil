import { CATEGORY_LABELS } from '../../../shared/engine/data/allocations.js';
import { PHASE_LABELS } from '../../../shared/engine/timeline.js';
import { eventLine, planTitle } from '../../../shared/labels.js';
import type { Plan } from '../../../shared/schema/plan.js';
import { STATUS_LABELS, formatLongDate, money } from '../../lib/format';

import styles from './PrintSheet.module.css';

/**
 * Print-only copy of the whole plan as plain, paper-friendly tables. It is hidden on screen and
 * shown by print.css, so printing works from any tab (docs/06 §8).
 */
export function PrintSheet({ plan }: { plan: Plan }) {
  const { brief } = plan;
  return (
    <div className={styles.sheet} data-print="show" aria-hidden="true">
      <h1>{planTitle(brief)}</h1>
      <p>{eventLine(brief)}</p>
      <p>{plan.feasibility.reason}</p>

      <h2>Ledger</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Share</th>
            <th scope="col">Amount</th>
          </tr>
        </thead>
        <tbody>
          {plan.ledger.map((line) => (
            <tr key={line.id}>
              <th scope="row">{CATEGORY_LABELS[line.id]}</th>
              <td>{line.percent.toFixed(1)}%</td>
              <td>{money(line.amountMinor, brief.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Timetable</h2>
      <ul>
        {plan.timeline.map((m) => (
          <li key={m.id}>
            {formatLongDate(m.dueDate)} — {m.title} ({PHASE_LABELS[m.phase]})
            {m.done ? ' — done' : ''}
          </li>
        ))}
      </ul>

      <h2>Vendors</h2>
      <ul>
        {plan.vendors.map((v) => (
          <li key={v.id}>
            {v.label} — {STATUS_LABELS[v.status]}, book by {formatLongDate(v.bookByDate)}
          </li>
        ))}
      </ul>

      <div data-print="page-break">
        <h2>Run sheet</h2>
        <table>
          <tbody>
            {plan.runSheet.map((slot) => (
              <tr key={slot.id}>
                <th scope="row">{slot.time}</th>
                <td>{slot.title}</td>
                <td>{slot.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
