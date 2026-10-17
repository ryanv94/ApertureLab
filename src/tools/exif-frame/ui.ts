import { BRANDS, detectBrand, type ExifFields } from './brands';
import { readExif } from './exif';
import { renderFrame, fontsFor, type FrameOptions, type Typeface } from './render';
import type { FrameLayout } from './layout';
import { computeFrame } from './layout';
import { validateFile, loadImage, exportCanvas, guardCanvasSize, fitWithin } from '../../lib/image';
import { downloadBlob, baseName } from '../../lib/download';
import { showError, clearError } from '../../lib/errors';
import { syncFill } from '../../lib/slider-fill';

const $ = <T extends HTMLElement = HTMLInputElement>(id: string) => document.getElementById(id) as T;
const radio = (name: string) => (document.querySelector(`input[name="${name}"]:checked`) as HTMLInputElement).value;
const FIELDS = ['model', 'lens', 'focal', 'aperture', 'shutter', 'iso', 'date'] as const;

const preview = $<HTMLCanvasElement>('preview');
const logos = new Map<string, HTMLImageElement>();
let bitmap: ImageBitmap | null = null;
let fileName = 'photo.jpg';
let make = '';
let autoBrand: string | null = null;

function logoFor(id: string | null): Promise<HTMLImageElement | null> {
  if (!id) return Promise.resolve(null);
  const brand = BRANDS.find((b) => b.id === id);
  if (!brand) return Promise.resolve(null);
  const cached = logos.get(id);
  if (cached?.complete) return Promise.resolve(cached);
  return new Promise((resolve) => {
    const img = cached ?? new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    if (!cached) { img.src = brand.logo; logos.set(id, img); }
  });
}

function fields(): ExifFields {
  const f = { make } as ExifFields;
  for (const k of FIELDS) f[k] = $(`f-${k}`).value.trim();
  return f;
}

async function options(): Promise<FrameOptions> {
  const choice = $<HTMLSelectElement>('brand').value;
  const id = choice === 'auto' ? autoBrand : choice === 'none' ? null : choice;
  const typeface = radio('type') as Typeface;
  await Promise.all(fontsFor(typeface).map((f) => document.fonts.load(f).catch(() => null)));
  return {
    layout: radio('layout') as FrameLayout,
    thicknessPct: +$('thickness').value,
    matte: $<HTMLSelectElement>('matte').value,
    keyline: $('keyline').checked,
    typeface,
    fields: fields(),
    brandLabel: BRANDS.find((b) => b.id === id)?.label ?? '',
    logo: await logoFor(id),
  };
}

let pending = 0;
async function draw() {
  if (!bitmap) return;
  const ticket = ++pending;
  const o = await options();
  if (ticket !== pending) return;
  $<HTMLOutputElement>('thickness-out').textContent = `${$('thickness').value}%`;
  const f = computeFrame({ imgW: bitmap.width, imgH: bitmap.height, layout: o.layout, thicknessPct: o.thicknessPct });
  const fit = fitWithin(f.canvasW, f.canvasH, 1800);
  renderFrame(preview, bitmap, o, fit.width / f.canvasW);
  preview.hidden = false;
  $('empty').hidden = true;
  ($('download') as unknown as HTMLButtonElement).disabled = false;
}

async function open(file: File) {
  clearError('err');
  const v = validateFile(file);
  if (!v.ok) return showError('err', v.message);
  try {
    const [bmp, exif] = await Promise.all([loadImage(file), readExif(file)]);
    bitmap?.close();
    bitmap = bmp;
    fileName = file.name;
    make = exif.make;
    for (const k of FIELDS) $(`f-${k}`).value = exif[k];
    autoBrand = detectBrand(exif.make, exif.model);
    const label = BRANDS.find((b) => b.id === autoBrand)?.label;
    $('brand-auto').textContent = label ? `Detected: ${label}` : 'No brand detected';
    $('fields').hidden = false;
    await draw();
  } catch (e) {
    showError('err', (e as Error).message);
  }
}

$('drop').addEventListener('files', (e) => open((e as CustomEvent<File[]>).detail[0]));
document.querySelectorAll('#controls input, #controls select').forEach((el) => el.addEventListener('input', draw));

$('download').addEventListener('click', async () => {
  if (!bitmap) return;
  clearError('err');
  try {
    await exportFramed(bitmap);
  } catch (err) {
    showError('err', (err as Error).message);
  }
});

async function exportFramed(bitmap: ImageBitmap) {
  const o = await options();
  const f = computeFrame({ imgW: bitmap.width, imgH: bitmap.height, layout: o.layout, thicknessPct: o.thicknessPct });
  const g = guardCanvasSize(f.canvasW, f.canvasH);
  if (g.capped) showError('err', `This frame is too large for your browser at full size, so it was exported at ${g.width}×${g.height}.`);
  const canvas = document.createElement('canvas');
  renderFrame(canvas, bitmap, o, g.width / f.canvasW);
  const png = radio('format') === 'png';
  const blob = await exportCanvas(canvas, png ? 'image/png' : 'image/jpeg', 0.95, o.matte);
  canvas.width = canvas.height = 0;
  downloadBlob(blob, `${baseName(fileName)}-framed.${png ? 'png' : 'jpg'}`);
}

syncFill($('thickness'));
