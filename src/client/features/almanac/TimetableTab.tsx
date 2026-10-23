import type { Plan } from '../../../shared/schema/plan.js';
import { Button } from '../../components/Button';
import { Section } from '../../components/Section';
import { cx } from '../../lib/cx';
import { buildTimetableViewModel, type TimetableTaskView } from '../../lib/almanacViewModels';

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
  task,
  onToggle,
}: {
  task: TimetableTaskView;
  onToggle: (id: string) => void;
}) {
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
          <span className="srOnly">{task.spokenDue}</span>
          <time dateTime={task.dueDate} className={styles.mono} aria-hidden="true">
            {task.dueDateFormatted}
          </time>
          <span aria-hidden="true" className={cx(styles.mono, task.critical && own.critical)}>
            {task.tMinusText}
          </span>
          <span className={cx(styles.kicker, styles.muted)}>{task.categoryLabel}</span>
          {task.critical ? <span className={cx(styles.kicker, own.critical)}>Critical</span> : null}
          {task.rushed ? <span className={cx(styles.tag, styles.rushed)}>Rushed</span> : null}
          {task.overdue ? <span className={cx(styles.tag, styles.overdue)}>Overdue</span> : null}
        </p>
      </div>
    </li>
  );
}

/** §3 The Timetable: a railway departures board printed on paper, grouped by phase. */
export default function TimetableTab({ plan, today, onToggle, onExport, onPrint }: Props) {
  const { openCount, totalCount, phases } = buildTimetableViewModel(plan, today);
  return (
    <Section
      number={3}
      title="The Timetable"
      margin={
        <>
          <p>
            {openCount} of {totalCount} tasks still to do.
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
        {phases.map((group) => (
          <section key={group.phase} aria-labelledby={`phase-${group.phase}`}>
            <h3 id={`phase-${group.phase}`} className={own.platform}>
              {group.label}
            </h3>
            <ol className={cx(styles.plain, own.rail)}>
              {group.tasks.map((task) => (
                <Row key={task.id} task={task} onToggle={onToggle} />
              ))}
            </ol>
          </section>
        ))}
      </div>
    </Section>
  );
}
