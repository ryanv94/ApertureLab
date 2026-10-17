import { describe, it, expect } from 'vitest';
import { fitWithin, guardCanvasSize, validateFile, setJpegDpi } from '../../src/lib/image';

describe('geometry', () => {
  it('fitWithin scales longest edge', () => expect(fitWithin(6000, 4000, 2048)).toEqual({ width: 2048, height: 1365 }));
  it('fitWithin leaves small images alone', () => expect(fitWithin(800, 600, 2048)).toEqual({ width: 800, height: 600 }));
  it('guardCanvasSize caps edge', () => expect(guardCanvasSize(30000, 2000)).toEqual({ width: 16384, height: 1092, capped: true }));
  it('guardCanvasSize caps area', () => {
    const r = guardCanvasSize(20000, 20000);
    expect(r.width * r.height).toBeLessThanOrEqual(268_435_456);
    expect(r.capped).toBe(true);
  });
  it('guardCanvasSize passes normal sizes', () => expect(guardCanvasSize(6000, 4000)).toEqual({ width: 6000, height: 4000, capped: false }));
});

describe('validateFile', () => {
  it('explains HEIC', () => {
    const r = validateFile(new File([''], 'a.heic', { type: 'image/heic' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/HEIC/);
  });
  it('rejects text', () => {
    const r = validateFile(new File(['x'], 'notes.txt', { type: 'text/plain' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("isn't an image");
  });
  it('accepts jpeg', () => expect(validateFile(new File(['x'], 'a.jpg', { type: 'image/jpeg' })).ok).toBe(true));
});

const bytes = async (b: Blob) => new Uint8Array(await b.arrayBuffer());

describe('setJpegDpi', () => {
  it('rewrites an existing JFIF density', async () => {
    const src = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9]);
    const out = await bytes(await setJpegDpi(new Blob([src], { type: 'image/jpeg' }), 300));
    expect(out[13]).toBe(1);
    expect([out[14], out[15], out[16], out[17]]).toEqual([0x01, 0x2c, 0x01, 0x2c]);
    expect(out.length).toBe(src.length);
  });
  it('inserts JFIF when missing', async () => {
    const out = await bytes(await setJpegDpi(new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' }), 300));
    expect([out[0], out[1], out[2], out[3]]).toEqual([0xff, 0xd8, 0xff, 0xe0]);
    expect(out[13]).toBe(1);
    expect([out[14], out[15]]).toEqual([0x01, 0x2c]);
    expect([out.at(-2), out.at(-1)]).toEqual([0xff, 0xd9]);
  });
});

describe('browser canvas limits', () => {
  it('guardCanvasSize honours a smaller (iOS Safari) area limit', () => {
    const r = guardCanvasSize(8000, 6000, 16_777_216);
    expect(r.capped).toBe(true);
    expect(r.width * r.height).toBeLessThanOrEqual(16_777_216);
    expect(r.width / r.height).toBeCloseTo(8000 / 6000, 2);
  });
  it('validateFile accepts SVG only when asked', () => {
    const svg = new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' });
    expect(validateFile(svg).ok).toBe(false);
    expect(validateFile(svg, { allowSvg: true }).ok).toBe(true);
  });
});
