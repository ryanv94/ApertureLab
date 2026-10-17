import { describe, it, expect } from 'vitest';
import { printFit, rateDpi, maxPrint, PRINT_SIZES } from '../../src/tools/print/logic';

describe('printFit', () => {
  it('auto-rotates to landscape and centre-crops', () => {
    const r = printFit({ imgW: 6000, imgH: 4000, wIn: 8, hIn: 10, orientation: 'auto' });
    expect([r.printW, r.printH]).toEqual([10, 8]);
    expect(r.src).toEqual({ x: 500, y: 0, w: 5000, h: 4000 });
    expect(r.dpi).toBe(500);
    expect(r.cropPct).toBe(16.7);
  });
  it('matching ratio loses nothing', () => {
    const r = printFit({ imgW: 6000, imgH: 4000, wIn: 4, hIn: 6, orientation: 'auto' });
    expect(r.dpi).toBe(1000);
    expect(r.cropPct).toBe(0);
  });
  it('honours forced portrait', () => {
    const r = printFit({ imgW: 6000, imgH: 4000, wIn: 4, hIn: 6, orientation: 'portrait' });
    expect([r.printW, r.printH]).toEqual([4, 6]);
    expect(r.src.h).toBe(4000);
  });
});

it('rates DPI', () => {
  expect(rateDpi(300)).toBe('excellent');
  expect(rateDpi(299)).toBe('good');
  expect(rateDpi(150)).toBe('acceptable');
  expect(rateDpi(149)).toBe('low');
});

it('max print size', () => {
  const m = maxPrint(6000, 4000, 300);
  expect(m.wIn).toBe(20);
  expect(m.hIn).toBeCloseTo(13.333, 3);
  expect(m.wMm).toBeCloseTo(508, 0);
});

it('includes inch and ISO A sizes', () => {
  const ids = PRINT_SIZES.map((s) => s.id);
  expect(ids).toEqual(expect.arrayContaining(['4x6', '8x10', '24x36', 'a6', 'a4', 'a1']));
  const a4 = PRINT_SIZES.find((s) => s.id === 'a4')!;
  expect(a4.wIn).toBeCloseTo(210 / 25.4, 5);
});
