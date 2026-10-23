import type { ReactNode } from 'react';

import { SUB_TYPE_LABELS } from '../../../shared/labels.js';
import { type EventType, SUB_TYPES } from '../../../shared/schema/brief.js';
import { type FieldErrors, type IntakeDraft, subTypeFor } from '../../lib/draft';

import { DateBlank, SelectBlank, TextBlank } from './Blanks';
import styles from './InvitationSentence.module.css';

export { fieldId } from './Blanks';

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
          <DateBlank
            draft={draft}
            error={errors.date}
            minDate={props.minDate}
            maxDate={props.maxDate}
            onChange={onChange}
            onBlurField={onBlurField}
          />
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
