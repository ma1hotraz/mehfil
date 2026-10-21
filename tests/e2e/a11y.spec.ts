import { type Page, test } from '@playwright/test';

import { TABS, expectNoAxeViolations, openTab } from './helpers';

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 375, height: 800 },
] as const;
const THEMES = ['light', 'dark'] as const;

/** Visits every screen and asserts zero axe violations on each. */
async function walk(page: Page, label: string): Promise<void> {
  await page.goto('/');
  await page.getByRole('heading', { level: 1, name: 'Mehfil' }).waitFor();
  await expectNoAxeViolations(page, `${label} front`);

  await page.getByRole('button', { name: /Begin a plan/ }).click();
  await page.getByRole('heading', { level: 1, name: /The Invitation/ }).waitFor();
  await page.getByRole('button', { name: /Set it in type/ }).click();
  await page.getByText('Check these before setting it in type').waitFor();
  await expectNoAxeViolations(page, `${label} intake with errors`);

  await page.goto('/');
  await page.getByRole('button', { name: /Jaipur wedding/ }).click();
  await expectNoAxeViolations(page, `${label} intake`);
  await page.getByRole('button', { name: /Set it in type/ }).click();
  await page.getByRole('heading', { level: 1, name: 'Ananya & Kabir' }).waitFor();
  for (const tab of TABS) {
    await openTab(page, tab);
    await expectNoAxeViolations(page, `${label} ${tab}`);
  }

  await openTab(page, 'Vendors');
  await page.getByText('Questions to ask (6)').first().click();
  await page.getByText('Your notes for Venue').click();
  await expectNoAxeViolations(page, `${label} vendors expanded`);

  await page.getByRole('button', { name: 'Ask the Planner' }).click();
  await page.getByLabel('Your question for the Planner').fill('We are short, what should I cut?');
  await page.getByRole('button', { name: 'Send' }).click();
  await page.getByText(/^Offline planner mode —/).waitFor();
  await expectNoAxeViolations(page, `${label} planner`);
}

for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    test(`zero axe violations: ${viewport.name}, ${theme}`, async ({ browser }) => {
      const context = await browser.newContext({ viewport, colorScheme: theme });
      const page = await context.newPage();
      await walk(page, `${viewport.name}/${theme}`);
      await context.close();
    });
  }
}

test('zero axe violations with reduced motion and a stored Lamplight choice', async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', colorScheme: 'light' });
  const page = await context.newPage();
  await page.goto('/');
  await page.getByRole('button', { name: 'Lamplight theme' }).click();
  await walk(page, 'reduced-motion');
  await context.close();
});

test('forced colours keep every control visible', async ({ browser }) => {
  const context = await browser.newContext({ forcedColors: 'active' });
  const page = await context.newPage();
  await page.goto('/');
  await expectNoAxeViolations(page, 'forced colors front');
  await context.close();
});
