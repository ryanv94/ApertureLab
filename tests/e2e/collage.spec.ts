import { test, expect, fixture } from './fixtures';
import type { Page } from '@playwright/test';

const photos = (n: number, from = 1) => Array.from({ length: n }, (_, i) => fixture(`photo-${from + i}.jpg`));

async function load(page: Page, files: string[]) {
  await page.goto('/collage.html?debug');
  await page.setInputFiles('#drop input[type=file]', files);
  await expect(page.locator('#thumbs li')).toHaveCount(Math.min(files.length, 10));
  // render is rAF-deferred: wait for the first layout
  await expect.poll(async () => ((await cells(page)) ?? []).length).toBe(Math.min(files.length, 10));
}

type Cell = { x: number; y: number; w: number; h: number; photo: number };
const cells = (page: Page) => page.evaluate(() => (window as any).__collageCells as Cell[]);

test('8 photos give 8 thumbs, a visible stage, no error', async ({ page }) => {
  await load(page, photos(8));
  await expect(page.locator('#stage')).toBeVisible();
  await expect(page.locator('#err')).toBeHidden();
  await expect(page.locator('#export-png')).toBeEnabled();
  expect(await cells(page)).toHaveLength(8);
});

test('5 photos show an inline error and keep export disabled', async ({ page }) => {
  await load(page, photos(5));
  await expect(page.locator('#err')).toContainText(/at least 6/i);
  await expect(page.locator('#export-png')).toBeDisabled();
});

test('more than 10 photos are rejected inline, first 10 kept', async ({ page }) => {
  await load(page, photos(6));
  await page.setInputFiles('#drop input[type=file]', photos(5, 6));
  await expect(page.locator('#thumbs li')).toHaveCount(10);
  await expect(page.locator('#err')).toContainText(/at most 10/i);
});

test('HEIC and non-images are rejected but valid files are kept', async ({ page }) => {
  await page.goto('/collage.html?debug');
  await page.setInputFiles('#drop input[type=file]', [...photos(6), fixture('bad.heic'), fixture('not-image.txt')]);
  await expect(page.locator('#thumbs li')).toHaveCount(6);
  await expect(page.locator('#err')).toContainText(/HEIC/);
});

test('hero is centred and largest; toggling again clears it', async ({ page }) => {
  await load(page, photos(8));
  const li = page.locator('#thumbs li').nth(2);
  await li.getByRole('button', { name: /hero/i }).click();
  await expect(li.getByRole('button', { name: /hero/i })).toHaveAttribute('aria-pressed', 'true');
  const area = (c: Cell) => c.w * c.h;
  const heroIsLargest = async () => {
    const cs = await cells(page);
    const h = cs.find((c) => c.photo === 2)!;
    return cs.every((c) => area(h) >= area(c) - 1e-6);
  };
  await expect.poll(heroIsLargest).toBe(true); // render is rAF-deferred
  const cs = await cells(page);
  const hero = cs.find((c) => c.photo === 2)!;
  const dims = await page.evaluate(() => ({ w: +(document.querySelector('#w') as HTMLInputElement).value, h: +(document.querySelector('#h') as HTMLInputElement).value }));
  expect(Math.abs(hero.x + hero.w / 2 - dims.w / 2)).toBeLessThan(dims.w * 0.1);
  expect(Math.abs(hero.y + hero.h / 2 - dims.h / 2)).toBeLessThan(dims.h * 0.1);
  await li.getByRole('button', { name: /hero/i }).click();
  await expect(li.getByRole('button', { name: /hero/i })).toHaveAttribute('aria-pressed', 'false');
});

test('shuffle changes the arrangement', async ({ page }) => {
  await load(page, photos(8));
  const before = JSON.stringify(await cells(page));
  await page.click('#shuffle');
  await expect.poll(async () => JSON.stringify(await cells(page))).not.toBe(before);
});

test('flip swaps width and height', async ({ page }) => {
  await page.goto('/collage.html?debug');
  await page.click('#flip');
  await expect(page.locator('#w')).toHaveValue('297');
  await expect(page.locator('#h')).toHaveValue('210');
  await expect(page.locator('#preset')).toHaveValue('a4');
});

test('preset sets size; custom entry switches preset to custom', async ({ page }) => {
  await page.goto('/collage.html?debug');
  await page.selectOption('#preset', 'a3');
  await expect(page.locator('#w')).toHaveValue('297');
  await expect(page.locator('#h')).toHaveValue('420');
  await page.fill('#w', '250');
  await expect(page.locator('#preset')).toHaveValue('custom');
});

test('unit switch keeps the physical size', async ({ page }) => {
  await page.goto('/collage.html?debug');
  await page.locator('#unit label', { hasText: 'inches' }).click();
  expect(Number(await page.inputValue('#w'))).toBeCloseTo(8.268, 2);
  await page.locator('#unit label', { hasText: 'mm' }).click();
  await expect(page.locator('#w')).toHaveValue('210');
});

test('margin larger than the canvas never breaks the layout', async ({ page }) => {
  await load(page, photos(8));
  await page.selectOption('#preset', 'a6');
  await page.locator('#margin').fill('50');
  await page.locator('#gap').fill('30');
  const cs = await cells(page);
  for (const c of cs) {
    expect(c.w).toBeGreaterThan(0);
    expect(c.h).toBeGreaterThan(0);
  }
});

test('drag from one cell onto another swaps their photos', async ({ page }) => {
  await load(page, photos(8));
  const before = await cells(page);
  const box = (await page.locator('#stage').boundingBox())!;
  const dims = await page.evaluate(() => ({ w: +(document.querySelector('#w') as HTMLInputElement).value, h: +(document.querySelector('#h') as HTMLInputElement).value }));
  const pos = (c: Cell) => ({
    x: box.x + ((c.x + c.w / 2) / dims.w) * box.width,
    y: box.y + ((c.y + c.h / 2) / dims.h) * box.height,
  });
  const a = pos(before[0]);
  const b = pos(before[1]);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await page.mouse.up();
  await expect.poll(async () => (await cells(page))[0].photo).toBe(before[1].photo);
  const after = await cells(page);
  expect(after[1].photo).toBe(before[0].photo);
  for (let i = 2; i < before.length; i++) expect(after[i].photo).toBe(before[i].photo);
  expect(after.map(({ x, y, w, h }) => [x, y, w, h])).toEqual(before.map(({ x, y, w, h }) => [x, y, w, h]));
});

test('dropping in a margin changes nothing', async ({ page }) => {
  await load(page, photos(8));
  const before = JSON.stringify(await cells(page));
  const box = (await page.locator('#stage').boundingBox())!;
  const c0 = (await cells(page))[0];
  const dims = await page.evaluate(() => ({ w: +(document.querySelector('#w') as HTMLInputElement).value, h: +(document.querySelector('#h') as HTMLInputElement).value }));
  const sx = box.x + ((c0.x + c0.w / 2) / dims.w) * box.width;
  const sy = box.y + ((c0.y + c0.h / 2) / dims.h) * box.height;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(box.x + 2, box.y + 2, { steps: 4 }); // inside the 10mm margin
  await page.mouse.up();
  await page.waitForTimeout(100);
  expect(JSON.stringify(await cells(page))).toBe(before);
});

test('arrow keys on a thumbnail swap it with its neighbour', async ({ page }) => {
  await load(page, photos(8));
  const before = await cells(page);
  await page.locator('#thumbs li').nth(0).focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await cells(page)).find((c) => c.photo === 0)!.x).toBe(before.find((c) => c.photo === 1)!.x);
});

async function exportAs(page: Page, id: string) {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click(`#${id}`)]);
  const fs = await import('node:fs/promises');
  const buf = await fs.readFile((await dl.path())!);
  return { name: dl.suggestedFilename(), buf };
}

test.describe('export', () => {
  test.beforeEach(async ({ page }) => {
    await load(page, photos(8));
    await page.selectOption('#preset', 'a6');
    await page.fill('#dpi', '72');
  });
  test('PNG carries a pHYs chunk', async ({ page }) => {
    const { name, buf } = await exportAs(page, 'export-png');
    expect(name).toMatch(/^collage-105x148mm-72dpi\.png$/);
    expect(buf.subarray(1, 4).toString()).toBe('PNG');
    expect(buf.includes(Buffer.from('pHYs'))).toBe(true);
  });
  test('JPEG is a valid JPEG', async ({ page }) => {
    const { name, buf } = await exportAs(page, 'export-jpg');
    expect(name).toMatch(/\.jpg$/);
    expect([buf[0], buf[1]]).toEqual([0xff, 0xd8]);
  });
  test('PDF starts with %PDF and has the A6 page size', async ({ page }) => {
    const { buf } = await exportAs(page, 'export-pdf');
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buf.toString('latin1')).toContain('/MediaBox [0 0 297.64 419.53]');
  });
  test('a huge size at a high DPI shows the cap notice instead of crashing', async ({ page }) => {
    await page.selectOption('#preset', 'a0');
    await page.selectOption('#dpi-preset', '600');
    await expect(page.locator('#notice')).toContainText(/exceeds/i);
    await expect(page.locator('#export-png')).toBeEnabled();
  });
});

/** Slows decoding/encoding so races (parallel adds, mid-export edits) are deterministic. */
async function slow(page: Page, ms = 250) {
  await page.addInitScript((delay) => {
    const w = window as any;
    w.__inflightFull = 0;
    w.__maxFull = 0;
    const orig = window.createImageBitmap.bind(window);
    (window as any).createImageBitmap = async (src: any, ...rest: any[]) => {
      const isFile = src instanceof Blob;
      if (isFile) { w.__inflightFull++; w.__maxFull = Math.max(w.__maxFull, w.__inflightFull); }
      await new Promise((r) => setTimeout(r, delay));
      try { return await orig(src, ...rest); } finally { if (isFile) w.__inflightFull--; }
    };
  }, ms);
}

test('uploads decode one full-size photo at a time', async ({ page }) => {
  await slow(page, 30);
  await page.goto('/collage.html?debug');
  await page.setInputFiles('#drop input[type=file]', photos(8));
  await expect(page.locator('#thumbs li')).toHaveCount(8);
  expect(await page.evaluate(() => (window as any).__maxFull)).toBe(1);
});

test('two quick adds never exceed 10 photos', async ({ page }) => {
  await slow(page);
  await page.goto('/collage.html?debug');
  await page.setInputFiles('#drop input[type=file]', photos(4));
  await page.setInputFiles('#drop input[type=file]', photos(6, 5));
  await page.setInputFiles('#drop input[type=file]', photos(6, 5));
  await expect(page.locator('#err')).toContainText(/at most 10/i);
  await page.waitForTimeout(1500);
  await expect(page.locator('#thumbs li')).toHaveCount(10);
});

test('export buttons stay disabled while an export runs, even after settings change', async ({ page }) => {
  await load(page, photos(8));
  await slow(page, 400);
  await page.reload();
  await page.setInputFiles('#drop input[type=file]', photos(8));
  await expect(page.locator('#thumbs li')).toHaveCount(8);
  await page.selectOption('#preset', 'a6');
  await page.fill('#dpi', '72');
  const dl = page.waitForEvent('download');
  await page.click('#export-png');
  await page.locator('#margin').fill('20'); // triggers a re-render mid-export
  await page.waitForTimeout(100);
  await expect(page.locator('#export-png')).toBeDisabled();
  await expect(page.locator('#export-pdf')).toBeDisabled();
  await dl;
  await expect(page.locator('#export-png')).toBeEnabled();
});

test('removing a photo mid-export does not break the export', async ({ page }) => {
  await slow(page, 200);
  await page.goto('/collage.html?debug');
  await page.setInputFiles('#drop input[type=file]', photos(8));
  await expect(page.locator('#thumbs li')).toHaveCount(8);
  await page.selectOption('#preset', 'a6');
  await page.fill('#dpi', '72');
  const dl = page.waitForEvent('download');
  await page.click('#export-png');
  await page.locator('#thumbs li').nth(0).getByRole('button', { name: /remove/i }).click();
  await dl;
  await expect(page.locator('#err')).not.toContainText(/undefined|TypeError|Cannot read/);
});

// ---- shell / responsive / a11y ----
const IDS = ['drop', 'err', 'unit', 'preset', 'w', 'h', 'flip', 'dpi-preset', 'dpi', 'margin', 'gap', 'bg',
  'shuffle', 'thumbs', 'stage', 'readout', 'export-png', 'export-jpg', 'export-pdf', 'notice'];

test('shell has every control', async ({ page }) => {
  await page.goto('/collage.html');
  for (const id of IDS) await expect(page.locator(`#${id}`), id).toHaveCount(1);
});

test('every input is labelled and export starts disabled', async ({ page }) => {
  await page.goto('/collage.html');
  const unlabeled = await page.evaluate(() =>
    [...document.querySelectorAll('input:not([type=radio]):not([type=file]), select')].filter(
      (el) => !(el as HTMLInputElement).labels?.length,
    ).map((el) => el.id),
  );
  expect(unlabeled).toEqual([]);
  for (const id of ['export-png', 'export-jpg', 'export-pdf']) await expect(page.locator(`#${id}`)).toBeDisabled();
});

test('no horizontal scroll at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/collage.html');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

const files8 = Array.from({ length: 8 }, (_, i) => fixture(`photo-${i + 1}.jpg`));


test.describe('360px', () => {
test.use({ viewport: { width: 360, height: 800 } });
test('no horizontal scroll with photos loaded and the cap notice showing', async ({ page }) => {
  await page.goto('/collage.html');
  await page.setInputFiles('#drop input[type=file]', files8);
  await expect(page.locator('#thumbs li')).toHaveCount(8);
  await page.selectOption('#preset', 'a0');
  await page.selectOption('#dpi-preset', '600');
  await expect(page.locator('#notice')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('hero buttons expose aria-pressed and inputs are labelled', async ({ page }) => {
  await page.goto('/collage.html');
  await page.setInputFiles('#drop input[type=file]', files8);
  await expect(page.locator('#thumbs li')).toHaveCount(8);
  for (const b of await page.getByRole('button', { name: /hero/i }).all()) {
    await expect(b).toHaveAttribute('aria-pressed', /true|false/);
  }
  const unlabeled = await page.evaluate(() =>
    [...document.querySelectorAll('input:not([type=radio]):not([type=file]), select')]
      .filter((el) => !(el as HTMLInputElement).labels?.length).map((el) => el.id));
  expect(unlabeled).toEqual([]);
});
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('develop reveal does not animate', async ({ page }) => {
    await page.goto('/collage.html');
    const name = await page.locator('.develop').first().evaluate((el) => getComputedStyle(el).animationName);
    expect(name).toBe('none');
  });
});
