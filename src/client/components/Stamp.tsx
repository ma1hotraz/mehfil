import type { CSSProperties } from 'react';

import { cx } from '../lib/cx';

import styles from './Stamp.module.css';

export type StampTone = 'ink' | 'peacock' | 'umber' | 'sindoor' | 'leaf';

interface StampProps {
  children: string;
  tone?: StampTone;
  size?: 'sm' | 'lg';
  /** Rotation in degrees; decorative. */
  tilt?: number;
  /** Plays the "stamp" motion; set when the text just changed. */
  fresh?: boolean;
}

/** Double-ringed circular ink stamp. The text is always real text, colour is secondary. */
export function Stamp({
  children,
  tone = 'ink',
  size = 'sm',
  tilt = -4,
  fresh = false,
}: StampProps) {
  return (
    <span
      className={cx(styles.stamp, styles[tone], styles[size], fresh && styles.fresh)}
      style={{ '--tilt': `${tilt}deg` } as CSSProperties}
    >
      <span className={styles.ring}>{children}</span>
    </span>
  );
}
