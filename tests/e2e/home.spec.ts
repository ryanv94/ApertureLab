import { test, expect } from './fixtures';
import { tools, PRIVACY } from '../../src/data/tools';

test('home is a contact sheet of the 9 tools', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('h1')).toBeVisible();
  const frames = page.locator('a.tool-frame');
  await expect(frames).toHaveCount(9);
  for (const [i, t] of tools.entries()) {
    await expect(frames.nth(i)).toHaveAttribute('href', `${t.slug}.html`);
    await expect(frames.nth(i)).toContainText(t.frame);
    await expect(frames.nth(i)).toContainText(t.name);
  }
  await expect(page.locator('.privacy-block')).toContainText(PRIVACY);
});
