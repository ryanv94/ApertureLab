import { test, expect, PAGES } from './fixtures';

const PRIVACY = 'Your photos are processed entirely on your device and are never uploaded. We use anonymous analytics to improve the site.';

for (const name of PAGES) {
  test(`${name}: shared chrome`, async ({ page }) => {
    await page.goto(`/${name}.html`);
    const current = page.locator('nav a[aria-current="page"]');
    if (name === 'index') await expect(current).toHaveCount(0);
    else await expect(current.first()).toHaveAttribute('href', `${name}.html`);
    await expect(page.locator('footer')).toContainText(PRIVACY);
    expect(await page.content()).toContain('NREUM');
    await expect(page.locator('link[href*="fonts.googleapis"]')).toHaveCount(0);
    await expect(page.locator('script[src^="http"]')).toHaveCount(0);
  });

  test(`${name}: no horizontal overflow at 360px`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(`/${name}.html`);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw).toBeLessThanOrEqual(360);
  });
}

test('mobile menu opens, lists tools, closes on Esc', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/index.html');
  const btn = page.locator('[aria-controls="site-menu"]');
  await btn.click();
  const menu = page.locator('#site-menu');
  await expect(menu).toBeVisible();
  await expect(menu.locator('a[href$=".html"]:not([href="index.html"])')).toHaveCount(10);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(btn).toBeFocused();
});

test('skip link is first focusable and has visible focus', async ({ page }) => {
  await page.goto('/dof-visualizer.html');
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toHaveText(/Skip to content/);
  const outline = await focused.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
});
