import { describe, it, expect } from 'vitest';
import { formatShutter, formatDistance, formatBytes } from '../../src/lib/format';

describe('formatShutter', () => {
  it.each([
    [1 / 250, '1/250s'], [8.192, '8.2s'], [1, '1s'], [2.5, '2.5s'], [30, '30s'],
    [256, '4m 16s'], [8388.608, '2h 19m'], [3600, '1h 00m'],
  ])('%f → %s', (s, out) => expect(formatShutter(s)).toBe(out));
});

describe('formatDistance', () => {
  it.each([
    [2729.46, '2.73 m'], [Infinity, '∞'], [450, '45 cm'], [85, '8.5 cm'], [150000, '150 m'],
  ])('%f → %s', (mm, out) => expect(formatDistance(mm)).toBe(out));
});

describe('formatBytes', () => {
  it('formats KB and MB', () => {
    expect(formatBytes(842 * 1024)).toBe('842 KB');
    expect(formatBytes(3.4 * 1024 * 1024)).toBe('3.4 MB');
  });
});
