import { PHASES, type Milestone, type Plan } from '../../../shared/schema/plan.js';
import { PHASE_LABELS } from '../../../shared/engine/timeline.js';
import { Button } from '../../components/Button';
import { Section } from '../../components/Section';
import { cx } from '../../lib/cx';
import { formatLongDate, offsetFromEvent, tMinus, tMinusSpoken } from '../../lib/format';
import { CATEGORY_LABELS } from '../../../shared/engine/data/allocations.js';

import styles from './almanac.module.css';
import own from './TimetableTab.module.css';

interface Props {
  plan: Plan;
  today: string;
  onToggle: (id: string) => void;
  onExport: () => void;
  onPrint: () => void;
}

function Row({
  plan,
  task,
  today,
  onToggle,
}: {
  plan: Plan;
  task: Milestone;
  today: string;
  onToggle: (id: string) => void;
}) {
  const offset = offsetFromEvent(plan.brief.date, task.dueDate);
  const overdue = !task.done && task.idealOffsetDays >= 0 && task.dueDate < today;
  const inputId = `task-${task.id}`;
  const noteId = `${inputId}-note`;
  return (
    <li className={cx(own.row, task.done && own.done)}>
      <span className={own.stop} aria-hidden="true" />
      <input
        id={inputId}
        type="checkbox"
        className={own.check}
        checked={task.done}
        aria-describedby={noteId}
        onChange={() => {
          onToggle(task.id);
        }}
      />
      <div className={own.body}>
        <label htmlFor={inputId} className={own.title}>
          {task.title}
        </label>
        <p id={noteId} className={own.meta}>
          <span className="srOnly">
            Due {formatLongDate(task.dueDate)}, {tMinusSpoken(offset)}.
          </span>
          <time dateTime={task.dueDate} className={styles.mono} aria-hidden="true">
            {formatLongDate(task.dueDate)}
          </time>
          <span aria-hidden="true" className={cx(styles.mono, task.critical && own.critical)}>
            {tMinus(offset)}
          </span>
          <span className={cx(styles.kicker, styles.muted)}>
            {task.category === 'general' ? 'General' : CATEGORY_LABELS[task.category]}
          </span>
          {task.critical ? <span className={cx(styles.kicker, own.critical)}>Critical</span> : null}
          {task.rushed && !task.done ? (
            <span className={cx(styles.tag, styles.rushed)}>Rushed</span>
          ) : null}
          {overdue ? <span className={cx(styles.tag, styles.overdue)}>Overdue</span> : null}
        </p>
      </div>
    </li>
  );
}

/** §3 The Timetable: a railway departures board printed on paper, grouped by phase. */
export default function TimetableTab({ plan, today, onToggle, onExport, onPrint }: Props) {
  const open = plan.timeline.filter((m) => !m.done).length;
  return (
    <Section
      number={3}
      title="The Timetable"
      margin={
        <>
          <p>
            {open} of {plan.timeline.length} tasks still to do.
          </p>
          <p>Where time is short, due dates are squeezed and marked rushed.</p>
        </>
      }
      actions={
        <>
          <Button variant="text" icon="calendar" onClick={onExport}>
            Add to calendar (.ics)
          </Button>
          <Button variant="text" icon="print" onClick={onPrint}>
            Print
          </Button>
        </>
      }
    >
      <div className={own.board}>
        {PHASES.map((phase) => {
          const tasks = plan.timeline.filter((m) => m.phase === phase);
          return tasks.length === 0 ? null : (
            <section key={phase} aria-labelledby={`phase-${phase}`}>
              <h3 id={`phase-${phase}`} className={own.platform}>
                {PHASE_LABELS[phase]}
              </h3>
              <ol className={cx(styles.plain, own.rail)}>
                {tasks.map((task) => (
                  <Row key={task.id} plan={plan} task={task} today={today} onToggle={onToggle} />
                ))}
              </ol>
            </section>
          );
        })}
      </div>
    </Section>
  );
}
