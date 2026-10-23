import { Field } from '../../components/Field';
import type { IntakeDraft } from '../../lib/draft';

import styles from './InvitationSentence.module.css';

/** Id of the control for an intake field, so error summaries can link to it. */
export const fieldId = (key: string): string => `intake-${key}`;

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
export function Blank({ name, label, hint, error, required = true, children }: BlankProps) {
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

export function SelectBlank<V extends string>({
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

export function TextBlank({
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

interface DateBlankProps {
  draft: IntakeDraft;
  error: string | undefined;
  minDate: string;
  maxDate: string;
  onChange: (patch: Partial<IntakeDraft>) => void;
  onBlurField: (key: keyof IntakeDraft) => void;
}

export function DateBlank({
  draft,
  error,
  minDate,
  maxDate,
  onChange,
  onBlurField,
}: DateBlankProps) {
  return (
    <Blank
      name="date"
      label="Event date"
      hint="Date — from today up to three years ahead"
      error={error}
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
