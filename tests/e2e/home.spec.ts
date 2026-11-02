import { test, expect } from './fixtures';
import { tools, PRIVACY } from '../../src/data/tools';

test('home is a field-book index of the 10 tools', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('h1')).toBeVisible();
  const frames = page.locator('a.tool-frame');
  await expect(frames).toHaveCount(10);
  for (const [i, t] of tools.entries()) {
    await expect(frames.nth(i)).toHaveAttribute('href', `${t.slug}.html`);
    await expect(frames.nth(i)).toContainText(t.frame);
    await expect(frames.nth(i)).toContainText(t.name);
    await expect(frames.nth(i)).toContainText(t.blurb);
  }
  await expect(page.locator('.privacy-block')).toContainText(PRIVACY);
});

test('home has no horizontal scroll at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/index.html');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});
