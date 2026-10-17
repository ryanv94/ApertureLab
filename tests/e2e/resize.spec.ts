import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import sharp from 'sharp';
import { test, expect, fixture } from './fixtures';

test('fills to Instagram portrait and exports JPEG', async ({ page, errors }) => {
  await page.goto('/resize-watermark.html');
  await page.setInputFiles('#drop input[type=file]', fixture('photo-exif.jpg'));
  await page.selectOption('#preset', 'ig-portrait');
  await page.check('input[name="mode"][value="fill"]', { force: true });
  await expect(page.locator('#est')).not.toHaveText('—');
  const before = await page.locator('#est').textContent();
  await page.check('input[name="wm"][value="text"]', { force: true });
  await page.fill('#wm-text', '© Test');
  await page.dispatchEvent('#wm-text', 'input');
  await expect(page.locator('#est')).not.toHaveText(before!);
  const dl = page.waitForEvent('download');
  await page.click('#download');
  const file = await dl;
  expect(file.suggestedFilename()).toBe('photo-exif-1080x1350.jpg');
  const m = await sharp(await file.path()).metadata();
  expect([m.width, m.height]).toEqual([1080, 1350]);
  expect(errors).toEqual([]);
});

test('transparent PNG exported as JPEG gets a white background', async ({ page }) => {
  await page.goto('/resize-watermark.html');
  await page.setInputFiles('#drop input[type=file]', fixture('transparent.png'));
  await page.selectOption('#preset', 'original');
  await page.check('input[name="format"][value="jpeg"]', { force: true });
  const dl = page.waitForEvent('download');
  await page.click('#download');
  const { data, info } = await sharp(await (await dl).path()).raw().toBuffer({ resolveWithObject: true });
  const i = (300 * info.width + 100) * info.channels;
  expect([data[i], data[i + 1], data[i + 2]].every((v) => v >= 250)).toBe(true);
});

test('batch download zips every image', async ({ page }) => {
  await page.goto('/resize-watermark.html');
  await page.setInputFiles('#drop input[type=file]', [fixture('transparent.png'), fixture('pano.jpg')]);
  await expect(page.locator('#thumbs li')).toHaveCount(2);
  const dl = page.waitForEvent('download');
  await page.click('#download-all');
  const zip = await JSZip.loadAsync(await readFile(await (await dl).path()));
  expect(Object.keys(zip.files)).toHaveLength(2);
});

test('rejects non-images inline', async ({ page }) => {
  await page.goto('/resize-watermark.html');
  await page.setInputFiles('#drop input[type=file]', fixture('not-image.txt'));
  await expect(page.locator('#err')).toBeVisible();
  await expect(page.locator('#err')).toContainText("isn't an image");
});

test('crop dialog opens, rotates and applies', async ({ page, errors }) => {
  await page.goto('/resize-watermark.html');
  await page.setInputFiles('#drop input[type=file]', fixture('photo-exif.jpg'));
  await page.check('input[name="mode"][value="crop"]', { force: true });
  const dialog = page.locator('dialog.crop-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.cropper-container')).toBeVisible();
  await dialog.locator('[data-act="right"]').click();
  await dialog.locator('[data-act="apply"]').click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('#out-dims')).toHaveText('1080 × 1350px');
  expect(errors).toEqual([]);
});
