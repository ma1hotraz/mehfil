import { useId } from 'react';

import { cx } from '../lib/cx';

import styles from './ChipGroup.module.css';
import { Icon } from './Icon';

export interface ChipOption<V extends string = string> {
  value: V;
  label: string;
}

interface BaseProps<V extends string> {
  legend: string;
  options: readonly ChipOption<V>[];
  hint?: string;
}

interface MultiProps<V extends string> extends BaseProps<V> {
  mode?: 'multi';
  selected: readonly V[];
  /** Maximum number of chips that may be selected. */
  max?: number;
  onChange: (selected: V[]) => void;
}

interface SingleProps<V extends string> extends BaseProps<V> {
  mode: 'single';
  selected: V;
  onChange: (selected: V) => void;
}

export type ChipGroupProps<V extends string = string> = MultiProps<V> | SingleProps<V>;

const LIMIT_WORDS = ['', 'one', 'two', 'three', 'four', 'five'];

/** Rectangular chips: toggle buttons (aria-pressed) for multi-select, native radios for single. */
export function ChipGroup<V extends string>(props: ChipGroupProps<V>) {
  const name = useId();
  const noteId = `${name}-note`;
  const isMulti = props.mode !== 'single';
  const max = !isMulti ? undefined : props.max;
  const picked = !isMulti ? [] : props.selected;
  const atLimit = max !== undefined && picked.length >= max;

  return (
    <fieldset className={styles.group} aria-describedby={max !== undefined ? noteId : undefined}>
      <legend className={styles.legend}>{props.legend}</legend>
      <div className={styles.chips}>
        {props.options.map((option) => {
          if (props.mode === 'single') {
            const checked = props.selected === option.value;
            return (
              <label key={option.value} className={cx(styles.chip, checked && styles.on)}>
                <input
                  type="radio"
                  name={name}
                  className="srOnly"
                  checked={checked}
                  onChange={() => {
                    props.onChange(option.value);
                  }}
                />
                {checked ? <Icon name="check" size={14} /> : null}
                {option.label}
              </label>
            );
          }
          const pressed = picked.includes(option.value);
          const blocked = atLimit && !pressed;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={pressed}
              aria-disabled={blocked || undefined}
              className={cx(styles.chip, pressed && styles.on, blocked && styles.blocked)}
              onClick={() => {
                if (blocked) {
                  return;
                }
                props.onChange(
                  pressed ? picked.filter((v) => v !== option.value) : [...picked, option.value],
                );
              }}
            >
              {pressed ? <Icon name="check" size={14} /> : null}
              {option.label}
            </button>
          );
        })}
      </div>
      {max !== undefined ? (
        <p id={noteId} className={styles.note}>
          Up to {LIMIT_WORDS[max] ?? max}
          {atLimit ? ' chosen' : ''}
        </p>
      ) : null}
      {props.hint ? <p className={styles.note}>{props.hint}</p> : null}
    </fieldset>
  );
}
