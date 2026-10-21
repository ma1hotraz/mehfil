import { useRef, useState, type Ref } from 'react';

import { dayOfYear, formatLongDate } from '../../../shared/engine/dates.js';
import { planTitle } from '../../../shared/labels.js';
import type { Plan } from '../../../shared/schema/plan.js';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { Rule } from '../../components/Rule';
import { type Sample } from '../../lib/samples';

import styles from './FrontPage.module.css';
import { Shelf } from './Shelf';

const CONTENTS = [
  ['The Invitation', 1],
  ['The Ledger', 2],
  ['The Timetable', 3],
  ['The Vendors', 4],
  ['The Ideas', 5],
  ['The Run Sheet', 6],
] as const;

interface FrontPageProps {
  today: string;
  plans: readonly Plan[];
  samples: readonly Sample[];
  discarded: number;
  headingRef: Ref<HTMLHeadingElement>;
  onBegin: () => void;
  onSample: (sample: Sample) => void;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
}

/** The almanac's front page: masthead, contents, samples and the shelf of saved plans. */
export function FrontPage({
  today,
  plans,
  samples,
  discarded,
  headingRef,
  onBegin,
  onSample,
  onOpen,
  onRemove,
}: FrontPageProps) {
  const [pending, setPending] = useState<Plan | undefined>(undefined);
  const beginRef = useRef<HTMLButtonElement>(null);
  const shelfRef = useRef<HTMLUListElement>(null);

  const confirmRemove = (): void => {
    if (!pending) {
      return;
    }
    const index = plans.findIndex((p) => p.id === pending.id);
    onRemove(pending.id);
    setPending(undefined);
    // Focus the item that takes its place, or the primary action when the shelf is empty.
    requestAnimationFrame(() => {
      const buttons = shelfRef.current?.querySelectorAll<HTMLButtonElement>('[data-open]');
      (buttons?.[Math.min(index, (buttons.length || 1) - 1)] ?? beginRef.current)?.focus();
    });
  };

  return (
    <div className={styles.page}>
      <header className={styles.masthead}>
        <h1 ref={headingRef} tabIndex={-1} className={styles.name}>
          Mehfil
        </h1>
        <p className={styles.dateline}>
          VOL. I · NO. {dayOfYear(today)} · {formatLongDate(today).toUpperCase()} · A PLANNING
          ALMANAC FOR THE DAYS WORTH REMEMBERING
        </p>
      </header>

      <div className={styles.lead}>
        <div>
          <p className={styles.dropcap}>
            Mehfil turns one sentence about your wedding, birthday or community event into a budget
            ledger, a countdown timetable, a vendor checklist, personalised ideas and a day-of run
            sheet. The money and the dates come from fixed rules you can read. The ideas are drafted
            by Gemini, and an assistant answers questions about your plan.
          </p>
          <p>
            Everything is kept on this device. Nothing is sent anywhere except a short description
            of the event, when ideas are drafted.
          </p>
          <Button ref={beginRef} variant="primary" icon="arrow" onClick={onBegin}>
            Begin a plan
          </Button>
        </div>
        <section aria-labelledby="contents-title" className={styles.contents}>
          <h2 id="contents-title" className={styles.kicker}>
            Contents
          </h2>
          <ol className={styles.toc}>
            {CONTENTS.map(([name, page]) => (
              <li key={name}>
                <span>
                  § {page} {name}
                </span>
                <span className={styles.leader} aria-hidden="true" />
                <span className="figures">{page * 4 - 3}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section aria-labelledby="samples-title" className={styles.samples}>
        <h2 id="samples-title" className={styles.kicker}>
          Or try a sample
        </h2>
        <ul className={styles.slips}>
          {samples.map((sample) => (
            <li key={sample.id}>
              <button
                type="button"
                className={styles.slip}
                onClick={() => {
                  onSample(sample);
                }}
              >
                {sample.label}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <Rule motif="marigold" />

      <section aria-labelledby="shelf-title">
        <h2 id="shelf-title" className={styles.kicker}>
          Your shelf
        </h2>
        {discarded > 0 ? (
          <p role="status" className={styles.notice}>
            {discarded === 1 ? 'One saved plan' : `${discarded.toString()} saved plans`} could not
            be read and was set aside.
          </p>
        ) : null}
        <Shelf
          ref={shelfRef}
          plans={plans}
          today={today}
          onOpen={onOpen}
          onAskRemove={setPending}
        />
      </section>

      <Dialog
        open={pending !== undefined}
        onClose={() => {
          setPending(undefined);
        }}
        title="Remove this plan?"
        showClose={false}
      >
        <p>
          {pending ? `“${planTitle(pending.brief)}”` : ''} will be removed from this device. This
          cannot be undone.
        </p>
        <div className={styles.dialogActions}>
          <Button variant="primary" onClick={confirmRemove}>
            Remove plan
          </Button>
          <Button
            variant="text"
            onClick={() => {
              setPending(undefined);
            }}
          >
            Keep it
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
