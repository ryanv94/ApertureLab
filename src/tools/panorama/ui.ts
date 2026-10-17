import { RATIOS, planSlices, planCover, outputScale, type Rect } from './logic';
import { validateFile, loadImage, exportCanvas, guardCanvasSize } from '../../lib/image';
import { downloadBlob, downloadZip, baseName } from '../../lib/download';
import { showError, clearError } from '../../lib/errors';

const $ = <T extends HTMLElement = HTMLInputElement>(id: string) => document.getElementById(id) as T;
const radio = (name: string) => (document.querySelector(`input[name="${name}"]:checked`) as HTMLInputElement).value;
const MATTES: Record<string, string> = { black: '#000000', white: '#FFFFFF', blur: '#000000' };
const PREVIEW_H = 340;

let bitmap: ImageBitmap | null = null;
let fileName = 'panorama.jpg';

type Slide = { name: string; w: number; h: number; draw: (ctx: CanvasRenderingContext2D, s: number) => void; capped: boolean };

function ratio(): number {
  const r = RATIOS.find((x) => x.id === radio('ratio'))!;
  if (r.id !== 'custom') return r.w / r.h;
  return Math.max(0.2, +$('rw').value || 1) / Math.max(0.2, +$('rh').value || 1);
}

function slides(): Slide[] {
  if (!bitmap) return [];
  const bmp = bitmap;
  const count = Math.min(10, Math.max(2, Math.round(+$('count').value || 3)));
  const mode = radio('mode') as 'fit' | 'crop';
  const r = ratio();
  const plan = planSlices({ imgW: bmp.width, imgH: bmp.height, count, ratio: r, mode, offset: +$('offset').value / 100 });
  const size = radio('output') as 'ig' | 'native';
  const matte = radio('matte');
  const fill = MATTES[matte];
  const out: Slide[] = [];

  const sized = (w: number, h: number, s: number) => {
    const g = guardCanvasSize(Math.round(w * s), Math.round(h * s));
    return { w: g.width, h: g.height, k: g.width / w, capped: g.capped };
  };
  const paint = (ctx: CanvasRenderingContext2D, k: number, w: number, h: number, src: Rect, dst: Rect) => {
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, w * k, h * k);
    ctx.drawImage(bmp, src.x, src.y, src.w, src.h, dst.x * k, dst.y * k, dst.w * k, dst.h * k);
  };

  if ($('cover').checked) {
    const c = planCover({ imgW: bmp.width, imgH: bmp.height, ratio: r });
    const z = sized(c.canvasW, c.canvasH, size === 'ig' ? 1080 / c.canvasW : 1);
    out.push({
      name: 'slide-00-cover.jpg', w: z.w, h: z.h, capped: z.capped,
      draw: (ctx, s) => {
        const k = z.k * s;
        ctx.fillStyle = fill;
        ctx.fillRect(0, 0, c.canvasW * k, c.canvasH * k);
        if (matte === 'blur') {
          const cover = Math.max(c.canvasW / bmp.width, c.canvasH / bmp.height);
          ctx.filter = `blur(${Math.round(40 * k * (c.canvasW / 1080))}px) brightness(.7)`;
          ctx.drawImage(bmp, (c.canvasW - bmp.width * cover) / 2 * k, (c.canvasH - bmp.height * cover) / 2 * k, bmp.width * cover * k, bmp.height * cover * k);
          ctx.filter = 'none';
        }
        ctx.drawImage(bmp, c.dst.x * k, c.dst.y * k, c.dst.w * k, c.dst.h * k);
      },
    });
  }
  const z = sized(plan.slideW, plan.slideH, outputScale(plan.slideW, size));
  plan.slices.forEach((sl, i) => out.push({
    name: `slide-${String(i + 1).padStart(2, '0')}.jpg`, w: z.w, h: z.h, capped: z.capped,
    draw: (ctx, s) => paint(ctx, z.k * s, plan.slideW, plan.slideH, sl.src, sl.dst),
  }));
  return out;
}

function renderSlide(sl: Slide, scale: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(sl.w * scale));
  c.height = Math.max(1, Math.round(sl.h * scale));
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  sl.draw(ctx, scale);
  return c;
}

const blobOf = (sl: Slide) => exportCanvas(renderSlide(sl, 1), 'image/jpeg', 0.92, '#000000');

function update() {
  $('custom-ratio').hidden = radio('ratio') !== 'custom';
  $<HTMLOutputElement>('offset-out').textContent = `${$('offset').value}%`;
  if (!bitmap) return;
  const list = slides();
  const strip = $('slides');
  strip.innerHTML = '';
  for (const [i, sl] of list.entries()) {
    const fig = document.createElement('figure');
    const canvas = renderSlide(sl, PREVIEW_H / sl.h);
    canvas.setAttribute('aria-label', `Slide ${i + 1} preview`);
    const cap = document.createElement('figcaption');
    cap.innerHTML = `<span>${sl.name.includes('cover') ? 'Cover' : String(i + 1 - (list[0].name.includes('cover') ? 1 : 0)).padStart(2, '0')}</span><span class="muted">${sl.w}×${sl.h}</span>`;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'slide-dl'; btn.textContent = '↓';
    btn.setAttribute('aria-label', `Download ${sl.name}`);
    btn.addEventListener('click', async () => downloadBlob(await blobOf(sl), `${baseName(fileName)}-${sl.name}`));
    cap.append(btn);
    fig.append(canvas, cap);
    strip.append(fig);
  }
  const capped = list.some((s) => s.capped);
  if (capped) showError('warn', 'At native size some slides exceed what your browser can render, so they’ll be exported smaller than full resolution.');
  else clearError('warn');
  $('empty').hidden = true;
  ($('download-zip') as unknown as HTMLButtonElement).disabled = false;
}

$('drop').addEventListener('files', async (e) => {
  const file = (e as CustomEvent<File[]>).detail[0];
  clearError('err');
  const v = validateFile(file);
  if (!v.ok) return showError('err', v.message);
  try {
    bitmap?.close();
    bitmap = await loadImage(file);
    fileName = file.name;
    $('dims').textContent = `${bitmap.width} × ${bitmap.height}px`;
    update();
  } catch (err) {
    showError('err', (err as Error).message);
  }
});

$('count-dec').addEventListener('click', () => { $('count').value = String(Math.max(2, +$('count').value - 1)); update(); });
$('count-inc').addEventListener('click', () => { $('count').value = String(Math.min(10, +$('count').value + 1)); update(); });
document.querySelectorAll('#controls input').forEach((el) => el.addEventListener('change', update));
$('offset').addEventListener('input', update);

$('download-zip').addEventListener('click', async () => {
  const btn = $('download-zip') as unknown as HTMLButtonElement;
  btn.disabled = true; btn.textContent = 'Preparing…';
  try {
    const files = [];
    for (const sl of slides()) files.push({ name: sl.name, blob: await blobOf(sl) });
    await downloadZip(files, `${baseName(fileName)}-carousel.zip`);
  } catch (err) {
    showError('err', (err as Error).message);
  } finally {
    btn.disabled = false; btn.textContent = 'Download all (.zip)';
  }
});
update();
