import { useMemo } from 'react';

import { FIELD_KEYS, type FieldErrors, type IntakeDraft, parseDraft } from './draft';

export interface IntakeValidationState {
  all: FieldErrors;
  visible: FieldErrors;
  summary: (keyof FieldErrors)[];
}

/**
 * Offloads intake validation logic and visible error tracking from presentation.
 * Adheres to SRP by keeping IntakeView focused solely on rendering and DOM focus handling.
 */
export function useIntakeValidation(
  draft: IntakeDraft,
  today: string,
  touched: ReadonlySet<string>,
  submitted: boolean,
): IntakeValidationState {
  const all = useMemo<FieldErrors>(() => {
    const result = parseDraft(draft, today);
    return result.ok ? {} : result.error;
  }, [draft, today]);

  const visible = useMemo<FieldErrors>(
    () => Object.fromEntries(Object.entries(all).filter(([key]) => submitted || touched.has(key))),
    [all, submitted, touched],
  );

  const summary = useMemo(
    () => FIELD_KEYS.filter((key) => submitted && all[key]),
    [all, submitted],
  );

  return { all, visible, summary };
}
