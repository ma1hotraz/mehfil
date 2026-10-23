import { type SyntheticEvent, useRef, useState, type Ref } from 'react';

import { addDays } from '../../../shared/engine/dates.js';
import { MAX_LEAD_DAYS, type EventBrief } from '../../../shared/schema/brief.js';
import { Button } from '../../components/Button';
import {
  type FieldKey,
  type IntakeDraft,
  parseDraft,
} from '../../lib/draft';
import { useIntakeValidation } from '../../lib/useIntakeValidation';

import { InvitationSentence, fieldId } from './InvitationSentence';
import styles from './IntakeView.module.css';
import { Margins } from './Margins';

interface IntakeViewProps {
  initial: IntakeDraft;
  today: string;
  editing: boolean;
  headingRef: Ref<HTMLHeadingElement>;
  onSubmit: (brief: EventBrief) => void;
  onBack: () => void;
}

const FIELD_NAMES: Record<FieldKey, string> = {
  eventType: 'Event type',
  subType: 'Kind of event',
  guestCount: 'Number of guests',
  city: 'City',
  date: 'Event date',
  setting: 'Setting',
  budget: 'Total budget',
  currency: 'Currency',
  title: 'Title of the event',
  vibe: 'Vibe',
  dietary: 'Dietary needs',
  accessibility: 'Guest accessibility',
  traditions: 'Traditions to honour',
  mustHaves: 'Must-haves',
};

/** §1 The Invitation: the sentence, the margins and an error summary that links to each problem. */
export function IntakeView({
  initial,
  today,
  editing,
  headingRef,
  onSubmit,
  onBack,
}: IntakeViewProps) {
  const [draft, setDraft] = useState<IntakeDraft>(initial);
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const { all, visible, summary } = useIntakeValidation(draft, today, touched, submitted);

  const handleSubmit = (event: SyntheticEvent): void => {
    event.preventDefault();
    const result = parseDraft(draft, today);
    if (result.ok) {
      onSubmit(result.value);
      return;
    }
    setSubmitted(true);
    requestAnimationFrame(() => summaryRef.current?.focus());
  };

  const focusField =
    (key: FieldKey) =>
    (event: React.MouseEvent): void => {
      event.preventDefault();
      document.getElementById(fieldId(key))?.focus();
    };

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className={styles.form}
      aria-labelledby="intake-heading"
    >
      <h1 id="intake-heading" ref={headingRef} tabIndex={-1} className={styles.title}>
        <span aria-hidden="true">§ 1 </span>
        The Invitation
      </h1>
      <p className={styles.lede}>
        {editing
          ? 'Change any blank. Ticked tasks, vendor statuses and your own budget shares are kept where they still apply.'
          : 'Fill in the blanks. Your plan is set in type on this device, instantly.'}
      </p>

      {summary.length > 0 ? (
        <div ref={summaryRef} tabIndex={-1} role="alert" className={styles.summary}>
          <h2 className={styles.summaryTitle}>Check these before setting it in type</h2>
          <ul>
            {summary.map((key) => (
              <li key={key}>
                <a href={`#${fieldId(key)}`} onClick={focusField(key)}>
                  {FIELD_NAMES[key]}
                </a>
                : {all[key]}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <InvitationSentence
        draft={draft}
        errors={visible}
        minDate={today}
        maxDate={addDays(today, MAX_LEAD_DAYS)}
        onChange={(patch) => {
          setDraft((current) => ({ ...current, ...patch }));
        }}
        onBlurField={(key) => {
          setTouched((current) => new Set(current).add(key));
        }}
      />
      <Margins
        draft={draft}
        errors={visible}
        onChange={(patch) => {
          setDraft((current) => ({ ...current, ...patch }));
        }}
      />

      <div className={styles.actions}>
        <Button type="submit" variant="primary" icon="arrow">
          Set it in type
        </Button>
        <Button variant="text" onClick={onBack}>
          Back
        </Button>
      </div>
    </form>
  );
}
