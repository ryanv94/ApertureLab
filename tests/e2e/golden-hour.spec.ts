import { test, expect } from './fixtures';

test('denied geolocation shows a message and focuses city search', async ({ page, errors }) => {
  await page.goto('/golden-hour.html');
  await page.click('#use-location');
  await expect(page.locator('#loc-err')).toBeVisible();
  await expect(page.locator('#city')).toBeFocused();
  expect(errors).toEqual([]);
});

test('city search + date gives local times in the city time zone', async ({ page, errors }) => {
  await page.goto('/golden-hour.html');
  await page.fill('#city', 'Dub');
  await page.locator('#city-list [role=option]', { hasText: 'Dublin' }).first().click();
  await page.fill('#date', '2026-12-21');
  await page.dispatchEvent('#date', 'change');
  await expect(page.locator('#tz-label')).toContainText('Europe/Dublin');
  await expect(page.locator('#r-sunrise')).toHaveText(/08:3\d|08:40/);
  await expect(page.locator('#timeline .seg')).not.toHaveCount(0);
  expect(errors).toEqual([]);
});

test.describe('with GPS', () => {
  test.use({ geolocation: { latitude: 51.5074, longitude: -0.1278 }, permissions: ['geolocation'] });
  test('uses the nearest city time zone', async ({ page }) => {
    await page.goto('/golden-hour.html');
    await page.click('#use-location');
    await expect(page.locator('#tz-label')).toContainText('Europe/London');
  });
});
