import { test, expect } from './fixtures';

test('reads state from URL and computes limits', async ({ page, errors }) => {
  await page.goto('/dof-visualizer.html?s=ff&f=50&n=2.8&d=3');
  await expect(page.locator('#r-near')).toHaveText('2.73 m');
  await expect(page.locator('#r-far')).toHaveText('3.33 m');
  await page.locator('#distance-num').fill('40');
  await page.locator('#distance-num').dispatchEvent('change');
  await expect(page.locator('#r-far')).toHaveText('∞');
  await expect(page.locator('#r-total')).toHaveText('∞');
  expect(errors).toEqual([]);
});

test('changing focal length updates the URL', async ({ page }) => {
  await page.goto('/dof-visualizer.html');
  await page.locator('#focal-num').fill('85');
  await page.locator('#focal-num').dispatchEvent('change');
  await expect(page).toHaveURL(/[?&]f=85\b/);
  await expect(page.locator('#diagram rect.zone')).toHaveCount(1);
});
