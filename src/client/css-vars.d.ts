import 'react';

declare module 'react' {
  /**
   * Lets components pass CSS custom properties (e.g. `--share`) through the `style` prop.
   * It must stay an interface so it merges with React's own `CSSProperties`.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- needed for declaration merging
  interface CSSProperties extends Record<`--${string}`, string | number | undefined> {}
}
