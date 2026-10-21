import { ACCESS, DIETARY, VIBES } from '../../../shared/schema/brief.js';
import { ACCESS_LABELS, DIETARY_LABELS, VIBE_LABELS } from '../../../shared/labels.js';
import { ChipGroup } from '../../components/ChipGroup';
import { Field } from '../../components/Field';
import type { FieldErrors, IntakeDraft } from '../../lib/draft';

import { fieldId } from './InvitationSentence';
import styles from './Margins.module.css';

interface Props {
  draft: IntakeDraft;
  errors: FieldErrors;
  onChange: (patch: Partial<IntakeDraft>) => void;
}

const toOptions = (values: readonly string[], labels: Record<string, string>) =>
  values.map((value) => ({ value, label: labels[value] ?? value }));

/** "In the margins": the optional fields as chip groups and ruled notepaper. */
export function Margins({ draft, errors, onChange }: Props) {
  return (
    <section aria-labelledby="margins-title" className={styles.margins}>
      <h2 id="margins-title" className={styles.title}>
        In the margins
      </h2>
      <p className={styles.lede}>All optional. The more you say, the more the plan can fit you.</p>
      <div className={styles.columns}>
        <div className={styles.column}>
          <ChipGroup
            legend="Vibe"
            max={3}
            options={toOptions(VIBES, VIBE_LABELS)}
            selected={draft.vibe}
            onChange={(vibe) => {
              onChange({ vibe: vibe as IntakeDraft['vibe'] });
            }}
          />
          <ChipGroup
            legend="Dietary needs"
            options={toOptions(DIETARY, DIETARY_LABELS)}
            selected={draft.dietary}
            onChange={(dietary) => {
              onChange({ dietary: dietary as IntakeDraft['dietary'] });
            }}
          />
          <ChipGroup
            legend="Guest accessibility"
            options={toOptions(ACCESS, ACCESS_LABELS)}
            selected={draft.accessibility}
            onChange={(accessibility) => {
              onChange({ accessibility: accessibility as IntakeDraft['accessibility'] });
            }}
          />
        </div>
        <div className={styles.column}>
          <Field
            id={fieldId('title')}
            label="Title of the event"
            hint="For example “Ananya & Kabir” — up to 80 characters"
            error={errors.title}
          >
            {(control) => (
              <input
                {...control}
                type="text"
                maxLength={80}
                value={draft.title}
                onChange={(event) => {
                  onChange({ title: event.target.value });
                }}
              />
            )}
          </Field>
          <Field
            id={fieldId('traditions')}
            label="Traditions to honour"
            hint={`${draft.traditions.length.toString()} of 200 characters`}
            error={errors.traditions}
          >
            {(control) => (
              <textarea
                {...control}
                className={styles.notepaper}
                rows={4}
                maxLength={200}
                value={draft.traditions}
                onChange={(event) => {
                  onChange({ traditions: event.target.value });
                }}
              />
            )}
          </Field>
          <Field
            id={fieldId('mustHaves')}
            label="Must-haves"
            hint={`${draft.mustHaves.length.toString()} of 300 characters`}
            error={errors.mustHaves}
          >
            {(control) => (
              <textarea
                {...control}
                className={styles.notepaper}
                rows={5}
                maxLength={300}
                value={draft.mustHaves}
                onChange={(event) => {
                  onChange({ mustHaves: event.target.value });
                }}
              />
            )}
          </Field>
        </div>
      </div>
    </section>
  );
}
