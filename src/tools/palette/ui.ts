import type { Swatch } from './kmeans';
import { computeHistograms, type Histograms } from './histogram';
import { paletteCss, paletteJson } from './export';
import { validateFile, loadImage, fitWithin, exportCanvas } from '../../lib/image';
import { downloadBlob, baseName } from '../../lib/download';
import { showError, clearError } from '../../lib/errors';
import { toast } from '../../lib/toast';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
let bitmap: ImageBitmap | null = null;
let pixels: Uint8ClampedArray | null = null;
let swatches: Swatch[] = [];
let fileName = 'image.jpg';
let timer = 0;

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast(`Copied ${text}`, 'ok');
  } catch {
    const field = $<HTMLInputElement>('copy-fallback');
    field.value = text; field.hidden = false; field.select();
    toast('Press Ctrl/Cmd+C to copy');
  }
}

function renderSwatches() {
  const box = $('swatches');
  box.innerHTML = '';
  for (const s of swatches) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.style.setProperty('--c', s.hex);
    b.style.flexGrow = String(Math.max(0.6, s.share * 10));
    const light = 0.299 * s.rgb[0] + 0.587 * s.rgb[1] + 0.114 * s.rgb[2] > 150;
    b.dataset.light = String(light);
    b.innerHTML = `<span class="chip"></span><span class="hex">${s.hex}</span><span class="rgb">rgb(${s.rgb.join(', ')})</span><span class="share">${(s.share * 100).toFixed(1)}%</span>`;
    b.setAttribute('aria-label', `${s.hex}, ${(s.share * 100).toFixed(1)} percent. Copy hex`);
    b.addEventListener('click', () => copy(s.hex));
    box.append(b);
  }
  $('exports').hidden = swatches.length === 0;
}

function drawHistogram(canvas: HTMLCanvasElement, series: [Uint32Array, string][]) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 300, h = canvas.clientHeight || 90;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);
  const max = Math.max(1, ...series.flatMap(([s]) => [...s.slice(1, 255)]));
  ctx.globalCompositeOperation = 'screen';
  for (const [s, colour] of series) {
    ctx.beginPath(); ctx.moveTo(0, h);
    for (let i = 0; i < 256; i++) ctx.lineTo((i / 255) * w, h - Math.min(1, s[i] / max) * (h - 4));
    ctx.lineTo(w, h); ctx.closePath();
    ctx.fillStyle = colour; ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

function drawHistograms(h: Histograms) {
  drawHistogram($<HTMLCanvasElement>('hist-rgb'), [[h.r, 'rgba(229,53,43,.75)'], [h.g, 'rgba(110,190,90,.7)'], [h.b, 'rgba(60,110,230,.75)']]);
  drawHistogram($<HTMLCanvasElement>('hist-l'), [[h.l, 'rgba(237,230,218,.7)']]);
}

function analyse() {
  if (!pixels) return;
  $('status').textContent = 'Analysing…';
  worker.postMessage({ pixels, k: +$<HTMLInputElement>('k').value });
}

worker.onmessage = (e: MessageEvent<{ swatches?: Swatch[]; error?: string }>) => {
  $('status').textContent = '';
  if (e.data.error) return showError('err', `Analysis failed: ${e.data.error}`);
  swatches = e.data.swatches ?? [];
  renderSwatches();
};
worker.onerror = () => showError('err', 'Colour analysis isn’t available in this browser.');

$('drop').addEventListener('files', async (e) => {
  const file = (e as CustomEvent<File[]>).detail[0];
  clearError('err');
  const v = validateFile(file);
  if (!v.ok) return showError('err', v.message);
  try {
    bitmap?.close();
    bitmap = await loadImage(file);
    fileName = file.name;
    const view = $<HTMLCanvasElement>('preview');
    const p = fitWithin(bitmap.width, bitmap.height, 1600);
    view.width = p.width; view.height = p.height;
    view.getContext('2d')!.drawImage(bitmap, 0, 0, p.width, p.height);
    view.hidden = false; $('empty').hidden = true;
    const s = fitWithin(bitmap.width, bitmap.height, 400);
    const small = new OffscreenCanvas(s.width, s.height);
    const sctx = small.getContext('2d', { willReadFrequently: true })!;
    sctx.drawImage(bitmap, 0, 0, s.width, s.height);
    pixels = sctx.getImageData(0, 0, s.width, s.height).data;
    drawHistograms(computeHistograms(pixels));
    analyse();
  } catch (err) {
    showError('err', (err as Error).message);
  }
});

$('k').addEventListener('input', () => {
  $('k-out').textContent = $<HTMLInputElement>('k').value;
  clearTimeout(timer);
  timer = window.setTimeout(analyse, 150);
});

$('copy-css').addEventListener('click', () => copy(paletteCss(swatches)));
$('dl-json').addEventListener('click', () => downloadBlob(new Blob([paletteJson(swatches)], { type: 'application/json' }), `${baseName(fileName)}-palette.json`));
$('dl-png').addEventListener('click', async () => {
  if (!bitmap) return;
  const p = fitWithin(bitmap.width, bitmap.height, 2000);
  const band = Math.round(p.width * 0.16), pad = Math.round(p.width * 0.03);
  const c = document.createElement('canvas');
  c.width = p.width + pad * 2; c.height = p.height + band + pad * 3;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#12100E'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bitmap, pad, pad, p.width, p.height);
  const w = p.width / swatches.length, y = pad * 2 + p.height;
  await document.fonts.load(`500 ${band * 0.12}px "IBM Plex Mono"`).catch(() => null);
  swatches.forEach((s, i) => {
    ctx.fillStyle = s.hex; ctx.fillRect(pad + i * w, y, w - pad / 3, band * 0.72);
    ctx.fillStyle = '#EDE6DA'; ctx.font = `500 ${band * 0.12}px "IBM Plex Mono", monospace`;
    ctx.fillText(s.hex.toUpperCase(), pad + i * w, y + band * 0.92);
  });
  try {
    downloadBlob(await exportCanvas(c, 'image/png'), `${baseName(fileName)}-palette.png`);
  } catch (err) {
    showError('err', (err as Error).message);
  }
});
