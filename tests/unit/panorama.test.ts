import { describe, it, expect } from 'vitest';
import { planSlices, planCover, outputScale, RATIOS } from '../../src/tools/panorama/logic';

describe('planSlices crop', () => {
  it('centres a contiguous band', () => {
    const p = planSlices({ imgW: 9000, imgH: 1500, count: 3, ratio: 0.8, mode: 'crop', offset: 0.5 });
    expect(p.slideW).toBe(1200);
    expect(p.slideH).toBe(1500);
    expect(p.slices[0].src.x).toBe(2700);
    for (let i = 1; i < 3; i++) expect(p.slices[i].src.x).toBe(p.slices[i - 1].src.x + 1200);
  });
  it('offset 0 starts at the left edge', () => {
    expect(planSlices({ imgW: 9000, imgH: 1500, count: 3, ratio: 0.8, mode: 'crop', offset: 0 }).slices[0].src.x).toBe(0);
  });
  it('shrinks slide height when the band is wider than the image', () => {
    const p = planSlices({ imgW: 9000, imgH: 1500, count: 10, ratio: 1, mode: 'crop', offset: 0.5 });
    expect(p.slideH).toBe(900);
    expect(p.slideW).toBe(900);
    expect(p.slices[0].src.x).toBe(0);
    expect(p.slices[0].src.y).toBe(300);
  });
});

describe('planSlices fit', () => {
  it('letterboxes when the panorama is shorter than the slides', () => {
    const p = planSlices({ imgW: 9000, imgH: 1500, count: 3, ratio: 0.8, mode: 'fit', offset: 0.5 });
    expect(p.slideW).toBe(3000);
    expect(p.slideH).toBe(3750);
    expect(p.slices[1].src).toEqual({ x: 3000, y: 0, w: 3000, h: 1500 });
    expect(p.slices[1].dst).toEqual({ x: 0, y: 1125, w: 3000, h: 1500 });
  });
});

describe('cover and output', () => {
  it('cover letterboxes the whole image into the ratio', () => {
    const c = planCover({ imgW: 9000, imgH: 1500, ratio: 0.8 });
    expect(c.canvasW / c.canvasH).toBeCloseTo(0.8, 5);
    expect(c.dst.w).toBe(c.canvasW);
    expect(c.dst.h).toBeCloseTo(c.canvasW / 6, 5);
  });
  it('instagram output is 1080 wide', () => expect(outputScale(1200, 'ig')).toBe(0.9));
  it('ratios are the spec set', () => expect(RATIOS.map((r) => r.id)).toEqual(['4x5', '1x1', '191x1', '9x16', 'custom']));
});
