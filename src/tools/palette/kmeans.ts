import { rgbToLab, labToRgb, toHex, type RGB, type Lab } from './color';

export type Swatch = { hex: string; rgb: RGB; share: number };

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const d2 = (p: Lab, q: Lab) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;

/** k-means++ clustering in Lab space over RGBA pixels; pixels with alpha < 128 are ignored. */
export function kmeans(pixels: Uint8ClampedArray, k: number, opts: { maxIter?: number; seed?: number } = {}): Swatch[] {
  const { maxIter = 20, seed = 1 } = opts;
  const rand = mulberry32(seed);
  const pts: Lab[] = [];
  for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] >= 128) pts.push(rgbToLab(pixels[i], pixels[i + 1], pixels[i + 2]));
  if (!pts.length) return [];

  // k-means++ seeding
  const centres: Lab[] = [pts[Math.floor(rand() * pts.length)]];
  const dist = new Float64Array(pts.length).fill(Infinity);
  while (centres.length < k) {
    let sum = 0;
    const last = centres[centres.length - 1];
    for (let i = 0; i < pts.length; i++) { dist[i] = Math.min(dist[i], d2(pts[i], last)); sum += dist[i]; }
    if (sum === 0) break; // fewer distinct colours than k
    let r = rand() * sum, i = 0;
    while (r > dist[i] && i < pts.length - 1) r -= dist[i++];
    centres.push(pts[i]);
  }

  const assign = new Int32Array(pts.length);
  for (let iter = 0; iter < maxIter; iter++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      let best = 0, bd = Infinity;
      for (let c = 0; c < centres.length; c++) { const d = d2(pts[i], centres[c]); if (d < bd) { bd = d; best = c; } }
      if (assign[i] !== best) { assign[i] = best; moved = true; }
    }
    const acc = centres.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < pts.length; i++) { const a = acc[assign[i]]; a[0] += pts[i][0]; a[1] += pts[i][1]; a[2] += pts[i][2]; a[3]++; }
    acc.forEach((a, c) => { if (a[3]) centres[c] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; });
    if (!moved && iter > 0) break;
  }

  const counts = new Array(centres.length).fill(0);
  for (let i = 0; i < pts.length; i++) counts[assign[i]]++;
  return centres
    .map((c, i) => { const rgb = labToRgb(...c); return { hex: toHex(...rgb), rgb, share: counts[i] / pts.length }; })
    .filter((s) => s.share > 0)
    .sort((a, b) => b.share - a.share);
}
