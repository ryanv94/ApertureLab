import { test, expect, fixture } from './fixtures';

test('extracts swatches and copies a hex code', async ({ page, context, errors }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/color-palette.html');
  await page.locator('#k').fill('4');
  await page.locator('#k').dispatchEvent('input');
  await page.setInputFiles('#drop input[type=file]', fixture('palette.png'));
  const swatches = page.locator('#swatches .swatch');
  await expect(swatches).toHaveCount(4);
  await expect(page.locator('#swatches')).toContainText('#e5352b');
  await swatches.first().click();
  await expect(page.locator('.toast')).toBeVisible();
  expect(errors).toEqual([]);
});
