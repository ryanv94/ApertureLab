import sharp from 'sharp';
import { test, expect, fixture } from './fixtures';

// Phone emulation: touch + no hover, so exports open the press-and-hold save sheet instead of downloading.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

const naturalSize = (img: import('@playwright/test').Locator) =>
  img.evaluate(async (el: HTMLImageElement) => { await el.decode(); return [el.naturalWidth, el.naturalHeight]; });

test('EXIF Frame shows the full-resolution result as a long-pressable image', async ({ page, errors }) => {
  await page.goto('/exif-frame.html');
  await page.setInputFiles('#drop input[type=file]', fixture('photo-exif.jpg'));
  await expect(page.locator('#f-model')).toHaveValue('ILCE-7M4');
  await page.click('#download');
  const sheet = page.locator('dialog.save-dialog');
  await expect(sheet).toBeVisible();
  const img = sheet.locator('img');
  await expect(img).toHaveCount(1);
  expect((await naturalSize(img))[0]).toBe(3200);
  expect(await img.evaluate((el) => getComputedStyle(el).getPropertyValue('-webkit-touch-callout') || 'default')).not.toBe('none');

  const dl = page.waitForEvent('download');
  await sheet.locator('[data-act="download"]').click();
  const file = await dl;
  expect(file.suggestedFilename()).toBe('photo-exif-framed.jpg');
  expect((await sharp(await file.path()).metadata()).width).toBe(3200);

  await sheet.locator('[data-act="close"]').last().click();
  await expect(page.locator('dialog.save-dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Panorama "Save all" shows every slide as an image, not a ZIP', async ({ page, errors }) => {
  await page.goto('/panorama-splitter.html');
  await page.setInputFiles('#drop input[type=file]', fixture('pano.jpg'));
  await page.check('input[name="ratio"][value="4x5"]', { force: true });
  await page.fill('#count', '3');
  await page.dispatchEvent('#count', 'change');
  await page.check('input[name="output"][value="ig"]', { force: true });
  await expect(page.locator('#slides canvas')).toHaveCount(3);
  await expect(page.locator('#download-zip')).toHaveText('Save all');
  await page.click('#download-zip');
  const imgs = page.locator('dialog.save-dialog img');
  await expect(imgs).toHaveCount(3);
  for (let i = 0; i < 3; i++) expect(await naturalSize(imgs.nth(i))).toEqual([1080, 1350]);
  expect(errors).toEqual([]);
});

test('SELPHY sheet opens in the save sheet', async ({ page, errors }) => {
  await page.goto('/selphy-layout.html');
  await page.setInputFiles('#slot1-drop input[type=file]', fixture('photo-exif.jpg'));
  await page.locator('dialog.crop-dialog [data-act="apply"]').click();
  await page.click('#download');
  const img = page.locator('dialog.save-dialog img');
  await expect(img).toHaveCount(1);
  expect(await naturalSize(img)).toEqual([1800, 1200]);
  expect(errors).toEqual([]);
});
