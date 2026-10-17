import { it, expect } from 'vitest';
import { computeFrame } from '../../src/tools/exif-frame/layout';

it('even border is uniform and captioned', () => {
  const f = computeFrame({ imgW: 3000, imgH: 2000, layout: 'even', thicknessPct: 5 });
  expect(f.image).toEqual({ x: 100, y: 100, w: 3000, h: 2000 });
  expect(f.canvasW).toBe(3200);
  expect(f.caption.h).toBeGreaterThan(0);
});

it('bar layout has a taller bottom caption than its side border', () => {
  const f = computeFrame({ imgW: 3000, imgH: 2000, layout: 'bar', thicknessPct: 5 });
  expect(f.caption.h).toBeGreaterThan(f.image.x);
  expect(f.canvasH).toBe(f.image.y + f.image.h + f.caption.h);
});

it('bar layout with zero border still has a caption strip', () => {
  const f = computeFrame({ imgW: 3000, imgH: 2000, layout: 'bar', thicknessPct: 0 });
  expect(f.image.x).toBe(0);
  expect(f.caption.h).toBeGreaterThan(0);
});

it('polaroid bottom is thicker than the even caption', () => {
  const p = computeFrame({ imgW: 3000, imgH: 2000, layout: 'polaroid', thicknessPct: 5 });
  const e = computeFrame({ imgW: 3000, imgH: 2000, layout: 'even', thicknessPct: 5 });
  expect(p.canvasH - p.image.y - p.image.h).toBeGreaterThan(e.canvasH - e.image.y - e.image.h);
});
