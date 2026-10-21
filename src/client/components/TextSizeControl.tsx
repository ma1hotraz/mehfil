import { useId } from 'react';

import { TEXT_SIZES, type TextSize } from '../lib/prefs';

import styles from './Toggles.module.css';

/** Three-way text size choice (100 / 115 / 130 percent) as native radios. */
export function TextSizeControl({
  size,
  onChange,
}: {
  size: TextSize;
  onChange: (size: TextSize) => void;
}) {
  const name = useId();
  return (
    <fieldset className={styles.sizes}>
      <legend className={styles.legend}>Text size</legend>
      {TEXT_SIZES.map((value) => (
        <label key={value} className={styles.size}>
          <input
            type="radio"
            name={name}
            className="srOnly"
            checked={size === value}
            onChange={() => {
              onChange(value);
            }}
          />
          <span aria-hidden="true" style={{ fontSize: `${value}em` }}>
            A
          </span>
          <span className="srOnly">{Math.round(value * 100)} percent</span>
        </label>
      ))}
    </fieldset>
  );
}
