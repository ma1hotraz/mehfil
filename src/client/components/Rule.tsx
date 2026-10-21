import styles from './Rule.module.css';

export type Motif = 'marigold' | 'diya' | 'star';

/** Motif per event type: marigold for weddings, diya for community events, star for birthdays. */
export const MOTIF_BY_TYPE = { wedding: 'marigold', community: 'diya', birthday: 'star' } as const;

const MOTIFS: Record<Motif, React.ReactNode> = {
  marigold: (
    <g stroke="currentColor" strokeWidth="1.2" fill="none">
      {[0, 45, 90, 135].map((angle) => (
        <ellipse key={angle} cx="12" cy="12" rx="2.4" ry="8" transform={`rotate(${angle} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </g>
  ),
  diya: (
    <g stroke="currentColor" strokeWidth="1.2" fill="none">
      <path d="M3 15h18c0 4-4 6-9 6s-9-2-9-6z" />
      <path d="M12 13c-2-2-2-5 0-8 2 3 2 6 0 8z" fill="currentColor" />
    </g>
  ),
  star: (
    <path
      d="M12 3l2.6 6 6.4.5-4.9 4.2 1.5 6.3L12 16.6 6.4 20l1.5-6.3L3 9.5 9.4 9z"
      stroke="currentColor"
      strokeWidth="1.2"
      fill="none"
    />
  ),
};

/** Ornamental hairline with a small centred motif. Purely decorative. */
export function Rule({ motif = 'marigold' }: { motif?: Motif }) {
  return (
    <div className={styles.rule} role="presentation">
      <span className={styles.line} />
      <svg aria-hidden="true" focusable="false" width="26" height="26" viewBox="0 0 24 24">
        {MOTIFS[motif]}
      </svg>
      <span className={styles.line} />
    </div>
  );
}
