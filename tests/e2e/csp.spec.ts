import { expect, test } from '@playwright/test';

import { TABS, createJaipurPlan, openTab } from './helpers';

test('no CSP violations or console errors across the main flows', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || /Content Security Policy|Refused to/i.test(message.text())) {
      problems.push(message.text());
    }
  });
  page.on('pageerror', (error) => problems.push(String(error)));
  page.on('requestfailed', (request) => problems.push(`failed: ${request.url()}`));

  await createJaipurPlan(page);
  for (const tab of TABS) {
    await openTab(page, tab);
  }
  await page.getByRole('button', { name: 'Ask the Planner' }).click();
  await page.getByLabel('Your question for the Planner').fill('What next?');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText(/^Offline planner mode —/)).toBeVisible();
  await page.getByRole('button', { name: 'Lamplight theme' }).click();
  await page.getByRole('radio', { name: '115 percent' }).check({ force: true });
  expect(problems).toEqual([]);
});

test('the key and the environment never reach the client bundle', async ({ page }) => {
  const bodies: string[] = [];
  page.on('response', async (response) => {
    const type = response.headers()['content-type'] ?? '';
    if (/javascript|html|css/.test(type)) {
      bodies.push(await response.text());
    }
  });
  await createJaipurPlan(page);
  await page.waitForLoadState('networkidle');
  const all = bodies.join('\n');
  expect(all).not.toMatch(/GEMINI_API_KEY|AIza[0-9A-Za-z_-]{20,}/);
});
