import { PRINT_SIZES, printFit, rateDpi, maxPrint, type PrintSize } from './logic';
import { validateFile, loadImage, fitWithin } from '../../lib/image';
import { showError, clearError } from '../../lib/errors';

const $ = <T extends HTMLElement = HTMLInputElement>(id: string) => document.getElementById(id) as T;
const radio = (name: string) => (document.querySelector(`input[name="${name}"]:checked`) as HTMLInputElement).value;
const LABEL = { excellent: 'Excellent', good: 'Good', acceptable: 'Acceptable', low: 'Low' } as const;
const TONE = { excellent: 'ok', good: 'ok', acceptable: 'warn', low: 'bad' } as const;

let img: { w: number; h: number } | null = null;
let selected = '8x10';
let pan = 0.5;
let custom: PrintSize | null = null;

const sizes = () => (custom ? [...PRINT_SIZES, custom] : PRINT_SIZES);
const orientation = () => radio('orient') as 'auto' | 'portrait' | 'landscape';

function table() {
  if (!img) return;
  const body = $('sizes').querySelector('tbody')!;
  body.innerHTML = '';
  for (const s of sizes()) {
    const f = printFit({ imgW: img.w, imgH: img.h, wIn: s.wIn, hIn: s.hIn, orientation: orientation() });
    const r = rateDpi(f.dpi);
    const tr = document.createElement('tr');
    tr.dataset.id = s.id;
    tr.tabIndex = 0;
    tr.setAttribute('aria-selected', String(s.id === selected));
    tr.innerHTML = `<td>${s.label}</td><td class="num">${f.dpi}</td><td><span class="pill" data-tone="${TONE[r]}">${LABEL[r]}</span></td><td class="num muted">${f.cropPct}%</td>`;
    const pick = () => { selected = s.id; pan = 0.5; table(); crop(); };
    tr.addEventListener('click', pick);
    tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    body.append(tr);
  }
}

function crop() {
  if (!img) return;
  const s = sizes().find((x) => x.id === selected) ?? PRINT_SIZES[2];
  const f = printFit({ imgW: img.w, imgH: img.h, wIn: s.wIn, hIn: s.hIn, orientation: orientation(), pan });
  const box = $('crop-box');
  box.style.left = `${(f.src.x / img.w) * 100}%`;
  box.style.top = `${(f.src.y / img.h) * 100}%`;
  box.style.width = `${(f.src.w / img.w) * 100}%`;
  box.style.height = `${(f.src.h / img.h) * 100}%`;
  box.dataset.axis = f.src.w < img.w ? 'x' : f.src.h < img.h ? 'y' : '';
  const r = rateDpi(f.dpi);
  $('crop-label').textContent = `${s.label} · ${f.dpi} DPI · ${LABEL[r]}`;
  $('crop-label').dataset.tone = TONE[r];
}

function maxes() {
  if (!img) return;
  for (const dpi of [300, 150]) {
    const m = maxPrint(img.w, img.h, dpi);
    $(`max-${dpi}`).textContent = `${m.wIn.toFixed(1)} × ${m.hIn.toFixed(1)} in`;
    $(`max-${dpi}-cm`).textContent = `${(m.wMm / 10).toFixed(1)} × ${(m.hMm / 10).toFixed(1)} cm`;
  }
}

function update() { table(); crop(); maxes(); }

$('drop').addEventListener('files', async (e) => {
  const file = (e as CustomEvent<File[]>).detail[0];
  clearError('err');
  const v = validateFile(file);
  if (!v.ok) return showError('err', v.message);
  try {
    const bmp = await loadImage(file);
    img = { w: bmp.width, h: bmp.height };
    const p = fitWithin(bmp.width, bmp.height, 1400);
    const c = $<HTMLCanvasElement>('preview');
    c.width = p.width; c.height = p.height;
    c.getContext('2d')!.drawImage(bmp, 0, 0, p.width, p.height);
    bmp.close();
    $('dims').textContent = `${img.w} × ${img.h} px · ${((img.w * img.h) / 1e6).toFixed(1)} MP`;
    $('results').hidden = false;
    $('empty').hidden = true;
    update();
  } catch (err) {
    showError('err', (err as Error).message);
  }
});

document.querySelectorAll('input[name="orient"]').forEach((el) => el.addEventListener('change', () => { pan = 0.5; update(); }));
$('custom-add').addEventListener('click', () => {
  const unit = radio('custom-unit') as 'in' | 'mm';
  const w = +$('custom-w').value, h = +$('custom-h').value;
  if (!(w > 0 && h > 0)) return showError('err', 'Enter a width and height for the custom size.');
  const k = unit === 'mm' ? 1 / 25.4 : 1;
  custom = { id: 'custom', label: `Custom · ${w} × ${h} ${unit}`, wIn: w * k, hIn: h * k, unit };
  selected = 'custom'; pan = 0.5;
  update();
});

// Drag the crop window along whichever axis was cropped.
const box = $('crop-box');
box.addEventListener('pointerdown', (e) => {
  if (!img || !box.dataset.axis) return;
  box.setPointerCapture(e.pointerId);
  const frame = $('crop-frame').getBoundingClientRect();
  const start = { x: e.clientX, y: e.clientY, pan };
  const axis = box.dataset.axis;
  const move = (ev: PointerEvent) => {
    const free = axis === 'x' ? frame.width - box.offsetWidth : frame.height - box.offsetHeight;
    const delta = axis === 'x' ? ev.clientX - start.x : ev.clientY - start.y;
    pan = Math.min(1, Math.max(0, start.pan + (free > 0 ? delta / free : 0)));
    crop();
  };
  const up = () => { box.removeEventListener('pointermove', move); box.removeEventListener('pointerup', up); };
  box.addEventListener('pointermove', move);
  box.addEventListener('pointerup', up);
});
box.addEventListener('keydown', (e) => {
  const step = { ArrowLeft: -0.05, ArrowUp: -0.05, ArrowRight: 0.05, ArrowDown: 0.05 }[e.key];
  if (step === undefined) return;
  e.preventDefault();
  pan = Math.min(1, Math.max(0, pan + step));
  crop();
});
