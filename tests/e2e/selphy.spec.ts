import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { test, expect, fixture } from './fixtures';

test('fills a slot via the cropper and exports a 300 DPI sheet', async ({ page, errors }) => {
  await page.goto('/selphy-layout.html');
  await expect(page.locator('#download')).toBeDisabled();
  await page.setInputFiles('#slot1-drop input[type=file]', fixture('photo-exif.jpg'));
  const dialog = page.locator('dialog.crop-dialog');
  await expect(dialog.locator('.cropper-container')).toBeVisible();
  await dialog.locator('[data-act="apply"]').click();
  await expect(page.locator('#download')).toBeEnabled();
  const dl = page.waitForEvent('download');
  await page.click('#download');
  const file = await dl;
  expect(file.suggestedFilename()).toBe('selphy-magnets.jpg');
  const path = await file.path();
  const m = await sharp(path).metadata();
  expect([m.width, m.height]).toEqual([1800, 1200]);
  const b = await readFile(path);
  expect([...b.subarray(13, 18)]).toEqual([0x01, 0x01, 0x2c, 0x01, 0x2c]);
  expect(errors).toEqual([]);
});

test('same image for both slots', async ({ page }) => {
  await page.goto('/selphy-layout.html');
  await page.check('#same');
  await page.setInputFiles('#slot1-drop input[type=file]', fixture('photo-exif.jpg'));
  await page.locator('dialog.crop-dialog [data-act="apply"]').click();
  await expect(page.locator('#slot2-status')).toContainText('Same as magnet 1');
});
