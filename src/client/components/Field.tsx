import { type ReactNode, useId } from 'react';

import { cx } from '../lib/cx';

import styles from './Field.module.css';

export interface ControlProps {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
  required: boolean | undefined;
}

interface FieldProps {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  hideLabel?: boolean;
  required?: boolean;
  variant?: 'underline' | 'boxed';
  className?: string | undefined;
  /** Fixed id for the control, so error summaries can link to it. */
  id?: string | undefined;
  /** Receives the ids and ARIA wiring to spread onto the real control. */
  children: (control: ControlProps) => ReactNode;
}

function RequiredMark({ plain }: { plain: boolean }) {
  return <span className={plain ? undefined : styles.required}> (required)</span>;
}

/** ids of the hint and error paragraphs that exist, joined for aria-describedby. */
function describedBy(ids: { hint: string; error: string }, has: { hint: boolean; error: boolean }) {
  const used = [has.hint ? ids.hint : '', has.error ? ids.error : ''].filter(Boolean);
  return used.length > 0 ? used.join(' ') : undefined;
}

/**
 * Wraps one real form control with a real <label>, a hint and an error message, wired together
 * with aria-describedby / aria-invalid (docs/09 §3).
 */
export function Field({
  label,
  hint,
  error,
  hideLabel = false,
  required = false,
  variant = 'boxed',
  className,
  id: fixedId,
  children,
}: FieldProps) {
  const generated = useId();
  const id = fixedId ?? generated;
  const ids = { hint: `${id}-hint`, error: `${id}-error` };
  const control: ControlProps = {
    id,
    'aria-describedby': describedBy(ids, { hint: Boolean(hint), error: Boolean(error) }),
    'aria-invalid': error ? true : undefined,
    required: required || undefined,
  };
  return (
    <div className={cx(styles.field, styles[variant], error && styles.invalid, className)}>
      <label htmlFor={id} className={cx(styles.label, hideLabel && 'srOnly')}>
        {label}
        {required ? <RequiredMark plain={hideLabel} /> : null}
      </label>
      {children(control)}
      {hint ? (
        <p id={ids.hint} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={ids.error} className={styles.error}>
          Check: {error}
        </p>
      ) : null}
    </div>
  );
}
