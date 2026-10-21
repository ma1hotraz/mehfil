import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect } from '@playwright/test';

export const TABS = ['Overview', 'Ledger', 'Timetable', 'Vendors', 'Ideas', 'Run sheet'] as const;

/** Front page → Jaipur sample → intake → plan, using the mouse. */
export async function createJaipurPlan(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /Jaipur wedding/ }).click();
  await page.getByRole('button', { name: /Set it in type/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Ananya & Kabir' })).toBeVisible();
}

export async function openTab(page: Page, name: (typeof TABS)[number]): Promise<void> {
  await page.getByRole('tab', { name: new RegExp(name) }).click();
  await expect(page.getByRole('tabpanel')).toBeVisible();
  await page.waitForLoadState('networkidle');
}

/** Presses Tab until `target` has focus, failing after `max` presses. */
export async function tabTo(page: Page, target: Locator, max = 80): Promise<void> {
  for (let i = 0; i < max; i += 1) {
    if (await target.evaluate((el) => el === document.activeElement)) {
      return;
    }
    await page.keyboard.press('Tab');
  }
  throw new Error('Could not reach the element with Tab');
}

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Runs axe with the WCAG 2.2 AA tag set and asserts there are no violations. */
export async function expectNoAxeViolations(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
  );
  expect(summary, `axe violations on ${label}`).toEqual([]);
}
