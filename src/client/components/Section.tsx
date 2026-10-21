import type { ReactNode } from 'react';

import styles from './Section.module.css';

interface SectionProps {
  /** Printed section number, shown as "§ 2". */
  number: number;
  title: string;
  /** Marginalia for the left column on wide screens; above the content on narrow ones. */
  margin?: ReactNode;
  /** Text buttons at the top right of the section. */
  actions?: ReactNode;
  children: ReactNode;
}

/** A numbered almanac section: heading, optional marginalia column and a main column. */
export function Section({ number, title, margin, actions, children }: SectionProps) {
  return (
    <section className={styles.section} aria-labelledby={`section-${number.toString()}`}>
      <header className={styles.head}>
        <h2 id={`section-${number.toString()}`} className={styles.title}>
          <span className={styles.number} aria-hidden="true">
            § {number}{' '}
          </span>
          {title}
        </h2>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </header>
      <div className={styles.grid}>
        {margin ? <aside className={styles.margin}>{margin}</aside> : null}
        <div className={styles.main}>{children}</div>
      </div>
    </section>
  );
}
