import { test, expect } from './fixtures';

test('manifest describes the app', async ({ page, request }) => {
  await page.goto('/index.html');
  const href = await page.locator('link[rel=manifest]').getAttribute('href');
  const m = await (await request.get(`/${href}`)).json();
  expect(m.name).toBe('ApertureLab');
  expect(m.theme_color).toBe('#12100E');
  expect(m.background_color).toBe('#12100E');
  const sizes = m.icons.map((i: { sizes: string; purpose?: string }) => `${i.sizes}:${i.purpose ?? 'any'}`);
  expect(sizes).toEqual(expect.arrayContaining(['192x192:any', '512x512:any', '512x512:maskable']));
});

test('works offline after the first visit', async ({ page, context }) => {
  await page.goto('/index.html');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.goto('/dof-visualizer.html');
  await expect(page.locator('h1')).toHaveText('Depth of Field');
  await context.setOffline(false);
});

test('removes the legacy aperturelab-v2 cache', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(async () => { await caches.open('aperturelab-v2'); });
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    await reg.unregister();
  });
  await page.reload();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => caches.has('aperturelab-v2'))).toBe(false);
});
