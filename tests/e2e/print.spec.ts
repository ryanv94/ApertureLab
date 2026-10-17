import { test, expect, fixture } from './fixtures';

test('rates every print size and lets you move the crop', async ({ page, errors }) => {
  await page.goto('/print-visualizer.html');
  await page.setInputFiles('#drop input[type=file]', fixture('photo-exif.jpg'));
  const row = page.locator('#sizes tr[data-id="8x10"]');
  await expect(row).toContainText('250');
  await expect(row).toContainText('Good');
  await expect(page.locator('#sizes tr[data-id="a4"]')).toBeVisible();
  await row.click();
  const box = page.locator('#crop-box');
  const before = await box.evaluate((el) => el.style.left);
  const bb = (await box.boundingBox())!;
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.mouse.down();
  await page.mouse.move(bb.x + bb.width / 2 - 60, bb.y + bb.height / 2, { steps: 5 });
  await page.mouse.up();
  expect(await box.evaluate((el) => el.style.left)).not.toBe(before);
  expect(errors).toEqual([]);
});
