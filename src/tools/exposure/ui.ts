import { ND_PRESETS, ev100, targetShutter } from './logic';
import { BulbTimer } from './timer';
import { SHUTTER_THIRDS, APERTURE_THIRDS, ISO_THIRDS } from '../../lib/stops';
import { formatShutter } from '../../lib/format';
import { toast } from '../../lib/toast';

const $ = <T extends HTMLElement = HTMLInputElement>(id: string) => document.getElementById(id) as T;
const sel = (id: string) => $<HTMLSelectElement>(id);

/** Calculations use the nominal values photographers dial in (1/125, f/5.6, ISO 640). */
const shutterVal = (label: string) => { const s = label.replace('s', ''); return s.includes('/') ? 1 / +s.split('/')[1] : +s; };
const apertureVal = (label: string) => +label.slice(2);

function fill(id: string, labels: string[], selected: string, text = (l: string) => l, same?: string) {
  const el = sel(id);
  el.innerHTML = (same ? `<option value="same">${same}</option>` : '') + labels.map((l) => `<option value="${l}">${text(l)}</option>`).join('');
  el.value = same ? 'same' : selected;
}
const apertures = APERTURE_THIRDS.slice(1).map((s) => s.label);
fill('base-shutter', SHUTTER_THIRDS.map((s) => s.label), '1/125s');
fill('base-aperture', apertures, 'f/8');
fill('base-iso', ISO_THIRDS.map((s) => s.label), '100', (l) => `ISO ${l}`);
fill('target-aperture', apertures, 'f/8', undefined, 'As metered');
fill('target-iso', ISO_THIRDS.map((s) => s.label), '100', (l) => `ISO ${l}`, 'As metered');
sel('nd-add').innerHTML = ND_PRESETS.map((p, i) => `<option value="${i}">${p.label} (${p.stops} stops)</option>`).join('') + '<option value="custom">Custom stops…</option>';
sel('nd-add').value = '7';

type Filter = { label: string; stops: number };
const filters: Filter[] = [];
let seconds = 0;

function renderFilters() {
  const list = $<HTMLUListElement>('filters');
  list.innerHTML = '';
  for (const [i, f] of filters.entries()) {
    const li = document.createElement('li');
    li.innerHTML = `<span>${f.label}</span><span class="muted">${f.stops} st</span>`;
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.setAttribute('aria-label', `Remove ${f.label}`);
    rm.textContent = '✕';
    rm.addEventListener('click', () => { filters.splice(i, 1); renderFilters(); update(); });
    li.append(rm);
    list.append(li);
  }
  $('filters-empty').hidden = filters.length > 0;
}

function update() {
  const baseS = shutterVal(sel('base-shutter').value);
  const baseN = apertureVal(sel('base-aperture').value);
  const baseIso = +sel('base-iso').value;
  const targetN = sel('target-aperture').value === 'same' ? baseN : apertureVal(sel('target-aperture').value);
  const targetIso = sel('target-iso').value === 'same' ? baseIso : +sel('target-iso').value;
  const cpl = $('cpl-on').checked ? +$('cpl-stops').value : 0;
  $<HTMLOutputElement>('cpl-stops-out').textContent = `${(+$('cpl-stops').value).toFixed(1)} st`;
  const filterStops = filters.reduce((a, f) => a + f.stops, 0) + cpl;

  seconds = targetShutter({ baseS, baseN, baseIso, targetN, targetIso, filterStops });
  $('r-shutter').textContent = formatShutter(seconds);
  $('r-ev').textContent = ev100(baseS, baseN, baseIso).toFixed(1);
  $('r-stops').textContent = `${+filterStops.toFixed(1)}`;
  $('r-settings').textContent = `f/${targetN} · ISO ${targetIso}`;
  $('r-note').textContent = seconds < 1 ? 'Short enough for your camera’s shutter.' : seconds <= 30 ? 'Within most cameras’ timed range.' : 'Use Bulb mode and the timer below.';
  resetTimer();
}

// --- filter stack
$('nd-add').addEventListener('change', () => { $('nd-custom-field').hidden = sel('nd-add').value !== 'custom'; });
$('nd-add-btn').addEventListener('click', () => {
  const v = sel('nd-add').value;
  if (v === 'custom') {
    const stops = Math.min(30, Math.max(0.1, +$('nd-custom').value || 0));
    filters.push({ label: `ND ${stops} st`, stops });
  } else {
    filters.push(ND_PRESETS[+v]);
  }
  renderFilters();
  update();
});
['base-shutter', 'base-aperture', 'base-iso', 'target-aperture', 'target-iso', 'cpl-on', 'cpl-stops'].forEach((id) => $(id).addEventListener('input', update));

// --- bulb timer
const RING = 2 * Math.PI * 88;
let timer: BulbTimer | null = null;
let lock: WakeLockSentinel | null = null;
let audio: AudioContext | null = null;
let lastBeep = -1;

function beep(freq: number, ms: number) {
  try {
    audio ??= new AudioContext();
    const o = audio.createOscillator(), g = audio.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.18, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + ms / 1000);
    o.connect(g).connect(audio.destination);
    o.start(); o.stop(audio.currentTime + ms / 1000);
  } catch { /* audio unavailable */ }
}
async function wake(on: boolean) {
  try {
    if (on && 'wakeLock' in navigator) lock = await navigator.wakeLock.request('screen');
    else { await lock?.release(); lock = null; }
  } catch { /* not permitted */ }
}
const clock = (ms: number) => {
  const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(r).padStart(2, '0')}`;
};

function paint(ms: number) {
  $('timer-time').textContent = clock(ms);
  const done = timer ? 1 - ms / timer.durationMs : 0;
  ($('timer-ring') as unknown as SVGCircleElement).style.strokeDashoffset = String(RING * done);
}
function setState(state: string) {
  $('timer').dataset.state = state;
  $('timer-toggle').textContent = state === 'running' ? 'Pause' : state === 'paused' ? 'Resume' : state === 'done' ? 'Done' : 'Start';
  ($('timer-toggle') as unknown as HTMLButtonElement).disabled = state === 'done';
}
function resetTimer() {
  timer?.reset();
  wake(false);
  const show = seconds >= 1;
  $('timer').hidden = !show;
  if (!show) return;
  timer = new BulbTimer(Math.round(seconds * 1000));
  lastBeep = -1;
  timer.onTick = (ms) => {
    paint(ms);
    const s = Math.ceil(ms / 1000);
    if (s !== lastBeep && (s === 10 || (s <= 3 && s > 0)) && timer!.durationMs > 4000) { beep(880, 120); lastBeep = s; }
  };
  timer.onDone = () => {
    setState('done');
    beep(1320, 700);
    navigator.vibrate?.([200, 100, 200]);
    wake(false);
    toast('Exposure complete — close the shutter', 'ok');
  };
  paint(timer.durationMs);
  setState('idle');
}
function loop() {
  if (!timer || timer.state !== 'running') return;
  timer.tick();
  requestAnimationFrame(loop);
}
$('timer-toggle').addEventListener('click', () => {
  if (!timer) return;
  if (timer.state === 'running') { timer.pause(); setState('paused'); wake(false); return; }
  timer.start(); setState('running'); wake(true); requestAnimationFrame(loop);
});
$('timer-reset').addEventListener('click', resetTimer);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && timer?.state === 'running') { wake(true); requestAnimationFrame(loop); }
});

renderFilters();
update();
