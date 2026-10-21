import styles from './SkipLink.module.css';

/** First focusable element on every page; visible only while focused. */
export function SkipLink({ target = 'main' }: { target?: string }) {
  return (
    <a className={styles.skip} href={`#${target}`}>
      Skip to content
    </a>
  );
}
