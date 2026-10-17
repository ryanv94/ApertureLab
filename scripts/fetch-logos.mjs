// Dev-time only: downloads brand logos into public/logos so the site never hotlinks them.
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';

const W = 'https://upload.wikimedia.org/wikipedia/commons/';
const SOURCES = {
  canon: W + '8/8d/Canon_logo.svg',
  sony: W + 'c/ca/Sony_logo.svg',
  nikon: W + 'f/f3/Nikon_Logo.svg',
  fujifilm: W + 'a/a1/Fujifilm_logo.svg',
  panasonic: W + '3/3e/Lumix_logo.svg',
  olympus: W + '2/2d/Olympus_Corporation_logo.svg',
  'om-system': W + 'b/bd/OMDS_OM-System-Logo.svg',
  leica: W + '8/8e/Leica_Camera.svg',
  pentax: W + '8/81/Pentax_Logo.svg',
  ricoh: W + '2/2e/Ricoh_logo_2005.svg',
  hasselblad: W + 'e/ef/Hasselblad_Logo_2015.png',
  apple: W + 'f/fa/Apple_logo_black.svg',
  google: W + '2/2f/Google_2015_logo.svg',
  samsung: W + 'b/b4/Samsung_wordmark.svg',
  dji: W + '9/9a/DJI_Innovations_logo.svg',
};

/** Give every SVG numeric width/height matching its viewBox, so <img> and canvas size it predictably. */
function normalise(svg) {
  return svg.replace(/<svg\b[^>]*>/, (tag) => {
    let t = tag;
    if (!/viewBox=/.test(t)) {
      const w = /\bwidth="([\d.]+)/.exec(t)?.[1], h = /\bheight="([\d.]+)/.exec(t)?.[1];
      if (w && h) t = t.replace('<svg', `<svg viewBox="0 0 ${w} ${h}"`);
    }
    const [, , vw, vh] = /viewBox="([^"]+)"/.exec(t)[1].trim().split(/[\s,]+/).map(Number);
    return t.replace(/\s(width|height)="[^"]*"/g, '').replace('<svg', `<svg width="${vw}" height="${vh}"`);
  });
}

for (const [id, url] of Object.entries(SOURCES)) {
  const res = await fetch(url, { headers: { 'User-Agent': 'ApertureLab-build/1.0 (https://aperturelab.cc)' } });
  if (!res.ok) { console.error(`${id}: HTTP ${res.status}`); process.exitCode = 1; continue; }
  const ext = url.endsWith('.png') ? 'png' : 'svg';
  const body = ext === 'svg'
    ? normalise(await res.text())
    : await sharp(Buffer.from(await res.arrayBuffer())).resize({ width: 800, withoutEnlargement: true }).png({ compressionLevel: 9, palette: true }).toBuffer();
  writeFileSync(new URL(`../public/logos/${id}.${ext}`, import.meta.url), body);
  console.log(`${id}.${ext}`);
}
