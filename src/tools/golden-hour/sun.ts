import * as SunCalc from 'suncalc';

// Blue hour: sun −6° → −4°. Golden hour: −4° → +6°.
SunCalc.addTime(-4, 'blueAmEnd', 'bluePmStart');
SunCalc.addTime(6, 'goldenAmEnd', 'goldenPmStart');

export type Phase = 'night' | 'blue' | 'golden' | 'day';
export type SunDay = {
  blueAm?: [Date, Date]; goldenAm?: [Date, Date]; sunrise?: Date; noon: Date; sunset?: Date;
  goldenPm?: [Date, Date]; bluePm?: [Date, Date]; dayLengthMin: number; polar: null | 'day' | 'night';
  lat: number; lon: number; tz: string; midnight: Date;
};

/** Minutes the zone is ahead of UTC at instant `d`. */
function offsetMin(d: Date, tz: string): number {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(d).map((x) => [x.type, x.value]));
  return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - d.getTime()) / 60000;
}

/** UTC instant of a local wall-clock time on `dateISO` in `tz`. */
export function zonedTime(dateISO: string, hours: number, tz: string): Date {
  const [y, m, d] = dateISO.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, 0, 0) + hours * 3_600_000;
  let t = guess - offsetMin(new Date(guess), tz) * 60000;
  t = guess - offsetMin(new Date(t), tz) * 60000; // second pass settles DST edges
  return new Date(t);
}

const valid = (d: Date | undefined): d is Date => !!d && !Number.isNaN(d.getTime());
const pair = (a?: Date, b?: Date): [Date, Date] | undefined => (valid(a) && valid(b) ? [a, b] : undefined);

export function sunDay(dateISO: string, lat: number, lon: number, tz: string): SunDay {
  const noonLocal = zonedTime(dateISO, 12, tz);
  const t = SunCalc.getTimes(noonLocal, lat, lon) as unknown as Record<string, Date>;
  const sunrise = valid(t.sunrise) ? t.sunrise : undefined;
  const sunset = valid(t.sunset) ? t.sunset : undefined;
  let polar: SunDay['polar'] = null;
  if (!sunrise || !sunset) {
    const alt = SunCalc.getPosition(t.solarNoon, lat, lon).altitude;
    polar = alt > 0 ? 'day' : 'night';
  }
  return {
    blueAm: pair(t.dawn, t.blueAmEnd),
    goldenAm: pair(t.blueAmEnd, t.goldenAmEnd),
    sunrise, noon: t.solarNoon, sunset,
    goldenPm: pair(t.goldenPmStart, t.bluePmStart),
    bluePm: pair(t.bluePmStart, t.dusk),
    dayLengthMin: sunrise && sunset ? (sunset.getTime() - sunrise.getTime()) / 60000 : polar === 'day' ? 1440 : 0,
    polar, lat, lon, tz,
    midnight: zonedTime(dateISO, 0, tz),
  };
}

export function formatInTz(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
}

const phaseAt = (deg: number): Phase => (deg < -6 ? 'night' : deg < -4 ? 'blue' : deg < 6 ? 'golden' : 'day');

/** Light phases across the local day (0–1440 min), sampled every 2 minutes from the sun's altitude. */
export function buildTimeline(day: SunDay): { phase: Phase; startMin: number; endMin: number }[] {
  const segs: { phase: Phase; startMin: number; endMin: number }[] = [];
  for (let m = 0; m < 1440; m += 2) {
    // suncalc 2.x reports apparent altitude in degrees
    const alt = SunCalc.getPosition(new Date(day.midnight.getTime() + m * 60000), day.lat, day.lon).altitude;
    const phase = phaseAt(alt);
    const last = segs.at(-1);
    if (last?.phase === phase) last.endMin = m + 2;
    else segs.push({ phase, startMin: m, endMin: m + 2 });
  }
  return segs;
}
