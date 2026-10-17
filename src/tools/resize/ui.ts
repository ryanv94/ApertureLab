import { SIZE_PRESETS, planResize, outputName, type Position } from './logic';
import { renderOne, wmFont, type Watermark } from './render';
import { validateFile, loadImage, exportCanvas, guardCanvasSize, fitWithin, type ExportType } from '../../lib/image';
import { downloadBlob, downloadZip } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { showError, clearError } from '../../lib/errors';
import { openCropper } from '../../lib/cropper';
import { syncFill } from '../../lib/slider-fill';

const $ = <T extends HTMLElement = HTMLInputElement>(id: string) => document.getElementById(id) as T;
const radio = (name: string) => (document.querySelector(`input[name="${name}"]:checked`) as HTMLInputElement).value;

type Item = { name: string; bitmap: ImageBitmap; crop: ImageBitmap | null };
const items: Item[] = [];
let active = 0;
let wmImage: ImageBitmap | null = null;
let estTimer = 0;

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const format = () => `image/${radio('format')}` as ExportType;

function target(it: Item): { w: number; h: number | null } {
  const p = SIZE_PRESETS.find((x) => x.id === $<HTMLSelectElement>('preset').value)!;
  if (p.id === 'original') return { w: it.bitmap.width, h: it.bitmap.height };
  if (p.id === 'custom') {
    const w = Math.max(1, Math.round(+$('cw').value || it.bitmap.width));
    const h = $('ch').value ? Math.max(1, Math.round(+$('ch').value)) : null;
    return { w, h };
  }
  return { w: p.w!, h: p.h };
}

function plan(it: Item) {
  const mode = radio('mode') as 'fit' | 'fill' | 'crop';
  const t = target(it);
  if (mode === 'crop' && it.crop) {
    return { bmp: it.crop, plan: planResize({ srcW: it.crop.width, srcH: it.crop.height, targetW: t.w, targetH: t.h, mode: 'crop', crop: { x: 0, y: 0, w: it.crop.width, h: it.crop.height } }) };
  }
  return { bmp: it.bitmap, plan: planResize({ srcW: it.bitmap.width, srcH: it.bitmap.height, targetW: t.w, targetH: t.h, mode: mode === 'crop' ? 'fill' : mode }) };
}

function watermark(): Watermark {
  return {
    kind: radio('wm') as Watermark['kind'], text: $('wm-text').value, font: radio('wm-font') as Watermark['font'],
    sizePct: +$('wm-size').value, color: $('wm-color').value, opacity: +$('wm-opacity').value / 100, shadow: $('wm-shadow').checked,
    image: wmImage, imageScale: +$('wm-scale').value, position: radio('pos') as Position, marginPct: +$('wm-margin').value,
  };
}

function capped(p: { canvasW: number; canvasH: number }) {
  const g = guardCanvasSize(p.canvasW, p.canvasH);
  return g.capped ? { ...p, scale: g.width / p.canvasW } : { ...p, scale: 1 };
}

async function render() {
  const wmKind = radio('wm');
  $('wm-text-opts').hidden = wmKind !== 'text';
  $('wm-image-opts').hidden = wmKind !== 'image';
  $('wm-common').hidden = wmKind === 'none';
  $('custom-size').hidden = $<HTMLSelectElement>('preset').value !== 'custom';
  $('recrop').hidden = radio('mode') !== 'crop' || !items.length;
  $('quality-field').hidden = radio('format') === 'png';
  ['wm-size', 'wm-opacity', 'wm-scale', 'wm-margin', 'quality'].forEach((id) => {
    const el = $(id); syncFill(el);
    const out = document.getElementById(`${id}-out`);
    if (out) out.textContent = `${el.value}%`;
  });
  const it = items[active];
  if (!it) return;
  if (radio('wm') === 'text') await document.fonts.load(wmFont(watermark(), 40)).catch(() => null);
  const { bmp, plan: p } = plan(it);
  const view = fitWithin(p.canvasW, p.canvasH, 1600);
  const canvas = renderOne(bmp, p, watermark(), view.width / p.canvasW);
  const stage = $('preview-wrap');
  stage.replaceChildren(canvas);
  canvas.id = 'preview';
  $('out-dims').textContent = `${p.canvasW} × ${p.canvasH}px`;
  $('empty').hidden = true;
  clearTimeout(estTimer);
  estTimer = window.setTimeout(estimate, 300);
}

async function encode(it: Item): Promise<{ blob: Blob; name: string }> {
  const { bmp, plan: raw } = plan(it);
  const p = capped(raw);
  if (p.scale < 1) showError('err', `${it.name} is too large for your browser at that size and was exported at ${Math.round(p.canvasW * p.scale)}px wide.`);
  const canvas = renderOne(bmp, raw, watermark(), p.scale);
  const blob = await exportCanvas(canvas, format(), +$('quality').value / 100, '#FFFFFF');
  return { blob, name: outputName(it.name, canvas.width, canvas.height, EXT[format()]) };
}

async function estimate() {
  const it = items[active];
  if (!it) return;
  try { $('est').textContent = formatBytes((await encode(it)).blob.size); } catch { $('est').textContent = '—'; }
}

function thumbs() {
  const ul = $<HTMLUListElement>('thumbs');
  ul.innerHTML = '';
  items.forEach((it, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'thumb'; b.setAttribute('aria-pressed', String(i === active));
    b.setAttribute('aria-label', `Show ${it.name}`);
    const t = fitWithin(it.bitmap.width, it.bitmap.height, 120);
    const c = document.createElement('canvas'); c.width = t.width; c.height = t.height;
    c.getContext('2d')!.drawImage(it.bitmap, 0, 0, t.width, t.height);
    b.append(c);
    b.addEventListener('click', () => { active = i; thumbs(); render(); });
    const rm = document.createElement('button');
    rm.type = 'button'; rm.className = 'rm'; rm.textContent = '✕'; rm.setAttribute('aria-label', `Remove ${it.name}`);
    rm.addEventListener('click', () => { it.bitmap.close(); items.splice(i, 1); active = Math.min(active, items.length - 1); thumbs(); if (items.length) render(); else reset(); });
    li.append(b, rm);
    ul.append(li);
  });
  $('download-all').hidden = items.length < 2;
  ($('download') as unknown as HTMLButtonElement).disabled = !items.length;
}

function reset() {
  $('preview-wrap').replaceChildren();
  $('empty').hidden = false;
  $('est').textContent = '—';
  $('out-dims').textContent = '';
}

async function ensureCrop(it: Item, force = false) {
  if (it.crop && !force) return;
  const t = target(it);
  const out = await openCropper(it.bitmap, t.h ? t.w / t.h : null);
  if (out) { it.crop?.close(); it.crop = out; }
}

$('drop').addEventListener('files', async (e) => {
  clearError('err');
  for (const file of (e as CustomEvent<File[]>).detail) {
    const v = validateFile(file);
    if (!v.ok) { showError('err', v.message); continue; }
    try { items.push({ name: file.name, bitmap: await loadImage(file), crop: null }); } catch (err) { showError('err', (err as Error).message); }
  }
  if (!items.length) return;
  active = items.length - 1;
  if (radio('mode') === 'crop') await ensureCrop(items[active]);
  thumbs();
  render();
});

$('wm-drop').addEventListener('files', async (e) => {
  const file = (e as CustomEvent<File[]>).detail[0];
  const v = validateFile(file);
  if (!v.ok) return showError('err', v.message);
  wmImage?.close();
  wmImage = await loadImage(file);
  $('wm-image-name').textContent = file.name;
  render();
});

$('cw').addEventListener('input', () => {
  const it = items[active];
  if ($('lock').checked && it) $('ch').value = String(Math.round((+$('cw').value * it.bitmap.height) / it.bitmap.width));
});
$('ch').addEventListener('input', () => {
  const it = items[active];
  if ($('lock').checked && it && $('ch').value) $('cw').value = String(Math.round((+$('ch').value * it.bitmap.width) / it.bitmap.height));
});
document.querySelectorAll('input[name="mode"]').forEach((el) => el.addEventListener('change', async () => {
  if (radio('mode') === 'crop' && items[active]) await ensureCrop(items[active]);
  render();
}));
$('recrop').addEventListener('click', async () => { if (items[active]) { await ensureCrop(items[active], true); render(); } });
document.querySelectorAll('#controls input:not([name="mode"]), #controls select').forEach((el) => el.addEventListener('input', render));

$('download').addEventListener('click', async () => {
  const it = items[active];
  if (!it) return;
  const { blob, name } = await encode(it);
  downloadBlob(blob, name);
});
$('download-all').addEventListener('click', async () => {
  const btn = $('download-all') as unknown as HTMLButtonElement;
  btn.disabled = true; btn.textContent = 'Preparing…';
  try {
    const files = [];
    for (const it of items) { const r = await encode(it); files.push({ name: r.name, blob: r.blob }); }
    await downloadZip(files, 'resized.zip');
  } finally {
    btn.disabled = false; btn.textContent = 'Download all (.zip)';
  }
});
render();
