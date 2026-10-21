import { useState } from 'react';

import type { Plan } from '../../../../shared/schema/plan.js';
import { Button } from '../../../components/Button';
import { Field } from '../../../components/Field';
import { TypesetLoader } from '../../../components/TypesetLoader';
import { cx } from '../../../lib/cx';

import { ActionCard } from './ActionCard';
import styles from './PlannerPanel.module.css';
import type { Planner } from './usePlanner';

const MAX_QUESTION = 500;
const COUNT_FROM = 450;

interface Props {
  plan: Plan;
  planner: Planner;
}

/** "Letters to the Planner": correspondence, not chat. Suggestions arrive as slips to apply. */
export default function PlannerPanel({ plan, planner }: Props) {
  const [text, setText] = useState('');
  const remaining = MAX_QUESTION - text.length;

  const send = (event: React.SyntheticEvent): void => {
    event.preventDefault();
    const question = text.trim();
    if (question && !planner.busy) {
      planner.ask(question);
      setText('');
    }
  };

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Letters to the Planner</h2>
      {planner.exchanges.length === 0 ? (
        <p className={styles.empty}>
          Write a question about this plan, such as “We are short by a little, what should I cut?”.
        </p>
      ) : (
        <ol aria-label="Correspondence" className={styles.letters}>
          {planner.exchanges.map((exchange) => (
            <li key={exchange.id} className={styles.exchange}>
              <p className={styles.kicker}>You asked</p>
              <p className={styles.question}>{exchange.question}</p>
              <p className={styles.kicker}>The Planner replies</p>
              {exchange.pending ? (
                <TypesetLoader label="The Planner is writing…" />
              ) : (
                <>
                  <p className={styles.answer}>{exchange.answer}</p>
                  {exchange.actions.map((state, index) => (
                    <ActionCard
                      key={`${state.action.type}-${index.toString()}`}
                      state={state}
                      plan={plan}
                      onApply={() => {
                        planner.apply(exchange.id, index);
                      }}
                      onDismiss={() => {
                        planner.dismiss(exchange.id, index);
                      }}
                    />
                  ))}
                  <p className={cx(styles.source)}>
                    {exchange.source === 'gemini' ? 'Answered by Gemini' : 'Offline planner'}
                  </p>
                </>
              )}
            </li>
          ))}
        </ol>
      )}
      <form onSubmit={send} className={styles.form}>
        <Field
          label="Your question for the Planner"
          hint={
            remaining <= MAX_QUESTION - COUNT_FROM
              ? `${remaining.toString()} characters left`
              : undefined
          }
        >
          {(control) => (
            <textarea
              {...control}
              className={styles.notepaper}
              rows={3}
              maxLength={MAX_QUESTION}
              placeholder="Write to the Planner…"
              value={text}
              onChange={(event) => {
                setText(event.target.value);
              }}
            />
          )}
        </Field>
        <Button type="submit" variant="primary" disabled={planner.busy || text.trim() === ''}>
          Send
        </Button>
      </form>
      <p className={styles.caution}>
        For permits, allergies and crowd safety, confirm with the local authority or a professional.
      </p>
    </div>
  );
}
