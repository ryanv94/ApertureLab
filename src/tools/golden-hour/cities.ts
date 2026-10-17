export type City = { name: string; country: string; admin: string; lat: number; lon: number; tz: string; pop: number };
export type CitiesJson = { tz: string[]; admin: string[]; c: [string, string, number, number, number, number, number][] };

export const parseCities = (j: CitiesJson): City[] =>
  j.c.map(([name, country, a, lat, lon, t, pop]) => ({ name, country, admin: j.admin[a], lat, lon, tz: j.tz[t], pop }));

const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Prefix matches first, then substring matches; each group by population. */
export function searchCities(list: City[], q: string, limit = 8): City[] {
  const needle = fold(q.trim());
  if (!needle) return [];
  const prefix: City[] = [], inner: City[] = [];
  for (const c of list) {
    const n = fold(c.name);
    if (n.startsWith(needle)) prefix.push(c);
    else if (n.includes(needle)) inner.push(c);
  }
  const byPop = (a: City, b: City) => b.pop - a.pop;
  return [...prefix.sort(byPop), ...inner.sort(byPop)].slice(0, limit);
}

export function nearestCity(list: City[], lat: number, lon: number): City {
  const r = Math.PI / 180;
  let best = list[0], bd = Infinity;
  for (const c of list) {
    const dLat = (c.lat - lat) * r, dLon = (c.lon - lon) * r;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * r) * Math.cos(c.lat * r) * Math.sin(dLon / 2) ** 2;
    if (a < bd) { bd = a; best = c; }
  }
  return best;
}
