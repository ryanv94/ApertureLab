import sharp from 'sharp';
import { test, expect, fixture } from './fixtures';

const PORTRAIT = fixture('portrait-orient6.jpg');

test('Print DPI reads the upright dimensions', async ({ page }) => {
  await page.goto('/print-visualizer.html');
  await page.setInputFiles('#drop input[type=file]', PORTRAIT);
  await expect(page.locator('#dims')).toContainText('2000 × 3000');
});

test('Resize exports upright with the red band on the right', async ({ page }) => {
  await page.goto('/resize-watermark.html');
  await page.setInputFiles('#drop input[type=file]', PORTRAIT);
  await expect(page.locator('#thumbs li')).toHaveCount(1); // thumbnail strip shifts the controls; wait for it
  await page.selectOption('#preset', 'original');
  await page.check('input[name="format"][value="png"]', { force: true });
  await expect(page.locator('input[name="format"][value="png"]')).toBeChecked();
  const dl = page.waitForEvent('download');
  await page.click('#download');
  const { data, info } = await sharp(await (await dl).path()).raw().toBuffer({ resolveWithObject: true });
  expect([info.width, info.height]).toEqual([2000, 3000]);
  const px = (x: number, y: number) => { const i = (y * info.width + x) * info.channels; return [data[i], data[i + 1], data[i + 2]]; };
  const [r, g] = px(1950, 1500);
  expect(r).toBeGreaterThan(200);
  expect(g).toBeLessThan(60);
  expect(px(50, 1500)[0]).toBeLessThan(200);
});

test('EXIF Frame frames the upright image', async ({ page }) => {
  await page.goto('/exif-frame.html');
  await page.setInputFiles('#drop input[type=file]', PORTRAIT);
  const dl = page.waitForEvent('download');
  await page.click('#download');
  const m = await sharp(await (await dl).path()).metadata();
  expect(m.width).toBe(2200);
  expect(m.height).toBeGreaterThan(m.width!);
});
