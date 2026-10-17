import { sunDay, formatInTz, buildTimeline, type SunDay } from './sun';
import { parseCities, searchCities, nearestCity, type City, type CitiesJson } from './cities';
import { load, save } from '../../lib/storage';

const $ = <T extends HTMLElement = HTMLInputElement>(id: string) => document.getElementById(id) as T;
type Loc = { label: string; lat: number; lon: number; tz: string };

const regionName = (() => { try { const d = new Intl.DisplayNames(['en'], { type: 'region' }); return (cc: string) => d.of(cc) ?? cc; } catch { return (cc: string) => cc; } })();
let cities: City[] | null = null;
let citiesLoading: Promise<City[]> | null = null;
let loc: Loc | null = load<Loc | null>('golden:loc', null);
let options: City[] = [];
let active = -1;

function loadCities(): Promise<City[]> {
  citiesLoading ??= fetch('data/cities.json')
    .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<CitiesJson>; })
    .then((j) => (cities = parseCities(j)));
  return citiesLoading;
}

const todayIn = (tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const minsNow = (tz: string) => { const [h, m] = formatInTz(new Date(), tz).split(':').map(Number); return h * 60 + m; };
const range = (r: [Date, Date] | undefined, tz: string) => (r ? `${formatInTz(r[0], tz)}–${formatInTz(r[1], tz)}` : '—');
const dur = (min: number) => `${Math.floor(min / 60)}h ${String(Math.round(min % 60)).padStart(2, '0')}m`;

function setError(msg: string) {
  const el = $('loc-err');
  el.textContent = msg;
  el.hidden = !msg;
}

function setLocation(l: Loc) {
  loc = l;
  save('golden:loc', l);
  $('place').textContent = l.label;
  if (!$('date').value) $('date').value = todayIn(l.tz);
  setError('');
  render();
}

function render() {
  if (!loc) return;
  $('results').hidden = false;
  $('empty').hidden = true;
  const date = $('date').value || todayIn(loc.tz);
  const d: SunDay = sunDay(date, loc.lat, loc.lon, loc.tz);
  const tz = loc.tz;
  $('tz-label').textContent = `Times in ${tz}`;
  $('r-blue-am').textContent = range(d.blueAm, tz);
  $('r-golden-am').textContent = range(d.goldenAm, tz);
  $('r-sunrise').textContent = d.sunrise ? formatInTz(d.sunrise, tz) : '—';
  $('r-noon').textContent = formatInTz(d.noon, tz);
  $('r-sunset').textContent = d.sunset ? formatInTz(d.sunset, tz) : '—';
  $('r-golden-pm').textContent = range(d.goldenPm, tz);
  $('r-blue-pm').textContent = range(d.bluePm, tz);
  $('r-day').textContent = dur(d.dayLengthMin);
  $('polar').textContent = d.polar === 'day' ? 'The sun doesn’t set on this date.' : d.polar === 'night' ? 'The sun doesn’t rise on this date.' : '';
  $('polar').hidden = !d.polar;

  const segs = buildTimeline(d);
  const bar = $('timeline');
  bar.innerHTML = segs.map((s) => `<span class="seg ${s.phase}" style="left:${(s.startMin / 14.4).toFixed(3)}%;width:${((s.endMin - s.startMin) / 14.4).toFixed(3)}%" title="${s.phase}"></span>`).join('')
    + [0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => `<span class="hr" style="left:${(h / 24) * 100}%">${String(h % 24).padStart(2, '0')}</span>`).join('');
  const isToday = date === todayIn(tz);
  const now = minsNow(tz);
  if (isToday) bar.insertAdjacentHTML('beforeend', `<span class="now" style="left:${(now / 14.4).toFixed(3)}%"><b>now</b></span>`);

  const next = isToday ? segs.find((s) => (s.phase === 'golden' || s.phase === 'blue') && s.startMin > now) : undefined;
  const current = isToday ? segs.find((s) => s.startMin <= now && now < s.endMin) : undefined;
  $('countdown').textContent = !isToday ? `${new Date(date + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
    : current && (current.phase === 'golden' || current.phase === 'blue') ? `${current.phase === 'golden' ? 'Golden' : 'Blue'} hour now — ${current.endMin - now} min left`
      : next ? `${next.phase === 'golden' ? 'Golden' : 'Blue'} hour in ${dur(next.startMin - now)}` : 'No more golden or blue hour today';
}

// --- city combobox
const input = $('city'), list = $<HTMLUListElement>('city-list');
function showOptions() {
  list.innerHTML = '';
  options.forEach((c, i) => {
    const li = document.createElement('li');
    li.id = `city-opt-${i}`;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(i === active));
    li.innerHTML = `<span>${c.name}</span><span class="muted">${[c.admin, regionName(c.country)].filter(Boolean).join(', ')}</span>`;
    li.addEventListener('mousedown', (e) => { e.preventDefault(); choose(c); });
    list.append(li);
  });
  const open = options.length > 0;
  list.hidden = !open;
  input.setAttribute('aria-expanded', String(open));
  input.setAttribute('aria-activedescendant', active >= 0 ? `city-opt-${active}` : '');
}
function choose(c: City) {
  input.value = c.name;
  options = []; active = -1; showOptions();
  $('date').value = '';
  setLocation({ label: `${c.name}, ${[c.admin, regionName(c.country)].filter(Boolean).join(', ')}`, lat: c.lat, lon: c.lon, tz: c.tz });
}
input.addEventListener('focus', () => { loadCities().catch(() => setError('Couldn’t load the city list. Enter coordinates instead.')); });
input.addEventListener('input', async () => {
  try {
    const all = cities ?? await loadCities();
    options = searchCities(all, input.value);
    active = options.length ? 0 : -1;
    showOptions();
  } catch {
    setError('Couldn’t load the city list. Enter coordinates instead.');
  }
});
input.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (!options.length) return;
    active = (active + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
    showOptions();
  } else if (e.key === 'Enter' && active >= 0) {
    e.preventDefault(); choose(options[active]);
  } else if (e.key === 'Escape') {
    options = []; showOptions();
  }
});
input.addEventListener('blur', () => { options = []; showOptions(); });

// --- GPS
$('use-location').addEventListener('click', () => {
  if (!('geolocation' in navigator)) { setError('Location isn’t available in this browser. Search for a city instead.'); input.focus(); return; }
  $('use-location').textContent = 'Locating…';
  navigator.geolocation.getCurrentPosition(async (pos) => {
    $('use-location').textContent = 'Use my location';
    const { latitude: lat, longitude: lon } = pos.coords;
    try {
      const near = nearestCity(cities ?? await loadCities(), lat, lon);
      $('date').value = '';
      setLocation({ label: `Your location (near ${near.name})`, lat, lon, tz: near.tz });
    } catch {
      setLocation({ label: 'Your location', lat, lon, tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
    }
  }, (err) => {
    $('use-location').textContent = 'Use my location';
    setError(err.code === err.PERMISSION_DENIED ? 'Location permission was denied. Search for a city instead.' : 'Couldn’t get your location. Search for a city instead.');
    input.focus();
  }, { timeout: 10_000, maximumAge: 600_000 });
});

// --- coordinates
$('coords-apply').addEventListener('click', async () => {
  const lat = +$('lat').value, lon = +$('lon').value;
  if (!(Math.abs(lat) <= 90 && Math.abs(lon) <= 180) || $('lat').value === '' || $('lon').value === '') {
    setError('Latitude must be between −90 and 90, longitude between −180 and 180.');
    return;
  }
  let tz = Intl.DateTimeFormat().resolvedOptions().timeZone, label = `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
  try { const near = nearestCity(cities ?? await loadCities(), lat, lon); tz = near.tz; label += ` (near ${near.name})`; } catch { /* keep device tz */ }
  $('date').value = '';
  setLocation({ label, lat, lon, tz });
});

$('date').addEventListener('change', render);
if (loc) { $('place').textContent = loc.label; render(); }
setInterval(() => { if (loc && !document.hidden) render(); }, 60_000);
