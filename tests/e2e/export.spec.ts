import { expect, test } from '@playwright/test';
import fs from 'node:fs';

import { createJaipurPlan, openTab } from './helpers';

test('Add to calendar downloads a valid .ics file', async ({ page }) => {
  await createJaipurPlan(page);
  await openTab(page, 'Timetable');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Add to calendar (.ics)' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('ananya-kabir.ics');
  const text = fs.readFileSync(await download.path(), 'utf8');
  expect(text.startsWith('BEGIN:VCALENDAR')).toBe(true);
  expect(text).toContain('SUMMARY:Book the venue');
  expect(text).toContain('\r\n');
  expect(text.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  await expect(page.getByText(/SAVED ANANYA-KABIR\.ICS/)).toBeVisible();
});
