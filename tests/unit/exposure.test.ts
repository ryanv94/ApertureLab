import { describe, it, expect } from 'vitest';
import { ev100, targetShutter, ND_PRESETS } from '../../src/tools/exposure/logic';

const base = { baseS: 1 / 125, baseN: 8, baseIso: 100, targetN: 8, targetIso: 100 };

describe('exposure maths', () => {
  it('ev100', () => expect(ev100(1 / 125, 8, 100)).toBeCloseTo(12.97, 2));
  it('10-stop ND', () => expect(targetShutter({ ...base, filterStops: 10 })).toBeCloseTo(8.192, 6));
  it('20-stop ND', () => expect(targetShutter({ ...base, filterStops: 20 })).toBeCloseTo(8388.608, 3));
  it('stopping down two stops', () => expect(targetShutter({ ...base, targetN: 16, filterStops: 0 })).toBeCloseTo(0.032, 6));
  it('raising ISO two stops', () => expect(targetShutter({ ...base, targetIso: 400, filterStops: 0 })).toBeCloseTo(0.002, 6));
  it('ND presets span ND2..ND1000000', () => {
    expect(ND_PRESETS[0]).toEqual({ label: 'ND2', stops: 1 });
    expect(ND_PRESETS.at(-1)).toEqual({ label: 'ND1000000', stops: 20 });
    expect(ND_PRESETS.find((p) => p.label === 'ND1000')!.stops).toBe(10);
  });
});
