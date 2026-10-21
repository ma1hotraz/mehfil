import { useEffect, useRef } from 'react';

import type { Plan } from '../../../../shared/schema/plan.js';
import { Button } from '../../../components/Button';

import styles from './PlannerPanel.module.css';
import { describeAction } from './describeAction';
import type { ActionState } from './usePlanner';

interface Props {
  state: ActionState;
  plan: Plan;
  onApply: () => void;
  onDismiss: () => void;
}

/** A suggestion slip: raised paper, dashed border, with Apply and Not now. Nothing changes until Apply. */
export function ActionCard({ state, plan, onApply, onDismiss }: Props) {
  const slip = useRef<HTMLElement>(null);
  const settled = state.status === 'applied' || state.status === 'failed';
  const words = describeAction(state.action, plan);

  // After Apply the buttons vanish; keep focus on the slip so keyboard users are not dropped.
  useEffect(() => {
    if (settled) {
      slip.current?.focus();
    }
  }, [settled]);

  if (state.status === 'dismissed') {
    return null;
  }
  return (
    <article ref={slip} tabIndex={-1} className={styles.slip} aria-label={words}>
      {settled ? (
        <p className={styles.result}>{state.message}</p>
      ) : (
        <>
          <p className={styles.slipText}>{words}</p>
          <p className={styles.rationale}>{state.action.rationale}</p>
          <div className={styles.slipActions}>
            <Button variant="primary" aria-label={`Apply: ${words}`} onClick={onApply}>
              Apply
            </Button>
            <Button variant="text" aria-label={`Not now: ${words}`} onClick={onDismiss}>
              Not now
            </Button>
          </div>
        </>
      )}
    </article>
  );
}
