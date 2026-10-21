import styles from './TypesetLoader.module.css';

const SLUG_WIDTHS = [72, 40, 56, 88, 48, 64, 36];

/**
 * The "typesetting" loader (docs/06 §7.10): grey slugs where words will be, plus plain text.
 * No spinner and no shimmer; with reduced motion the slugs simply appear.
 */
export function TypesetLoader({ label }: { label: string }) {
  return (
    <div className={styles.loader}>
      <div className={styles.slugs} aria-hidden="true">
        {SLUG_WIDTHS.map((width, index) => (
          <span
            key={`${width}-${index.toString()}`}
            className={styles.slug}
            style={{ width, animationDelay: `${index * 90}ms` }}
          />
        ))}
      </div>
      <p className={styles.label}>{label}</p>
    </div>
  );
}
