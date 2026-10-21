import { expect, test } from '@playwright/test';

test('a sample becomes a plan with a focused heading and library ideas', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Mehfil' })).toBeVisible();
  await page.getByRole('button', { name: /Jaipur wedding/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: /The Invitation/ })).toBeFocused();
  await expect(page.getByLabel(/Number of guests/)).toHaveValue('250');
  await page.getByRole('button', { name: /Set it in type/ }).click();
  const heading = page.getByRole('heading', { level: 1, name: 'Ananya & Kabir' });
  await expect(heading).toBeFocused();
  await expect(page).toHaveTitle('Ananya & Kabir · Overview — Mehfil');
  await expect(page.getByText('WORKABLE', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /Ideas/ }).click();
  await expect(page.getByText('FROM THE MEHFIL LIBRARY')).toBeVisible();
  await expect(page.getByRole('article').first()).toBeVisible();
  expect(await page.getByRole('article').count()).toBeGreaterThanOrEqual(6);
});

test('an incomplete form shows an error summary that links to the fields', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Begin a plan/ }).click();
  await page.getByRole('button', { name: /Set it in type/ }).click();
  await expect(page.getByText('Check these before setting it in type')).toBeVisible();
  await page.getByRole('link', { name: 'Number of guests' }).click();
  await expect(page.getByLabel(/Number of guests/)).toBeFocused();
});

test('health endpoint reports that AI is disabled without a key', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(await res.json()).toMatchObject({ status: 'ok', ai: 'disabled' });
  const headers = res.headers();
  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['x-powered-by']).toBeUndefined();
});
