import type { ReactNode } from 'react';

import { SUB_TYPE_LABELS } from '../../../shared/labels.js';
import { type EventType, SUB_TYPES } from '../../../shared/schema/brief.js';
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

const EVENT_OPTIONS = [
  ['wedding', 'wedding'],
  ['birthday', 'birthday'],
  ['community', 'community event'],
] as const;
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

interface BlankProps {
  name: string;
  label: string;
  hint: string;
  error?: string | undefined;
  required?: boolean;
  children: Parameters<typeof Field>[0]['children'];
}

/** One underlined blank: a hidden-label Field with the sentence styling. */
function Blank({ name, label, hint, error, required = true, children }: BlankProps) {
  return (
    <Field
      id={fieldId(name)}
      label={label}
      hint={hint}
      error={error}
      required={required}
      hideLabel
      variant="underline"
      className={styles.blank}
    >
      {children}
    </Field>
  );
}

interface SelectBlankProps<V extends string> extends Omit<BlankProps, 'children'> {
  value: V;
  options: readonly (readonly [V, string])[];
  onChange: (value: V) => void;
  onBlur?: () => void;
}

function SelectBlank<V extends string>({
  value,
  options,
  onChange,
  onBlur,
  ...blank
}: SelectBlankProps<V>) {
  return (
    <Blank {...blank}>
      {(control) => (
        <select
          {...control}
          value={value}
          onBlur={onBlur}
          onChange={(event) => {
            onChange(event.target.value as V);
          }}
        >
          {options.map(([optionValue, text]) => (
            <option key={optionValue} value={optionValue}>
              {text}
            </option>
          ))}
        </select>
      )}
    </Blank>
  );
}

interface TextBlankProps extends Omit<BlankProps, 'children'> {
  value: string;
  minChars: number;
  inputMode?: 'numeric' | 'decimal';
  autoComplete?: string;
  maxLength?: number;
  onChange: (value: string) => void;
  onBlur: () => void;
}

function TextBlank({
  value,
  minChars,
  inputMode,
  autoComplete,
  maxLength,
  onChange,
  onBlur,
  ...blank
}: TextBlankProps) {
  return (
    <Blank {...blank}>
      {(control) => (
        <input
          {...control}
          type="text"
          inputMode={inputMode}
          autoComplete={autoComplete ?? 'off'}
          maxLength={maxLength}
          value={value}
          style={widthFor(value, minChars)}
          onBlur={onBlur}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
      )}
    </Blank>
  );
}

function DateBlank({ draft, errors, minDate, maxDate, onChange, onBlurField }: Props) {
  return (
    <Blank
      name="date"
      label="Event date"
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
          onBlur={() => {
            onBlurField('date');
          }}
          onChange={(event) => {
            onChange({ date: event.target.value });
          }}
        />
      )}
    </Blank>
  );
}

const Words = ({ children }: { children: ReactNode }) => <> {children} </>;

/**
 * The required fields set as one printed sentence. Each blank is a real, labelled control; the
 * visible words around it are not used as labels (docs/09 §3).
 */
export function InvitationSentence(props: Props) {
  const { draft, errors, onChange, onBlurField } = props;
  const blur = (key: keyof IntakeDraft) => () => {
    onBlurField(key);
  };
  return (
    <fieldset className={styles.card}>
      <legend className="srOnly">Event details</legend>
      <div className={styles.sentence}>
        We are planning a
        <Words>
          <SelectBlank
            name="eventType"
            label="Event type"
            hint="Wedding, birthday or community event"
            error={errors.eventType}
            value={draft.eventType}
            options={EVENT_OPTIONS}
            onBlur={blur('eventType')}
            onChange={(eventType: EventType) => {
              onChange({ eventType, subType: subTypeFor(eventType, draft.subType) });
            }}
          />
        </Words>
        —
        <Words>
          <SelectBlank
            name="subType"
            label="Kind of event"
            hint="The style of the event"
            error={errors.subType}
            value={draft.subType}
            options={SUB_TYPES[draft.eventType].map((v) => [v, SUB_TYPE_LABELS[v] ?? v] as const)}
            onBlur={blur('subType')}
            onChange={(subType) => {
              onChange({ subType });
            }}
          />
        </Words>
        — for
        <Words>
          <TextBlank
            name="guestCount"
            label="Number of guests"
            hint="Guests — between 1 and 5,000"
            error={errors.guestCount}
            value={draft.guestCount}
            minChars={4}
            inputMode="numeric"
            onBlur={blur('guestCount')}
            onChange={(guestCount) => {
              onChange({ guestCount });
            }}
          />
        </Words>
        guests in
        <Words>
          <TextBlank
            name="city"
            label="City"
            hint="City — up to 60 characters"
            error={errors.city}
            value={draft.city}
            minChars={8}
            maxLength={60}
            autoComplete="address-level2"
            onBlur={blur('city')}
            onChange={(city) => {
              onChange({ city });
            }}
          />
        </Words>
        on
        <Words>
          <DateBlank {...props} />
        </Words>
        ,
        <Words>
          <SelectBlank
            name="setting"
            label="Setting"
            hint="Where the event takes place"
            error={errors.setting}
            value={draft.setting}
            options={SETTING_OPTIONS}
            onBlur={blur('setting')}
            onChange={(setting) => {
              onChange({ setting });
            }}
          />
        </Words>
        , with a budget of
        <Words>
          <SelectBlank
            name="currency"
            label="Currency"
            hint="Currency of the budget"
            required={false}
            value={draft.currency}
            options={CURRENCY_OPTIONS}
            onChange={(currency) => {
              onChange({ currency });
            }}
          />
        </Words>
        <TextBlank
          name="budget"
          label="Total budget"
          hint="Budget — total for the whole event"
          error={errors.budget}
          value={draft.budget}
          minChars={9}
          inputMode="decimal"
          onBlur={blur('budget')}
          onChange={(budget) => {
            onChange({ budget });
          }}
        />
        .
      </div>
    </fieldset>
  );
}
