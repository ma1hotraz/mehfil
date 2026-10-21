import { SUB_TYPES, type EventType } from '../../../shared/schema/brief.js';
import { SUB_TYPE_LABELS } from '../../../shared/labels.js';
import { Field } from '../../components/Field';
import { type FieldErrors, type IntakeDraft, subTypeFor } from '../../lib/draft';

import styles from './InvitationSentence.module.css';

export const fieldId = (key: string): string => `intake-${key}`;

interface Props {
  draft: IntakeDraft;
  errors: FieldErrors;
  minDate: string;
  maxDate: string;
  onChange: (patch: Partial<IntakeDraft>) => void;
  onBlurField: (key: keyof IntakeDraft) => void;
}

const EVENT_OPTIONS: readonly [EventType, string][] = [
  ['wedding', 'wedding'],
  ['birthday', 'birthday'],
  ['community', 'community event'],
];
const SETTING_OPTIONS = [
  ['indoor', 'indoors'],
  ['outdoor', 'outdoors'],
  ['mixed', 'part indoors, part outdoors'],
] as const;
const CURRENCY_OPTIONS = [
  ['INR', '₹ INR'],
  ['USD', '$ USD'],
  ['EUR', '€ EUR'],
  ['GBP', '£ GBP'],
] as const;

/** Width, in characters, for a text blank so it hugs what was typed. */
const widthFor = (value: string, min: number): { width: string } => ({
  width: `${Math.max(min, value.length + 1)}ch`,
});

/**
 * The required fields set as one printed sentence. Each blank is a real, labelled control; the
 * visible words around it are not used as labels (docs/09 §3).
 */
export function InvitationSentence({
  draft,
  errors,
  minDate,
  maxDate,
  onChange,
  onBlurField,
}: Props) {
  const blur = (key: keyof IntakeDraft) => () => {
    onBlurField(key);
  };
  return (
    <fieldset className={styles.card}>
      <legend className="srOnly">Event details</legend>
      <div className={styles.sentence}>
        We are planning a{' '}
        <Field
          id={fieldId('eventType')}
          label="Event type"
          required
          hideLabel
          variant="underline"
          className={styles.blank}
          hint="Wedding, birthday or community event"
          error={errors.eventType}
        >
          {(control) => (
            <select
              {...control}
              value={draft.eventType}
              onBlur={blur('eventType')}
              onChange={(event) => {
                const eventType = event.target.value as EventType;
                onChange({ eventType, subType: subTypeFor(eventType, draft.subType) });
              }}
            >
              {EVENT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </Field>{' '}
        —{' '}
        <Field
          id={fieldId('subType')}
          label="Kind of event"
          required
          hideLabel
          variant="underline"
          className={styles.blank}
          hint="The style of the event"
          error={errors.subType}
        >
          {(control) => (
            <select
              {...control}
              value={draft.subType}
              onBlur={blur('subType')}
              onChange={(event) => {
                onChange({ subType: event.target.value });
              }}
            >
              {SUB_TYPES[draft.eventType].map((value) => (
                <option key={value} value={value}>
                  {SUB_TYPE_LABELS[value] ?? value}
                </option>
              ))}
            </select>
          )}
        </Field>{' '}
        — for{' '}
        <Field
          id={fieldId('guestCount')}
          label="Number of guests"
          required
          hideLabel
          variant="underline"
          className={styles.blank}
          hint="Guests — between 1 and 5,000"
          error={errors.guestCount}
        >
          {(control) => (
            <input
              {...control}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={draft.guestCount}
              style={widthFor(draft.guestCount, 4)}
              onBlur={blur('guestCount')}
              onChange={(event) => {
                onChange({ guestCount: event.target.value });
              }}
            />
          )}
        </Field>{' '}
        guests in{' '}
        <Field
          id={fieldId('city')}
          label="City"
          required
          hideLabel
          variant="underline"
          className={styles.blank}
          hint="City — up to 60 characters"
          error={errors.city}
        >
          {(control) => (
            <input
              {...control}
              type="text"
              maxLength={60}
              autoComplete="address-level2"
              value={draft.city}
              style={widthFor(draft.city, 8)}
              onBlur={blur('city')}
              onChange={(event) => {
                onChange({ city: event.target.value });
              }}
            />
          )}
        </Field>{' '}
        on{' '}
        <Field
          id={fieldId('date')}
          label="Event date"
          required
          hideLabel
          variant="underline"
          className={styles.blank}
          hint="Date — from today up to three years ahead"
          error={errors.date}
        >
          {(control) => (
            <input
              {...control}
              type="date"
              min={minDate}
              max={maxDate}
              value={draft.date}
              onBlur={blur('date')}
              onChange={(event) => {
                onChange({ date: event.target.value });
              }}
            />
          )}
        </Field>
        ,{' '}
        <Field
          id={fieldId('setting')}
          label="Setting"
          required
          hideLabel
          variant="underline"
          className={styles.blank}
          hint="Where the event takes place"
          error={errors.setting}
        >
          {(control) => (
            <select
              {...control}
              value={draft.setting}
              onBlur={blur('setting')}
              onChange={(event) => {
                onChange({ setting: event.target.value as IntakeDraft['setting'] });
              }}
            >
              {SETTING_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </Field>
        , with a budget of{' '}
        <Field
          id={fieldId('currency')}
          label="Currency"
          hideLabel
          variant="underline"
          className={styles.blank}
          hint="Currency of the budget"
        >
          {(control) => (
            <select
              {...control}
              value={draft.currency}
              onChange={(event) => {
                onChange({ currency: event.target.value as IntakeDraft['currency'] });
              }}
            >
              {CURRENCY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </Field>{' '}
        <Field
          id={fieldId('budget')}
          label="Total budget"
          required
          hideLabel
          variant="underline"
          className={styles.blank}
          hint="Budget — total for the whole event"
          error={errors.budget}
        >
          {(control) => (
            <input
              {...control}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={draft.budget}
              style={widthFor(draft.budget, 9)}
              onBlur={blur('budget')}
              onChange={(event) => {
                onChange({ budget: event.target.value });
              }}
            />
          )}
        </Field>
        .
      </div>
    </fieldset>
  );
}
