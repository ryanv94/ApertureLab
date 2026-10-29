// Builds the site's logo SVGs from the master artwork in logo/ (recoloured to the safelight red):
//   logo/logo.svg (with RV PHOTOGRAPHY ring) -> public/icons/logo.svg   (page header)
//   logo/icon.svg (camera only)              -> public/icons/icon.svg   (favicon, on a dark rounded square)
// Then run make-icons.mjs for the PNG app icons. Run: node scripts/make-logo.mjs && node scripts/make-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const ACCENT = '#E5352B';
const load = (name) => {
  const src = readFileSync(new URL(`../logo/${name}`, import.meta.url), 'utf8');
  const viewBox = src.match(/viewBox="([^"]+)"/)[1];
  const art = src.match(/<g\s+id="layer1"[\s\S]*<\/g>/)[0]
    .replace(/\s+id="[^"]*"/g, '')
    .replace(/\s+(sodipodi|inkscape):[\w-]+="[^"]*"/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/#ff6600/gi, ACCENT);
  return { viewBox, art };
};
const out = (p) => new URL(`../public/icons/${p}`, import.meta.url);

const logo = load('logo.svg');
writeFileSync(out('logo.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${logo.viewBox}">${logo.art}</svg>\n`);

const icon = load('icon.svg');
writeFileSync(out('icon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#12100E"/>
  <svg x="8" y="8" width="48" height="48" viewBox="${icon.viewBox}">${icon.art}</svg>
</svg>\n`);
console.log('logo + icon svg written');
