import { test, expect, PAGES } from './fixtures';

for (const slug of PAGES) {
  test(`${slug}: uses brand fonts and tokens`, async ({ page, errors }) => {
    await page.goto(`/${slug}.html`);
    const info = await page.evaluate(async () => {
      await document.fonts.ready;
      const root = getComputedStyle(document.documentElement);
      return {
        body: getComputedStyle(document.body).fontFamily,
        h1: getComputedStyle(document.querySelector('h1')!).fontFamily,
        bg: root.getPropertyValue('--bg').trim().toLowerCase(),
        accent: root.getPropertyValue('--accent').trim().toLowerCase(),
        poppins: document.fonts.check('500 16px Poppins'),
      };
    });
    expect(info.body).toContain('Lora');
    expect(info.h1).toContain('Poppins');
    expect(info.bg).toBe('#141a1c');
    expect(info.accent).toBe('#f27a35');
    expect(info.poppins).toBe(true);
    expect(errors).toEqual([]);
  });
}
