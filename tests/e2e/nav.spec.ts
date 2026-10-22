import { test, expect, PAGES } from './fixtures';
import { tools } from '../../src/data/tools';

const toolPages = PAGES.filter((p) => p !== 'index');

test('every tool is in the nav data and has a page', () => {
  expect(tools.map((t) => t.slug).sort()).toEqual([...toolPages].sort());
  expect(tools.find((t) => t.slug === 'collage')?.name).toBe('Collage');
});

for (const name of PAGES) {
  test.describe(`${name}: desktop nav`, () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('lists every tool, marks the current page, and every link resolves', async ({ page, request, baseURL }) => {
      await page.goto(`/${name}.html`);
      const links = page.locator('nav.desktop a');
      await expect(links).toHaveCount(tools.length);
      await expect(page.locator('nav.desktop a[aria-current="page"]')).toHaveCount(name === 'index' ? 0 : 1);
      for (const t of tools) {
        const href = await links.filter({ hasText: t.short }).first().getAttribute('href');
        expect(href).toBe(`${t.slug}.html`);
        expect((await request.get(`${baseURL}/${href}`)).status()).toBe(200);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  });
}

test('desktop nav fits without overflow at the 1100px breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/collage.html');
  const bar = page.locator('.site-header .bar');
  const overflow = await bar.evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('clicking through the whole desktop nav reaches every tool', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/index.html');
  for (const t of tools) {
    await page.locator('nav.desktop a', { hasText: t.short }).first().click();
    await expect(page).toHaveURL(new RegExp(`/${t.slug}\\.html$`));
    await expect(page.locator('h1')).toHaveText(t.name);
    await expect(page.locator('nav.desktop a[aria-current="page"]')).toContainText(t.short);
  }
  await page.locator('.site-header .wordmark').click();
  await expect(page).toHaveURL(/\/index\.html$/);
});

test.describe('mobile menu', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test('opens, lists every tool including Collage, navigates, and closes', async ({ page }) => {
    await page.goto('/index.html');
    for (const t of tools) {
      await page.locator('.menu-btn').click();
      const menu = page.locator('#site-menu');
      await expect(menu).toBeVisible();
      await expect(menu.locator('.sheet-frame')).toHaveCount(tools.length);
      await menu.locator('.sheet-frame', { hasText: t.name }).click();
      await expect(page).toHaveURL(new RegExp(`/${t.slug}\\.html$`));
    }
    await page.locator('.menu-btn').click();
    await page.locator('.menu-close').click();
    await expect(page.locator('#site-menu')).toBeHidden();
  });
});

test('home contact sheet links to every tool', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('a.tool-frame')).toHaveCount(tools.length);
  await page.locator('a.tool-frame', { hasText: 'Collage' }).click();
  await expect(page).toHaveURL(/\/collage\.html$/);
});
