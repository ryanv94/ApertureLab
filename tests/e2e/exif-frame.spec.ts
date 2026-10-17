import sharp from 'sharp';
import { test, expect, fixture } from './fixtures';

test('reads EXIF, frames and exports at full resolution with no third-party requests', async ({ page, errors }) => {
  const external: string[] = [];
  page.on('request', (r) => { const h = new URL(r.url()).hostname; if (!['localhost', '127.0.0.1'].includes(h) && !/nr-data|newrelic/.test(h) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push(r.url()); });
  await page.goto('/exif-frame.html');
  await page.setInputFiles('#drop input[type=file]', fixture('photo-exif.jpg'));
  await expect(page.locator('#f-model')).toHaveValue('ILCE-7M4');
  await expect(page.locator('#brand-auto')).toContainText('Sony');
  await expect(page.locator('#f-lens')).toHaveValue('FE 24-70mm F2.8 GM II');
  await expect(page.locator('#f-focal')).toHaveValue('50');
  await expect(page.locator('#f-aperture')).toHaveValue('2.8');
  await expect(page.locator('#f-shutter')).toHaveValue('1/250s');
  await expect(page.locator('#f-iso')).toHaveValue('100');

  const dl = page.waitForEvent('download');
  await page.click('#download');
  const file = await dl;
  expect(file.suggestedFilename()).toBe('photo-exif-framed.jpg');
  const meta = await sharp(await file.path()).metadata();
  expect(meta.width).toBe(3200);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('missing EXIF fields stay blank', async ({ page }) => {
  await page.goto('/exif-frame.html');
  await page.setInputFiles('#drop input[type=file]', fixture('nikon-exif.jpg'));
  await expect(page.locator('#f-model')).toHaveValue('Z 6_2');
  await expect(page.locator('#brand-auto')).toContainText('Nikon');
  await expect(page.locator('#f-lens')).toHaveValue('');
  for (const id of ['f-model', 'f-lens', 'f-focal', 'f-aperture', 'f-shutter', 'f-iso']) {
    expect(await page.locator(`#${id}`).inputValue()).not.toMatch(/undefined|NaN/);
  }
});
