// Dev-time only: builds public/data/cities.json from GeoNames (CC BY 4.0, https://www.geonames.org/).
// Keeps the 5,000 most populous cities plus every national capital.
import JSZip from 'jszip';
import { writeFileSync } from 'node:fs';

const BASE = 'https://download.geonames.org/export/dump/';
const get = async (name) => {
  const res = await fetch(BASE + name);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
};

const zip = await JSZip.loadAsync(await get('cities15000.zip'));
const rows = (await zip.file('cities15000.txt').async('string')).split('\n').filter(Boolean).map((l) => l.split('\t'));
const adminNames = new Map((await get('admin1CodesASCII.txt')).toString('utf8').split('\n').filter(Boolean)
  .map((l) => l.split('\t')).map(([code, name]) => [code, name]));

const byPop = rows.sort((a, b) => +b[14] - +a[14]);
const keep = new Set(byPop.slice(0, 5000));
for (const r of rows) if (r[7] === 'PPLC') keep.add(r);

const tz = [], tzIdx = new Map(), admin = [], adminIdx = new Map();
const idx = (list, map, v) => { if (!map.has(v)) { map.set(v, list.length); list.push(v); } return map.get(v); };
const c = [...keep].sort((a, b) => +b[14] - +a[14]).map((r) => [
  r[1], r[8], idx(admin, adminIdx, adminNames.get(`${r[8]}.${r[10]}`) ?? ''), +(+r[4]).toFixed(3), +(+r[5]).toFixed(3), idx(tz, tzIdx, r[17]), +r[14],
]);

writeFileSync(new URL('../public/data/cities.json', import.meta.url), JSON.stringify({ tz, admin, c }));
console.log(`${c.length} cities, ${tz.length} time zones`);
