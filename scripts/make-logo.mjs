// Builds the site's logo SVGs from the master artwork in logo/ (recoloured to the safelight red):
//   logo/logo.svg (with RV PHOTOGRAPHY ring) -> public/icons/logo.svg   (page header)
//   logo/icon.svg (camera only)              -> public/icons/icon.svg   (favicon, transparent background)
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
// Transparent, square canvas (camera centred) so the favicon has no background.
const [, , iw, ih] = icon.viewBox.split(' ').map(Number);
const side = Math.max(iw, ih);
const square = `${-(side - iw) / 2} ${-(side - ih) / 2} ${side} ${side}`;
writeFileSync(out('icon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${square}">${icon.art}</svg>\n`);
console.log('logo + icon svg written');
