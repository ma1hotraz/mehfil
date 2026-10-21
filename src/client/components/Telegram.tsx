import { useEffect, useRef, useState } from 'react';

import { Icon } from './Icon';
import styles from './Telegram.module.css';

interface TelegramProps {
  message: string;
  onDismiss: () => void;
  /** Milliseconds before auto-dismissal when not hovered or focused. */
  timeoutMs?: number;
}

/**
 * The "telegram slip" notice: a narrow paper slip in mono caps (docs/06 §7.9). It never auto
 * dismisses while hovered or focused, and has a close button.
 */
export function Telegram({ message, onDismiss, timeoutMs = 6000 }: TelegramProps) {
  const [paused, setPaused] = useState(false);
  const slip = useRef<HTMLDivElement>(null);

  // Pause tracking uses plain listeners: the slip itself is not an interactive control.
  useEffect(() => {
    const node = slip.current;
    if (!node) {
      return undefined;
    }
    const pause = (): void => {
      setPaused(true);
    };
    const resume = (): void => {
      setPaused(false);
    };
    const events: [string, () => void][] = [
      ['mouseenter', pause],
      ['mouseleave', resume],
      ['focusin', pause],
      ['focusout', resume],
    ];
    events.forEach(([name, handler]) => {
      node.addEventListener(name, handler);
    });
    return () => {
      events.forEach(([name, handler]) => {
        node.removeEventListener(name, handler);
      });
    };
  }, []);

  useEffect(() => {
    if (paused) {
      return undefined;
    }
    const timer = setTimeout(onDismiss, timeoutMs);
    return () => {
      clearTimeout(timer);
    };
  }, [paused, onDismiss, timeoutMs, message]);

  return (
    <div ref={slip} className={styles.slip}>
      <span role="status" className={styles.text}>
        {message.toUpperCase()} · STOP
      </span>
      <button type="button" className={styles.close} onClick={onDismiss}>
        <Icon name="cross" size={14} />
        <span className="srOnly">Dismiss notice</span>
      </button>
    </div>
  );
}
