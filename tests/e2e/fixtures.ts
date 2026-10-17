import { test as base, expect } from '@playwright/test';

export const PAGES = [
  'index', 'dof-visualizer', 'exposure-calculator', 'resize-watermark', 'exif-frame',
  'panorama-splitter', 'color-palette', 'golden-hour', 'print-visualizer', 'selphy-layout',
] as const;

export const fixture = (name: string) => `tests/fixtures/${name}`;

type Fixtures = { errors: string[] };

/** Stubs New Relic and collects console errors / page errors for every test. */
export const test = base.extend<Fixtures>({
  errors: async ({ page }, use) => {
    const errors: string[] = [];
    await page.route(/(nr-data\.net|newrelic\.com)/, (route) => route.fulfill({ status: 204, body: '' }));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));
    await use(errors);
  },
});

export { expect };
