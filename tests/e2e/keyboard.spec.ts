import { expect, test } from '@playwright/test';

import { tabTo } from './helpers';

test('flow 1: create a plan with the keyboard only', async ({ page }) => {
  await page.goto('/');
  await tabTo(page, page.getByRole('button', { name: /Jaipur wedding/ }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: /The Invitation/ })).toBeFocused();
  await tabTo(page, page.getByRole('button', { name: /Set it in type/ }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Ananya & Kabir' })).toBeFocused();
  await tabTo(page, page.getByRole('tab', { name: /Overview/ }));
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /Ledger/, selected: true })).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: /Run sheet/, selected: true })).toBeFocused();
});

test('the skip link is first and moves focus to the main content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('flow 3: ask the Planner and apply a suggestion with the keyboard only', async ({ page }) => {
  await page.goto('/');
  await tabTo(page, page.getByRole('button', { name: /Jaipur wedding/ }));
  await page.keyboard.press('Enter');
  await tabTo(page, page.getByRole('button', { name: /Set it in type/ }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Ananya & Kabir' })).toBeFocused();
  await tabTo(page, page.getByRole('button', { name: 'Ask the Planner' }));
  await page.keyboard.press('Enter');
  const letters = page.getByRole('complementary', { name: 'Letters to the Planner' });
  await expect(letters).toBeVisible();
  await tabTo(page, letters.getByLabel('Your question for the Planner'));
  await page.keyboard.type('We are short, what should I cut?');
  await tabTo(page, letters.getByRole('button', { name: 'Send' }));
  await page.keyboard.press('Enter');
  await expect(letters.getByText(/^Offline planner mode —/)).toBeVisible();
  const apply = letters.getByRole('button', { name: /^Apply: Move 3%/ });
  await tabTo(page, apply);
  await page.keyboard.press('Enter');
  await expect(letters.getByText(/^Moved 3%/)).toBeVisible();
  await expect(page.getByRole('article', { name: /Move 3%/ })).toBeFocused();
  await expect(page.getByText(/MOVED 3%.*· STOP/)).toBeVisible();
});

test('a tab panel is a single stop and Esc closes the removal dialog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Jaipur wedding/ }).click();
  await page.getByRole('button', { name: /Set it in type/ }).click();
  await page.getByRole('heading', { level: 1, name: 'Ananya & Kabir' }).waitFor();
  await page
    .getByRole('button', { name: /^Mehfil/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Remove Ananya & Kabir' }).click();
  await expect(page.getByRole('dialog', { name: 'Remove this plan?' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Remove Ananya & Kabir' })).toBeFocused();
});
