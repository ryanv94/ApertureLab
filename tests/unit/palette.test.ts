import { describe, it, expect } from 'vitest';
import { kmeans } from '../../src/tools/palette/kmeans';
import { rgbToLab, toHex } from '../../src/tools/palette/color';
import { computeHistograms } from '../../src/tools/palette/histogram';
import { paletteCss } from '../../src/tools/palette/export';

const COLOURS: [number, number, number][] = [[0xe5, 0x35, 0x2b], [0xf2, 0xb5, 0x44], [0x1f, 0x3f, 0xd1], [0xff, 0xff, 0xff]];

function quadrants(): Uint8ClampedArray {
  const n = 100, data = new Uint8ClampedArray(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const c = COLOURS[(y < n / 2 ? 0 : 2) + (x < n / 2 ? 0 : 1)];
    data.set([...c, 255], (y * n + x) * 4);
  }
  return data;
}
const dE = (a: [number, number, number], b: [number, number, number]) => {
  const p = rgbToLab(...a), q = rgbToLab(...b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};

describe('kmeans', () => {
  it('recovers four flat colours with equal shares', () => {
    const sw = kmeans(quadrants(), 4, { seed: 1 });
    expect(sw).toHaveLength(4);
    for (const c of COLOURS) expect(sw.some((s) => dE(s.rgb, c) < 2)).toBe(true);
    for (const s of sw) expect(s.share).toBeCloseTo(0.25, 2);
  });
  it('ignores transparent pixels', () => {
    const d = quadrants();
    for (let i = 3; i < d.length; i += 4) d[i] = 0;
    expect(kmeans(d, 3, { seed: 1 })).toEqual([]);
  });
});

describe('colour helpers', () => {
  it('white in Lab', () => {
    const [L, a, b] = rgbToLab(255, 255, 255);
    expect(L).toBeCloseTo(100, 1); expect(a).toBeCloseTo(0, 1); expect(b).toBeCloseTo(0, 1);
  });
  it('hex is lowercase', () => expect(toHex(229, 53, 43)).toBe('#e5352b'));
});

it('histograms count channels', () => {
  const d = new Uint8ClampedArray(40);
  for (let i = 0; i < 40; i += 4) d.set([255, 0, 0, 255], i);
  const h = computeHistograms(d, 1);
  expect(h.r[255]).toBe(10);
  expect(h.g[0]).toBe(10);
});

it('palette CSS', () => {
  expect(paletteCss([{ hex: '#e5352b', rgb: [229, 53, 43], share: 1 }])).toContain('--palette-1: #e5352b;');
});
