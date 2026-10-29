// Renders PNG icons from public/icons/icon.svg (transparent camera). Run: node scripts/make-icons.mjs
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const dir = new URL('../public/icons/', import.meta.url);
const svg = readFileSync(new URL('icon.svg', dir));
const out = (name) => new URL(name, dir).pathname;
const render = (size) => sharp(svg, { density: 1200 }).resize(size, size).png().toBuffer();

// Favicon / "any" PWA icons: transparent background.
await sharp(await render(32)).toFile(out('favicon-32.png'));
for (const size of [192, 512]) await sharp(await render(size)).toFile(out(`icon-${size}.png`));
// apple-touch and maskable need an opaque background; artwork sits inside the safe zone.
const onDark = async (size, art) => sharp({ create: { width: size, height: size, channels: 4, background: '#12100E' } })
  .composite([{ input: await render(art), left: (size - art) / 2, top: (size - art) / 2 }]).png();
await (await onDark(180, 130)).toFile(out('apple-touch-icon.png'));
await (await onDark(512, 360)).toFile(out('icon-maskable-512.png'));
console.log('icons written');
