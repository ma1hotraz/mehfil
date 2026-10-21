import type { ReactNode } from 'react';

import styles from './Postcard.module.css';

interface PostcardProps {
  id: string;
  kicker: string;
  title: string;
  /** Right-hand postage stamp and postmark. */
  postage: ReactNode;
  footer?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

/** A landscape idea postcard with printer's crop marks at the corners. */
export function Postcard({ id, kicker, title, postage, footer, actions, children }: PostcardProps) {
  const headingId = `${id}-title`;
  return (
    <article className={styles.card} aria-labelledby={headingId}>
      {['tl', 'tr', 'bl', 'br'].map((corner) => (
        <span key={corner} className={`${styles.mark} ${styles[corner]}`} aria-hidden="true" />
      ))}
      <div className={styles.main}>
        <p className={styles.kicker}>{kicker}</p>
        <h3 id={headingId} className={styles.title}>
          {title}
        </h3>
        <p className={styles.text}>{children}</p>
      </div>
      <div className={styles.side}>{postage}</div>
      {footer ? <p className={styles.footer}>{footer}</p> : null}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </article>
  );
}

interface PostageProps {
  /** Visible cost marks, e.g. "₹₹". */
  band: string;
  /** Text alternative, e.g. "Cost: medium". */
  label: string;
  initial: string;
}

/** Perforated postage-stamp box holding the cost band, plus a round postmark. */
export function Postage({ band, label, initial }: PostageProps) {
  return (
    <div className={styles.postage}>
      <div className={styles.stampBox}>
        <span aria-hidden="true" className={styles.band}>
          {band}
        </span>
        <span className="srOnly">{label}</span>
      </div>
      <span className={styles.postmark} aria-hidden="true">
        {initial}
      </span>
    </div>
  );
}
