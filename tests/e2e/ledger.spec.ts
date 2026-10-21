import { expect, test } from '@playwright/test';

import { createJaipurPlan, openTab } from './helpers';

test('changing a share keeps the total exact and survives a reload (AC10)', async ({ page }) => {
  await createJaipurPlan(page);
  await openTab(page, 'Ledger');
  const photo = page.getByRole('spinbutton', { name: 'Photo & video share in percent' });
  await expect(photo).toHaveValue('10.0');
  await page.getByRole('button', { name: 'Increase Photo & video by 0.5 percent' }).click();
  await expect(photo).toHaveValue('10.5');
  const table = page.getByRole('table');
  await expect(table).toHaveAccessibleName('Budget allocation, total ₹12,00,000');
  await expect(table.getByRole('row', { name: /^Total/ })).toContainText('100.0%');
  await expect(table.getByRole('row', { name: /^Total/ })).toContainText('₹12,00,000');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Ananya & Kabir' })).toBeVisible();
  await expect(
    page.getByRole('spinbutton', { name: 'Photo & video share in percent' }),
  ).toHaveValue('10.5');
  await page.getByRole('button', { name: 'Reset to recommended' }).click();
  await expect(
    page.getByRole('spinbutton', { name: 'Photo & video share in percent' }),
  ).toHaveValue('10.0');
});

test('ticked tasks persist across a reload', async ({ page }) => {
  await createJaipurPlan(page);
  await openTab(page, 'Timetable');
  await page.getByRole('checkbox', { name: 'Book the venue' }).check();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Book the venue' })).toBeChecked();
});
