import { type ReactNode, useEffect, useId, useRef } from 'react';

import { Button } from './Button';
import styles from './Dialog.module.css';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Shows the "Close" text button; confirm dialogs supply their own actions instead. */
  showClose?: boolean;
  variant?: 'centre' | 'sheet';
  children: ReactNode;
}

/**
 * Native <dialog> opened with showModal(): focus is trapped by the browser, Esc closes it and
 * focus returns to the opener. Labelled by its heading.
 */
export function Dialog({
  open,
  onClose,
  title,
  showClose = true,
  variant = 'centre',
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={`${styles.dialog} ${variant === 'sheet' ? styles.sheet : ''}`}
      onClose={onClose}
    >
      {open ? (
        <div className={styles.body}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {children}
          {showClose ? (
            <div className={styles.actions}>
              <Button variant="text" onClick={onClose}>
                Close
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}
