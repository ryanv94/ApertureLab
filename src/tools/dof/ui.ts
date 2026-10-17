import { SENSORS, cocFor, computeDof, type CocMode } from './logic';
import { renderDiagram } from './diagram';
import { APERTURE_FULL, APERTURE_THIRDS, type Stop } from '../../lib/stops';
import { formatDistance } from '../../lib/format';
import { readParams, writeParams } from '../../lib/url-state';
import { syncFill } from '../../lib/slider-fill';

const $ = <T extends HTMLElement = HTMLInputElement>(id: string) => document.getElementById(id) as T;
const radio = (name: string) => (document.querySelector(`input[name="${name}"]:checked`) as HTMLInputElement).value;
const setRadio = (name: string, v: string) => {
  const el = document.querySelector<HTMLInputElement>(`input[name="${name}"][value="${v}"]`);
  if (el) el.checked = true;
};

const F_MIN = 8, F_MAX = 600, D_MIN = 100, D_MAX = 1_000_000;
const logToSlider = (v: number, lo: number, hi: number) => Math.round((Math.log(v / lo) / Math.log(hi / lo)) * 1000);
const sliderToLog = (s: number, lo: number, hi: number) => lo * (hi / lo) ** (s / 1000);

const sensor = $<HTMLSelectElement>('sensor'), crop = $('crop'), cropField = $<HTMLElement>('crop-field');
const focal = $('focal'), focalNum = $('focal-num');
const aperture = $('aperture'), apertureOut = $<HTMLOutputElement>('aperture-out');
const distance = $('distance'), distanceNum = $('distance-num');
const cocUm = $('coc-um'), cocField = $<HTMLElement>('coc-um-field'), cocOut = $<HTMLElement>('coc-value');
const svg = document.getElementById('diagram') as unknown as SVGSVGElement;

let scale: Stop[] = APERTURE_THIRDS;
const state = { focalMm: 50, n: 2.8, distanceMm: 3000 };

function setScale(kind: string) {
  scale = kind === 'full' ? APERTURE_FULL : APERTURE_THIRDS;
  aperture.max = String(scale.length - 1);
  const i = nearestIndex(state.n);
  aperture.value = String(i);
  state.n = scale[i].value === 0.95 ? 0.95 : +scale[i].label.slice(2);
}
const nearestIndex = (n: number) =>
  scale.reduce((best, s, i) => (Math.abs(Math.log(+s.label.slice(2) / n)) < Math.abs(Math.log(+scale[best].label.slice(2) / n)) ? i : best), 0);

function update(push = true) {
  const s = SENSORS.find((x) => x.id === sensor.value)!;
  const cropFactor = s.id === 'custom' ? Math.max(0.3, +crop.value || 1) : s.crop;
  cropField.hidden = s.id !== 'custom';
  const mode = radio('coc') as CocMode;
  cocField.hidden = mode !== 'custom';
  const c = cocFor(cropFactor, mode, +cocUm.value || 30);
  // Calculations use the nominal f-number photographers set and read on the lens.
  const r = computeDof({ focalMm: state.focalMm, n: state.n, distanceMm: state.distanceMm, cocMm: c });

  apertureOut.textContent = `f/${state.n}`;
  cocOut.textContent = `${(c * 1000).toFixed(1)} µm`;
  $('r-near').textContent = formatDistance(r.near);
  $('r-far').textContent = formatDistance(r.far);
  $('r-total').textContent = formatDistance(r.total);
  $('r-hyper').textContent = formatDistance(r.hyperfocal);
  $('r-split').textContent = r.behind === Infinity ? '— / ∞' : `${Math.round((r.front / r.total) * 100)} / ${Math.round((r.behind / r.total) * 100)}`;
  $('r-split-hint').textContent = `${formatDistance(r.front)} in front · ${formatDistance(r.behind)} behind`;
  renderDiagram(svg, r, state.distanceMm);
  [focal, aperture, distance].forEach(syncFill);
  if (push) writeParams({ s: sensor.value, f: state.focalMm, n: state.n, d: +(state.distanceMm / 1000).toFixed(2), c: mode });
}

// --- wiring
focal.addEventListener('input', () => { state.focalMm = Math.round(sliderToLog(+focal.value, F_MIN, F_MAX)); focalNum.value = String(state.focalMm); update(); });
focalNum.addEventListener('change', () => {
  state.focalMm = Math.min(F_MAX, Math.max(F_MIN, Math.round(+focalNum.value || 50)));
  focalNum.value = String(state.focalMm); focal.value = String(logToSlider(state.focalMm, F_MIN, F_MAX)); update();
});
aperture.addEventListener('input', () => { const st = scale[+aperture.value]; state.n = st.value === 0.95 ? 0.95 : +st.label.slice(2); update(); });
document.querySelectorAll('input[name="ap-scale"]').forEach((el) => el.addEventListener('change', () => { setScale(radio('ap-scale')); update(); }));
distance.addEventListener('input', () => {
  state.distanceMm = sliderToLog(+distance.value, D_MIN, D_MAX);
  distanceNum.value = (state.distanceMm / 1000).toFixed(state.distanceMm < 10_000 ? 2 : 1); update();
});
distanceNum.addEventListener('change', () => {
  const m = Math.min(D_MAX, Math.max(D_MIN, (+distanceNum.value || 3) * 1000));
  state.distanceMm = m; distance.value = String(logToSlider(m, D_MIN, D_MAX)); update();
});
[sensor, crop, cocUm].forEach((el) => el.addEventListener('input', () => update()));
document.querySelectorAll('input[name="coc"]').forEach((el) => el.addEventListener('change', () => update()));

// --- initial state from URL
const p = readParams();
if (p.get('s') && SENSORS.some((s) => s.id === p.get('s'))) sensor.value = p.get('s')!;
if (p.get('c')) setRadio('coc', p.get('c')!);
state.focalMm = Math.min(F_MAX, Math.max(F_MIN, +(p.get('f') ?? 50) || 50));
state.n = +(p.get('n') ?? 2.8) || 2.8;
state.distanceMm = Math.min(D_MAX, Math.max(D_MIN, (+(p.get('d') ?? 3) || 3) * 1000));
setScale(radio('ap-scale'));
focal.value = String(logToSlider(state.focalMm, F_MIN, F_MAX)); focalNum.value = String(state.focalMm);
distance.value = String(logToSlider(state.distanceMm, D_MIN, D_MAX)); distanceNum.value = (state.distanceMm / 1000).toFixed(2);
update(p.toString() !== '');
