// Builds public/icons/logo.svg (clean header logo) and public/icons/icon.svg (favicon / app icon)
// from the master artwork in logo/logo.svg, then run make-icons.mjs for the PNGs.
// Run: node scripts/make-logo.mjs && node scripts/make-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync(new URL('../logo/logo.svg', import.meta.url), 'utf8');
const viewBox = src.match(/viewBox="([^"]+)"/)[1];
const art = src.match(/<g\s+id="layer1"[\s\S]*<\/g>/)[0]
  .replace(/\s+id="[^"]*"/g, '')
  .replace(/\s+(sodipodi|inkscape):[\w-]+="[^"]*"/g, '')
  .replace(/\s{2,}/g, ' ');

const out = (p) => new URL(`../public/icons/${p}`, import.meta.url);
writeFileSync(out('logo.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${art}</svg>\n`);
writeFileSync(out('icon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#12100E"/>
  <svg x="7" y="7" width="50" height="50" viewBox="${viewBox}">${art}</svg>
</svg>\n`);
console.log('logo + icon svg written');
