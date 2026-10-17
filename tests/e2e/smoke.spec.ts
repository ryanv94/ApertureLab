import { test, expect, PAGES } from './fixtures';

for (const name of PAGES) {
  test(`${name} loads without errors`, async ({ page, errors }) => {
    const res = await page.goto(`/${name}.html`);
    expect(res?.status()).toBe(200);
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });
}
