import { test, expect, PAGES } from './fixtures';

for (const slug of PAGES) {
  test(`${slug}: uses brand fonts and tokens`, async ({ page, errors }) => {
    await page.goto(`/${slug}.html`);
    const info = await page.evaluate(async () => {
      await document.fonts.ready;
      const root = getComputedStyle(document.documentElement);
      return {
        body: getComputedStyle(document.body).fontFamily,
        h1: getComputedStyle(document.querySelector('h1')!).fontFamily,
        bg: root.getPropertyValue('--bg').trim().toLowerCase(),
        accent: root.getPropertyValue('--accent').trim().toLowerCase(),
        poppins: document.fonts.check('500 16px Poppins'),
      };
    });
    expect(info.body).toContain('Lora');
    expect(info.h1).toContain('Poppins');
    expect(info.bg).toBe('#141a1c');
    expect(info.accent).toBe('#f27a35');
    expect(info.poppins).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('head links, theme colour and manifest use the brand', async ({ page, request, baseURL }) => {
  await page.goto('/index.html');
  expect(await page.locator('meta[name=theme-color]').getAttribute('content')).toBe('#141A1C');
  for (const sel of ['link[rel=icon][type="image/svg+xml"]', 'link[rel=apple-touch-icon]']) {
    const href = await page.locator(sel).getAttribute('href');
    expect((await request.get(new URL(href!, baseURL + '/index.html').href)).status()).toBe(200);
  }
  const m = await (await request.get('/manifest.webmanifest')).json();
  expect(m.name).toBe('ApertureLab');
  expect(m.theme_color).toBe('#141A1C');
  expect(m.background_color).toBe('#141A1C');
  for (const i of m.icons) expect((await request.get('/' + i.src)).status()).toBe(200);
  expect((await request.get('/favicon.ico')).status()).toBe(200);
});

test('header shows the symbol and wordmark', async ({ page }) => {
  await page.goto('/index.html');
  const wm = page.locator('.site-header .wordmark');
  await expect(wm).toContainText('Aperture');
  const box = await wm.locator('img, svg').first().boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(24);
});

test('footer RV lockup keeps its minimum size at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/index.html');
  const l = page.locator('.rv-lockup');
  await expect(l).toBeVisible();
  expect((await l.boundingBox())!.width).toBeGreaterThanOrEqual(140);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});

for (const slug of PAGES) {
  test(`${slug}: Darkroom motifs are gone, ridge divider present`, async ({ page }) => {
    await page.goto(`/${slug}.html`);
    await expect(page.locator('.film-strip')).toHaveCount(0);
    expect(await page.locator('body').innerText()).not.toMatch(/▸\s*\d\d/);
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundImage)).toBe('none');
    expect(await page.evaluate(() => getComputedStyle(document.body, '::before').content)).toBe('none');
    if (slug === 'index') await expect(page.locator('main .ridge')).toHaveCount(1);
    else await expect(page.locator('.tool-header .ridge')).toHaveCount(1);
    await expect(page.locator('.site-footer .ridge')).toHaveCount(1);
  });
}
