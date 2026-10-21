import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { expect } from 'vitest';
import { axe } from 'vitest-axe';

export type ThemeName = 'paper' | 'lamplight';

/** Renders under each theme and asserts axe finds nothing (contrast is covered by contrast.test). */
export async function expectNoViolations(ui: ReactElement): Promise<void> {
  const themes: ThemeName[] = ['paper', 'lamplight'];
  for (const theme of themes) {
    document.documentElement.dataset.theme = theme;
    const { container, unmount } = render(ui);
    const results = await axe(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results).toHaveNoViolations();
    unmount();
  }
}
