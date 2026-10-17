// Renders PNG app icons from public/icons/icon.svg. Run: node scripts/make-icons.mjs
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const dir = new URL('../public/icons/', import.meta.url);
const svg = readFileSync(new URL('icon.svg', dir));
const out = (name) => new URL(name, dir).pathname;

for (const size of [192, 512]) await sharp(svg, { density: 600 }).resize(size, size).png().toFile(out(`icon-${size}.png`));
await sharp(svg, { density: 600 }).resize(180, 180).flatten({ background: '#12100E' }).png().toFile(out('apple-touch-icon.png'));
// Maskable: full-bleed background, artwork inside the 80% safe zone.
const inner = await sharp(svg, { density: 600 }).resize(400, 400).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#12100E' } })
  .composite([{ input: inner, left: 56, top: 56 }]).png().toFile(out('icon-maskable-512.png'));
console.log('icons written');
