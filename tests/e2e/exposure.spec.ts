import { test, expect } from './fixtures';

async function setBase(page: import('@playwright/test').Page) {
  await page.selectOption('#base-shutter', { label: '1/125s' });
  await page.selectOption('#base-aperture', { label: 'f/8' });
  await page.selectOption('#base-iso', { label: 'ISO 100' });
  await page.selectOption('#target-aperture', { label: 'f/8' });
  await page.selectOption('#target-iso', { label: 'ISO 100' });
}

test('stacks ND filters and formats long exposures', async ({ page, errors }) => {
  await page.goto('/exposure-calculator.html');
  await setBase(page);
  await page.selectOption('#nd-add', { label: 'ND1000 (10 stops)' });
  await page.click('#nd-add-btn');
  await expect(page.locator('#r-shutter')).toHaveText('8.2s');
  await page.locator('#filters li button').first().click();
  await page.selectOption('#nd-add', { label: 'ND1000000 (20 stops)' });
  await page.click('#nd-add-btn');
  await expect(page.locator('#r-shutter')).toHaveText('2h 19m');
  expect(errors).toEqual([]);
});

test('bulb timer counts down without alert()', async ({ page }) => {
  let dialogs = 0;
  page.on('dialog', (d) => { dialogs++; d.dismiss(); });
  await page.clock.install();
  await page.goto('/exposure-calculator.html');
  await setBase(page);
  await page.selectOption('#nd-add', { label: 'ND1000 (10 stops)' });
  await page.click('#nd-add-btn');
  await expect(page.locator('#timer')).toBeVisible();
  await page.click('#timer-toggle');
  await page.clock.runFor(9500);
  await expect(page.locator('#timer')).toHaveAttribute('data-state', 'done');
  expect(dialogs).toBe(0);
});
