import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import sharp from 'sharp';
import { test, expect, fixture } from './fixtures';

async function zipEntries(path: string) {
  const zip = await JSZip.loadAsync(await readFile(path));
  const out: { name: string; width?: number; height?: number }[] = [];
  for (const name of Object.keys(zip.files).sort()) {
    const m = await sharp(await zip.files[name].async('nodebuffer')).metadata();
    out.push({ name, width: m.width, height: m.height });
  }
  return out;
}

test('splits a panorama into 4:5 Instagram slides, with optional cover', async ({ page, errors }) => {
  await page.goto('/panorama-splitter.html');
  await page.setInputFiles('#drop input[type=file]', fixture('pano.jpg'));
  await page.check('input[name="ratio"][value="4x5"]', { force: true });
  await page.fill('#count', '3');
  await page.dispatchEvent('#count', 'change');
  await page.check('input[name="output"][value="ig"]', { force: true });
  await expect(page.locator('#slides canvas')).toHaveCount(3);

  let dl = page.waitForEvent('download');
  await page.click('#download-zip');
  let entries = await zipEntries(await (await dl).path());
  expect(entries.map((e) => e.name)).toEqual(['slide-01.jpg', 'slide-02.jpg', 'slide-03.jpg']);
  for (const e of entries) expect([e.width, e.height]).toEqual([1080, 1350]);

  await page.check('#cover');
  await expect(page.locator('#slides canvas')).toHaveCount(4);
  dl = page.waitForEvent('download');
  await page.click('#download-zip');
  entries = await zipEntries(await (await dl).path());
  expect(entries).toHaveLength(4);
  expect(entries[0].name).toBe('slide-00-cover.jpg');
  expect(errors).toEqual([]);
});

test('huge panorama at native size warns instead of failing', async ({ page, errors }) => {
  await page.goto('/panorama-splitter.html');
  await page.check('input[name="output"][value="native"]', { force: true });
  await page.check('#cover');
  await page.setInputFiles('#drop input[type=file]', fixture('huge-pano.jpg'));
  await expect(page.locator('#warn')).toBeVisible();
  await expect(page.locator('#slides canvas').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('custom ratio fields only show for Custom', async ({ page }) => {
  await page.goto('/panorama-splitter.html');
  await expect(page.locator('#custom-ratio')).toBeHidden();
  await page.check('input[name="ratio"][value="custom"]', { force: true });
  await expect(page.locator('#custom-ratio')).toBeVisible();
});
