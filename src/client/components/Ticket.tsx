import type { ReactNode } from 'react';

import styles from './Ticket.module.css';

interface TicketProps {
  /** Stable id so the article can be labelled by its heading. */
  id: string;
  title: string;
  meta?: ReactNode;
  stamp?: ReactNode;
  children: ReactNode;
}

/** A vendor ticket stub: raised paper with a perforated left edge and a corner stamp. */
export function Ticket({ id, title, meta, stamp, children }: TicketProps) {
  const headingId = `${id}-title`;
  return (
    <article className={styles.ticket} aria-labelledby={headingId}>
      <span className={styles.perforation} aria-hidden="true" />
      <div className={styles.head}>
        <div>
          <h3 id={headingId} className={styles.title}>
            {title}
          </h3>
          {meta ? <p className={styles.meta}>{meta}</p> : null}
        </div>
        {stamp ? <div className={styles.stamp}>{stamp}</div> : null}
      </div>
      {children}
    </article>
  );
}
