import type { Ref } from 'react';

import { planTitle } from '../../../shared/labels.js';
import type { Plan } from '../../../shared/schema/plan.js';
import { Button } from '../../components/Button';
import { cx } from '../../lib/cx';
import { daysToGo, plural } from '../../lib/format';

import styles from './Shelf.module.css';

interface ShelfProps {
  plans: readonly Plan[];
  today: string;
  ref?: Ref<HTMLUListElement>;
  onOpen: (id: string) => void;
  onAskRemove: (plan: Plan) => void;
}

const BAND: Record<Plan['brief']['eventType'], string> = {
  wedding: styles.wedding ?? '',
  birthday: styles.birthday ?? '',
  community: styles.community ?? '',
};

/** Saved plans as book spines (a list on small screens). Newest first. */
export function Shelf({ plans, today, ref, onOpen, onAskRemove }: ShelfProps) {
  if (plans.length === 0) {
    return (
      <p className={styles.empty}>Nothing on the shelf yet. Your first plan will live here.</p>
    );
  }
  const ordered = [...plans].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <ul ref={ref} className={styles.shelf}>
      {ordered.map((plan) => {
        const days = daysToGo(today, plan.brief.date);
        const title = planTitle(plan.brief);
        return (
          <li key={plan.id} className={styles.item}>
            <button
              type="button"
              data-open
              className={cx(styles.spine, BAND[plan.brief.eventType])}
              onClick={() => {
                onOpen(plan.id);
              }}
            >
              <span className="srOnly">
                Open {title}, {plan.brief.eventType}, {plural(days, 'day')} to go
              </span>
              <span aria-hidden="true" className={styles.spineTitle}>
                {title}
              </span>
              <span aria-hidden="true" className={cx(styles.days, 'figures')}>
                {days}d
              </span>
            </button>
            <Button
              variant="text"
              aria-label={`Remove ${title}`}
              onClick={() => {
                onAskRemove(plan);
              }}
            >
              Remove
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
