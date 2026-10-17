import { describe, it, expect } from 'vitest';
import { SHUTTER_THIRDS, APERTURE_THIRDS, APERTURE_FULL, ISO_THIRDS } from '../../src/lib/stops';

describe('stop scales', () => {
  it('shutter runs 30s → 1/8000s in 55 third stops', () => {
    expect(SHUTTER_THIRDS[0].label).toBe('30s');
    expect(SHUTTER_THIRDS.at(-1)!.label).toBe('1/8000s');
    expect(SHUTTER_THIRDS).toHaveLength(55);
    const s125 = SHUTTER_THIRDS.find((s) => s.label === '1/125s')!;
    expect(Math.abs(s125.value - 1 / 128)).toBeLessThan(1e-9);
  });
  it('apertures include 0.95, 2.8 and 32', () => {
    const labels = APERTURE_THIRDS.map((a) => a.label);
    expect(labels).toEqual(expect.arrayContaining(['f/0.95', 'f/2.8', 'f/32']));
    expect(APERTURE_FULL.map((a) => a.label)).toEqual(['f/0.95', 'f/1', 'f/1.4', 'f/2', 'f/2.8', 'f/4', 'f/5.6', 'f/8', 'f/11', 'f/16', 'f/22', 'f/32']);
  });
  it('ISO runs 50 → 102400 and includes 100', () => {
    expect(ISO_THIRDS[0].label).toBe('50');
    expect(ISO_THIRDS.at(-1)!.label).toBe('102400');
    expect(ISO_THIRDS.map((i) => i.label)).toContain('100');
  });
  it('consecutive entries differ by a third of a stop', () => {
    for (const scale of [SHUTTER_THIRDS, ISO_THIRDS, APERTURE_THIRDS.slice(1)]) {
      for (let i = 1; i < scale.length; i++) expect(Math.abs(Math.abs(scale[i].ev - scale[i - 1].ev) - 1 / 3)).toBeLessThan(1e-9);
    }
  });
});
