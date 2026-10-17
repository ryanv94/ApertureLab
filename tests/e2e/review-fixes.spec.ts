import sharp from 'sharp';
import { test, expect, fixture } from './fixtures';

test('cropping a transparent PNG keeps transparency (exported as white in JPEG)', async ({ page, errors }) => {
  await page.goto('/resize-watermark.html');
  await page.setInputFiles('#drop input[type=file]', fixture('transparent.png'));
  await expect(page.locator('#thumbs li')).toHaveCount(1);
  await page.selectOption('#preset', 'original');
  await page.check('input[name="format"][value="jpeg"]', { force: true });
  await page.check('input[name="mode"][value="crop"]', { force: true });
  await page.locator('dialog.crop-dialog [data-act="apply"]').click();
  const dl = page.waitForEvent('download');
  await page.click('#download');
  const { data, info } = await sharp(await (await dl).path()).raw().toBuffer({ resolveWithObject: true });
  const i = (Math.round(info.height / 2) * info.width + 50) * info.channels;
  expect([data[i], data[i + 1], data[i + 2]].every((v) => v >= 250)).toBe(true);
  expect(errors).toEqual([]);
});

for (const [path, input] of [['exif-frame', '#drop'], ['resize-watermark', '#drop']] as const) {
  test(`${path}: a failed export shows an error instead of failing silently`, async ({ page }) => {
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback) { setTimeout(() => cb(null)); };
    });
    await page.goto(`/${path}.html`);
    await page.setInputFiles(`${input} input[type=file]`, fixture('photo-exif.jpg'));
    await expect(page.locator('#download')).toBeEnabled();
    await page.click('#download');
    await expect(page.locator('#err')).toBeVisible();
    await expect(page.locator('#err')).toContainText(/export/i);
  });
}

test('size estimate encodes a small trial, not the full image', async ({ page }) => {
  await page.addInitScript(() => {
    const areas: number[] = [];
    (window as unknown as { __areas: number[] }).__areas = areas;
    const orig = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (...args: Parameters<typeof orig>) { areas.push(this.width * this.height); return orig.apply(this, args); };
  });
  await page.goto('/resize-watermark.html');
  await page.setInputFiles('#drop input[type=file]', fixture('photo-exif.jpg'));
  await page.selectOption('#preset', 'original');
  await expect(page.locator('#est')).not.toHaveText('—');
  await page.waitForTimeout(600);
  const areas = await page.evaluate(() => (window as unknown as { __areas: number[] }).__areas);
  expect(areas.length).toBeGreaterThan(0);
  expect(Math.max(...areas)).toBeLessThanOrEqual(2_100_000);
});

test('SVG logo can be used as a watermark', async ({ page, errors }) => {
  await page.goto('/resize-watermark.html');
  await page.setInputFiles('#drop input[type=file]', fixture('photo-exif.jpg'));
  await expect(page.locator('#thumbs li')).toHaveCount(1);
  await page.check('input[name="wm"][value="image"]', { force: true });
  await page.setInputFiles('#wm-drop input[type=file]', 'public/icons/icon.svg');
  await expect(page.locator('#wm-image-name')).toHaveText('icon.svg');
  await expect(page.locator('#err')).toBeHidden();
  expect(errors).toEqual([]);
});
