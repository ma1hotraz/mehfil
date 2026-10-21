import { expect, test } from '@playwright/test';

import { TABS, createJaipurPlan, openTab } from './helpers';

test.use({ viewport: { width: 320, height: 640 } });

async function expectNoHorizontalScroll(
  page: import('@playwright/test').Page,
  label: string,
): Promise<void> {
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width, `scrollWidth on ${label}`).toBeLessThanOrEqual(320);
}

test('no horizontal page scroll at 320px on any screen', async ({ page }) => {
  await page.goto('/');
  await expectNoHorizontalScroll(page, 'front');
  await page.getByRole('button', { name: /Jaipur wedding/ }).click();
  await expectNoHorizontalScroll(page, 'intake');
  await page.getByRole('button', { name: /Set it in type/ }).click();
  await page.getByRole('heading', { level: 1, name: 'Ananya & Kabir' }).waitFor();
  for (const tab of TABS) {
    await openTab(page, tab);
    await expectNoHorizontalScroll(page, tab);
  }
  await page.getByRole('button', { name: 'Ask the Planner' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expectNoHorizontalScroll(page, 'planner');
});

test('content stays usable at 200% text and with text-spacing overrides', async ({ page }) => {
  await createJaipurPlan(page);
  await page.evaluate(() => {
    // Constructable stylesheets are not blocked by the strict style-src policy.
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(
      '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }',
    );
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  });
  await expectNoHorizontalScroll(page, 'text spacing');
  await page.getByRole('radio', { name: '130 percent' }).check({ force: true });
  await expectNoHorizontalScroll(page, '130% text');
});
