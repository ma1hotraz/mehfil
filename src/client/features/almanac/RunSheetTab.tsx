import { MOTIF_BY_TYPE, Rule } from '../../components/Rule';
import { Button } from '../../components/Button';
import { Section } from '../../components/Section';
import { cx } from '../../lib/cx';
import type { Plan } from '../../../shared/schema/plan.js';

import styles from './almanac.module.css';
import own from './RunSheetTab.module.css';

/** §6 The Run Sheet: the day-of order of ceremony, with an owner for each moment. */
export default function RunSheetTab({ plan, onPrint }: { plan: Plan; onPrint: () => void }) {
  return (
    <Section
      number={6}
      title="The Run Sheet"
      margin={
        <p>Share this with everyone who has a role on the day. Times are a starting point.</p>
      }
      actions={
        <Button variant="text" icon="print" onClick={onPrint}>
          Print run sheet
        </Button>
      }
    >
      <Rule motif={MOTIF_BY_TYPE[plan.brief.eventType]} />
      <ol className={cx(styles.plain, own.order)}>
        {plan.runSheet.map((slot) => (
          <li key={slot.id} className={own.slot}>
            <span className={cx(own.time, 'figures')}>{slot.time}</span>
            <span className={own.leader} aria-hidden="true" />
            <span className={own.what}>
              <span className={own.title}>{slot.title}</span>
              <span className={cx(styles.kicker, styles.muted)}>{slot.owner}</span>
              {slot.note ? <span className={own.note}>{slot.note}</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </Section>
  );
}
