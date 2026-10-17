import { describe, it, expect } from 'vitest';
import { planResize, watermarkAnchor, outputName, SIZE_PRESETS } from '../../src/tools/resize/logic';

describe('planResize', () => {
  it('fill centre-crops to the target', () => {
    const p = planResize({ srcW: 4000, srcH: 3000, targetW: 1080, targetH: 1080, mode: 'fill' });
    expect([p.canvasW, p.canvasH]).toEqual([1080, 1080]);
    expect(p.src).toEqual({ x: 500, y: 0, w: 3000, h: 3000 });
  });
  it('fit contains without padding', () => {
    const p = planResize({ srcW: 4000, srcH: 3000, targetW: 1080, targetH: 1080, mode: 'fit' });
    expect([p.canvasW, p.canvasH]).toEqual([1080, 810]);
  });
  it('original size passes through', () => {
    const p = planResize({ srcW: 4000, srcH: 3000, targetW: 4000, targetH: 3000, mode: 'fit' });
    expect([p.canvasW, p.canvasH]).toEqual([4000, 3000]);
  });
  it('crop uses the given rect and derives height from its ratio', () => {
    const p = planResize({ srcW: 4000, srcH: 3000, targetW: 1000, targetH: null, mode: 'crop', crop: { x: 100, y: 100, w: 2000, h: 1000 } });
    expect([p.canvasW, p.canvasH]).toEqual([1000, 500]);
    expect(p.src).toEqual({ x: 100, y: 100, w: 2000, h: 1000 });
  });
  it('width-only target keeps aspect', () => {
    const p = planResize({ srcW: 4000, srcH: 3000, targetW: 2000, targetH: null, mode: 'fit' });
    expect([p.canvasW, p.canvasH]).toEqual([2000, 1500]);
  });
});

describe('watermark', () => {
  it('bottom-right with 3% margin', () => expect(watermarkAnchor(1000, 800, 200, 50, 'br', 3)).toEqual({ x: 776, y: 726 }));
  it('centre', () => expect(watermarkAnchor(1000, 800, 200, 50, 'mc', 3)).toEqual({ x: 400, y: 375 }));
});

it('output names', () => expect(outputName('IMG_1.HEIC.jpg', 1080, 1350, 'webp')).toBe('IMG_1.HEIC-1080x1350.webp'));
it('presets', () => expect(SIZE_PRESETS.map((p) => p.id)).toEqual(['original', 'ig-square', 'ig-portrait', 'ig-story', 'fhd', 'uhd', 'custom']));
