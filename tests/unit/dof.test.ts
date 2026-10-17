import { describe, it, expect } from 'vitest';
import { computeDof, cocFor, SENSORS } from '../../src/tools/dof/logic';

describe('computeDof', () => {
  it('matches reference values for FF 50mm f/2.8 @ 3m', () => {
    const r = computeDof({ focalMm: 50, n: 2.8, distanceMm: 3000, cocMm: 0.030 });
    expect(r.hyperfocal).toBeCloseTo(29811.9, 0);
    expect(r.near).toBeCloseTo(2729.46, 1);
    expect(r.far).toBeCloseTo(3330.08, 1);
    expect(r.total).toBeCloseTo(600.62, 1);
    expect(r.front).toBeCloseTo(270.54, 1);
    expect(r.behind).toBeCloseTo(330.08, 1);
  });
  it('goes to infinity at or beyond hyperfocal', () => {
    const r = computeDof({ focalMm: 50, n: 2.8, distanceMm: 40000, cocMm: 0.030 });
    expect(r.far).toBe(Infinity);
    expect(r.total).toBe(Infinity);
    expect(r.behind).toBe(Infinity);
    expect(Number.isFinite(r.near)).toBe(true);
    expect(r.near).toBeLessThan(40000);
  });
});

describe('cocFor', () => {
  it('derives from crop factor', () => {
    expect(cocFor(1.5, 'default')).toBeCloseTo(0.02, 6);
    expect(cocFor(1, 'print')).toBeCloseTo(0.02, 6);
    expect(cocFor(1, 'custom', 25)).toBe(0.025);
  });
  it('lists the spec sensors', () => {
    expect(SENSORS.map((s) => s.id)).toEqual(['ff', 'apsc', 'apsc-canon', 'mft', 'one-inch', 'gfx', 'custom']);
  });
});
