import { useState } from 'react';

import { diffDays } from '../../../shared/engine/dates.js';
import type { Plan } from '../../../shared/schema/plan.js';
import { Button } from '../../components/Button';
import { Section } from '../../components/Section';
import { cx } from '../../lib/cx';
import { formatLongDate, money, offsetFromEvent, tMinus } from '../../lib/format';

import styles from './almanac.module.css';
import own from './OverviewTab.module.css';

const SEVERITY_WORDS = {
  critical: 'Critical',
  warning: 'Warning',
  advice: 'Advice',
  info: 'Info',
} as const;
const SHOWN = 6;
const MONTH_DAYS = 30;

interface Props {
  plan: Plan;
  today: string;
  onCopy: () => void;
}

/** Overview: verdict marginalia, numbered notices, key figures and the next three deadlines. */
export default function OverviewTab({ plan, today, onCopy }: Props) {
  const [all, setAll] = useState(false);
  const { brief, feasibility } = plan;
  const notices = all ? plan.insights : plan.insights.slice(0, SHOWN);
  const open = plan.timeline.filter((m) => !m.done && m.idealOffsetDays >= 0);
  const dueSoon = open.filter((m) => {
    const days = diffDays(today, m.dueDate);
    return days >= 0 && days <= MONTH_DAYS;
  });
  const contingency = plan.ledger.find((l) => l.id === 'contingency');

  return (
    <Section
      number={1}
      title="Overview"
      margin={
        <>
          <p>{feasibility.reason}</p>
          <p>The benchmark is indicative; local prices vary.</p>
        </>
      }
      actions={
        <Button variant="text" icon="download" onClick={onCopy}>
          Copy plan as text
        </Button>
      }
    >
      <div className={styles.stack}>
        <section aria-labelledby="notices-title">
          <h3 id="notices-title" className={styles.subhead}>
            Notices
          </h3>
          <ol className={cx(styles.plain, own.notices)}>
            {notices.map((insight) => (
              <li key={insight.id} className={own.notice}>
                <p
                  className={cx(
                    styles.kicker,
                    insight.severity === 'critical' || insight.severity === 'warning'
                      ? own.alert
                      : styles.muted,
                  )}
                >
                  {SEVERITY_WORDS[insight.severity]} ·{' '}
                  <span className={styles.mono}>{insight.ruleId}</span>
                </p>
                <p className={own.headline}>{insight.title}</p>
                <p>{insight.detail}</p>
              </li>
            ))}
          </ol>
          {plan.insights.length > SHOWN ? (
            <Button
              variant="text"
              aria-expanded={all}
              onClick={() => {
                setAll((current) => !current);
              }}
            >
              {all ? 'Show fewer notices' : `Show all ${plan.insights.length.toString()} notices`}
            </Button>
          ) : null}
        </section>

        <section aria-labelledby="figures-title">
          <h3 id="figures-title" className="srOnly">
            Key figures
          </h3>
          <dl className={own.figures}>
            <div>
              <dt className={cx(styles.kicker, styles.muted)}>per guest</dt>
              <dd className={cx(own.big, 'figures')}>
                {money(feasibility.perGuestMinor, brief.currency)}
              </dd>
            </div>
            <div>
              <dt className={cx(styles.kicker, styles.muted)}>contingency</dt>
              <dd className={cx(own.big, 'figures')}>
                {money(contingency?.amountMinor ?? 0, brief.currency)}
              </dd>
            </div>
            <div>
              <dt className={cx(styles.kicker, styles.muted)}>
                {dueSoon.length === 1 ? 'task' : 'tasks'} due this month
              </dt>
              <dd className={cx(own.big, 'figures')}>{dueSoon.length}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="deadlines-title">
          <h3 id="deadlines-title" className={styles.subhead}>
            Next three deadlines
          </h3>
          {open.length === 0 ? (
            <p className={styles.muted}>Every task is ticked off.</p>
          ) : (
            <ol className={cx(styles.plain, own.deadlines)}>
              {open.slice(0, 3).map((m) => (
                <li key={m.id}>
                  <time dateTime={m.dueDate} className={styles.mono}>
                    {formatLongDate(m.dueDate)}
                  </time>
                  <span aria-hidden="true" className={cx(styles.mono, m.critical && own.alert)}>
                    {tMinus(offsetFromEvent(brief.date, m.dueDate))}
                  </span>
                  <span>{m.title}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </Section>
  );
}
