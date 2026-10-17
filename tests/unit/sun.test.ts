import { describe, it, expect, afterEach } from 'vitest';
import { sunDay, formatInTz, buildTimeline } from '../../src/tools/golden-hour/sun';

const mins = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const near = (actual: string, expected: string, tol = 2) => expect(Math.abs(mins(actual) - mins(expected))).toBeLessThanOrEqual(tol);

describe('sunDay', () => {
  const origTZ = process.env.TZ;
  afterEach(() => { process.env.TZ = origTZ; });

  it('London midsummer', () => {
    const d = sunDay('2026-06-21', 51.5074, -0.1278, 'Europe/London');
    near(formatInTz(d.sunrise!, 'Europe/London'), '04:43');
    near(formatInTz(d.sunset!, 'Europe/London'), '21:21');
  });
  it('Dublin midwinter', () => {
    const d = sunDay('2026-12-21', 53.3498, -6.2603, 'Europe/Dublin');
    near(formatInTz(d.sunrise!, 'Europe/Dublin'), '08:39');
    near(formatInTz(d.sunset!, 'Europe/Dublin'), '16:08');
  });
  it('uses the location time zone, not the device one', () => {
    process.env.TZ = 'America/New_York';
    const d = sunDay('2026-01-15', -33.8688, 151.2093, 'Australia/Sydney');
    const t = mins(formatInTz(d.sunrise!, 'Australia/Sydney'));
    expect(t).toBeGreaterThanOrEqual(mins('05:50'));
    expect(t).toBeLessThanOrEqual(mins('06:05'));
  });
  it('applies DST on the changeover day', () => {
    const t = mins(formatInTz(sunDay('2026-03-29', 51.5074, -0.1278, 'Europe/London').sunrise!, 'Europe/London'));
    expect(t).toBeGreaterThanOrEqual(mins('06:38'));
    expect(t).toBeLessThanOrEqual(mins('06:48'));
  });
  it('orders phases and keeps blue hour distinct from sunset', () => {
    const d = sunDay('2026-06-21', 51.5074, -0.1278, 'Europe/London');
    const seq = [d.blueAm![0], d.blueAm![1], d.goldenAm![0], d.sunrise!, d.goldenAm![1], d.noon, d.goldenPm![0], d.sunset!, d.goldenPm![1], d.bluePm![0], d.bluePm![1]].map((x) => x.getTime());
    for (let i = 1; i < seq.length; i++) expect(seq[i]).toBeGreaterThanOrEqual(seq[i - 1]);
    expect(d.blueAm![0].getTime()).toBeLessThan(d.blueAm![1].getTime());
    expect(d.bluePm![0].getTime()).toBeGreaterThan(d.sunset!.getTime());
  });
  it('detects polar day and night', () => {
    const summer = sunDay('2026-06-21', 69.6492, 18.9553, 'Europe/Oslo');
    expect(summer.polar).toBe('day');
    expect(summer.sunrise).toBeUndefined();
    expect(sunDay('2026-12-21', 69.6492, 18.9553, 'Europe/Oslo').polar).toBe('night');
  });
});

it('timeline is contiguous across the local day', () => {
  const d = sunDay('2026-06-21', 51.5074, -0.1278, 'Europe/London');
  const segs = buildTimeline(d);
  expect(segs[0].startMin).toBe(0);
  expect(segs.at(-1)!.endMin).toBe(1440);
  for (let i = 1; i < segs.length; i++) expect(segs[i].startMin).toBe(segs[i - 1].endMin);
  expect(segs.map((s) => s.phase)).toEqual(expect.arrayContaining(['night', 'blue', 'golden', 'day']));
});

it('timeline uses wall-clock minutes on a DST changeover day', () => {
  const tz = 'America/New_York';
  const d = sunDay('2026-03-08', 40.7128, -74.006, tz);
  const segs = buildTimeline(d);
  expect(segs[0].startMin).toBe(0);
  expect(segs.at(-1)!.endMin).toBe(1440);
  for (let i = 1; i < segs.length; i++) expect(segs[i].startMin).toBe(segs[i - 1].endMin);
  const [h, m] = formatInTz(d.goldenPm![0], tz).split(':').map(Number);
  const evening = segs.filter((s) => s.phase === 'golden').at(-1)!;
  expect(Math.abs(evening.startMin - (h * 60 + m))).toBeLessThanOrEqual(3);
});
