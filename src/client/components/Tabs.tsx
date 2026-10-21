import { type KeyboardEvent, type ReactNode, useRef } from 'react';

import { cx } from '../lib/cx';

import styles from './Tabs.module.css';

export interface TabItem {
  id: string;
  label: string;
  /** Section number shown before the label, e.g. 2 → "§2". */
  number?: number;
}

interface TabsProps {
  /** Accessible name of the tab list. */
  label: string;
  tabs: readonly TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  /** Id prefix so several tab sets can coexist. */
  idPrefix?: string;
  /** Extra controls placed at the end of the strip (outside the tab list). */
  trailing?: ReactNode;
  children: ReactNode;
}

export const tabId = (prefix: string, id: string): string => `${prefix}-tab-${id}`;
export const panelId = (prefix: string, id: string): string => `${prefix}-panel-${id}`;

/** WAI-ARIA tabs with roving tabindex, arrow/Home/End keys and automatic activation. */
export function Tabs({
  label,
  tabs,
  activeId,
  onChange,
  idPrefix = 'tabs',
  trailing,
  children,
}: TabsProps) {
  const refs = useRef(new Map<string, HTMLButtonElement>());

  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const last = tabs.length - 1;
    const target =
      event.key === 'ArrowRight'
        ? index === last
          ? 0
          : index + 1
        : event.key === 'ArrowLeft'
          ? index === 0
            ? last
            : index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : undefined;
    const next = target === undefined ? undefined : tabs[target];
    if (next) {
      event.preventDefault();
      onChange(next.id);
      refs.current.get(next.id)?.focus();
    }
  };

  return (
    <div>
      <div className={styles.strip}>
        <div role="tablist" aria-label={label} className={styles.list}>
          {tabs.map((tab, index) => {
            const selected = tab.id === activeId;
            return (
              <button
                key={tab.id}
                ref={(node) => {
                  if (node) {
                    refs.current.set(tab.id, node);
                  } else {
                    refs.current.delete(tab.id);
                  }
                }}
                type="button"
                role="tab"
                id={tabId(idPrefix, tab.id)}
                aria-selected={selected}
                aria-controls={panelId(idPrefix, tab.id)}
                tabIndex={selected ? 0 : -1}
                className={cx(styles.tab, selected && styles.selected)}
                onClick={() => {
                  onChange(tab.id);
                }}
                onKeyDown={(event) => {
                  move(event, index);
                }}
              >
                {tab.number !== undefined ? <span aria-hidden="true">§{tab.number} </span> : null}
                {tab.label}
              </button>
            );
          })}
        </div>
        {trailing ? <div className={styles.trailing}>{trailing}</div> : null}
      </div>
      <div
        role="tabpanel"
        id={panelId(idPrefix, activeId)}
        aria-labelledby={tabId(idPrefix, activeId)}
        tabIndex={0}
        className={styles.panel}
      >
        {children}
      </div>
    </div>
  );
}
