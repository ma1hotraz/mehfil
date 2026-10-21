import type { ReactNode, Ref } from 'react';

import { eventLine, planTitle } from '../../../shared/labels.js';
import type { Plan, Verdict } from '../../../shared/schema/plan.js';
import { Stamp, type StampTone } from '../../components/Stamp';
import { VERDICT_LABELS, daysToGo } from '../../lib/format';

import styles from './Masthead.module.css';

const TONES: Record<Verdict, StampTone> = {
  comfortable: 'peacock',
  workable: 'ink',
  tight: 'umber',
  unrealistic: 'sindoor',
};

interface Props {
  plan: Plan;
  today: string;
  headingRef: Ref<HTMLHeadingElement>;
  actions: ReactNode;
}

/** The plan's masthead strip: title, mono event line, countdown numeral and verdict stamp. */
export function Masthead({ plan, today, headingRef, actions }: Props) {
  const days = daysToGo(today, plan.brief.date);
  return (
    <header className={styles.masthead}>
      <div className={styles.titles}>
        <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
          {planTitle(plan.brief)}
        </h1>
        <p className={styles.line}>{eventLine(plan.brief)}</p>
        <div className={styles.actions}>{actions}</div>
      </div>
      <div className={styles.figures}>
        <p className={styles.countdown}>
          <span className={styles.numeral}>{days}</span>
          <span className="smallcaps"> {days === 1 ? 'day' : 'days'} to go</span>
        </p>
        <Stamp tone={TONES[plan.feasibility.verdict]} size="lg">
          {VERDICT_LABELS[plan.feasibility.verdict].toUpperCase()}
        </Stamp>
      </div>
    </header>
  );
}
