import styles from './Toggles.module.css';

export type ThemeName = 'paper' | 'lamplight';

/** Toggle between the Paper and Lamplight themes. Pressed means Lamplight is on. */
export function ThemeToggle({
  theme,
  onChange,
}: {
  theme: ThemeName;
  onChange: (theme: ThemeName) => void;
}) {
  return (
    <button
      type="button"
      className={styles.toggle}
      aria-pressed={theme === 'lamplight'}
      onClick={() => {
        onChange(theme === 'lamplight' ? 'paper' : 'lamplight');
      }}
    >
      Lamplight theme
    </button>
  );
}
