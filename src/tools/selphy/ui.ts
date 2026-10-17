import { SHEET_W, SHEET_H, SLOT_ASPECT, CALIBRATIONS, slotRects, cutMarks, type Rect } from './logic';
import { validateFile, loadImage, exportCanvas, setJpegDpi } from '../../lib/image';
import { saveImages } from '../../lib/save';
import { showError, clearError } from '../../lib/errors';
import { openCropper } from '../../lib/cropper';
import { syncFill } from '../../lib/slider-fill';

const $ = <T extends HTMLElement = HTMLInputElement>(id: string) => document.getElementById(id) as T;
const radio = (name: string) => (document.querySelector(`input[name="${name}"]:checked`) as HTMLInputElement).value;

type Slot = { source: ImageBitmap; cropped: ImageBitmap; name: string } | null;
const slots: [Slot, Slot] = [null, null];
const sheet = $<HTMLCanvasElement>('sheet');
sheet.width = SHEET_W; sheet.height = SHEET_H;

function scales(): { w: number; h: number } {
  const mode = radio('calib') as 'selphy' | 'none' | 'custom';
  $('custom-calib').hidden = mode !== 'custom';
  if (mode === 'custom') return { w: +$('w-scale').value, h: +$('h-scale').value };
  return CALIBRATIONS[mode];
}

const filled = (i: 0 | 1): Slot => (i === 1 && $('same').checked ? slots[0] : slots[i]);

function placeholder(ctx: CanvasRenderingContext2D, r: Rect, i: number) {
  ctx.fillStyle = 'rgba(18,16,14,.04)';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = 'rgba(18,16,14,.25)'; ctx.lineWidth = 4; ctx.setLineDash([16, 14]);
  ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(18,16,14,.55)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '500 40px "Fraunces Variable", Georgia, serif';
  ctx.fillText(`Magnet ${i + 1}`, r.x + r.w / 2, r.y + r.h / 2 - 20);
  ctx.font = '500 22px "IBM Plex Mono", monospace';
  ctx.fillText('45 × 70 mm', r.x + r.w / 2, r.y + r.h / 2 + 26);
}

function draw(canvas: HTMLCanvasElement, forExport: boolean) {
  const s = scales();
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, SHEET_W, SHEET_H);
  slotRects(s.w, s.h).forEach((r, i) => {
    const slot = filled(i as 0 | 1);
    if (!slot) { if (!forExport) placeholder(ctx, r, i); return; }
    ctx.drawImage(slot.cropped, r.x, r.y, r.w, r.h);
    if ($('trim').checked) {
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.setLineDash([6, 6]);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (const [x1, y1, x2, y2] of cutMarks(r)) { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
    ctx.stroke();
  });
}

function update() {
  const s = scales();
  ['w-scale', 'h-scale'].forEach((id) => { syncFill($(id)); $(`${id}-out`).textContent = `${(+$(id).value).toFixed(1)}%`; });
  $('calib-metric').textContent = radio('calib') === 'custom' ? `Custom ${s.w.toFixed(1)}% × ${s.h.toFixed(1)}%` : CALIBRATIONS[radio('calib') as 'selphy' | 'none'].label;
  draw(sheet, false);
  for (const i of [0, 1] as const) {
    const slot = filled(i);
    const card = $(`slot${i + 1}`);
    card.dataset.filled = String(!!slot);
    $(`slot${i + 1}-status`).textContent = i === 1 && $('same').checked ? 'Same as magnet 1' : slot ? slot.name : 'Empty';
  }
  $('slot2').classList.toggle('mirrored', $('same').checked);
  ($('download') as unknown as HTMLButtonElement).disabled = !(filled(0) || filled(1));
}

async function cropInto(i: 0 | 1, source: ImageBitmap, name: string) {
  let cropped: ImageBitmap | null;
  try {
    cropped = await openCropper(source, SLOT_ASPECT, `Crop magnet ${i + 1} · 45 × 70 mm`);
  } catch (err) {
    showError('err', (err as Error).message);
    return;
  }
  if (!cropped) return;
  const old = slots[i];
  if (old && old.source !== source) old.source.close();
  old?.cropped.close();
  slots[i] = { source, cropped, name };
  update();
}

for (const i of [0, 1] as const) {
  $(`slot${i + 1}-drop`).addEventListener('files', async (e) => {
    const file = (e as CustomEvent<File[]>).detail[0];
    clearError('err');
    const v = validateFile(file);
    if (!v.ok) return showError('err', v.message);
    try { await cropInto(i, await loadImage(file), file.name); } catch (err) { showError('err', (err as Error).message); }
  });
  $(`slot${i + 1}-recrop`).addEventListener('click', () => { const s = slots[i]; if (s) cropInto(i, s.source, s.name); });
  $(`slot${i + 1}-remove`).addEventListener('click', () => { const s = slots[i]; s?.source.close(); s?.cropped.close(); slots[i] = null; update(); });
}

document.querySelectorAll('#controls input').forEach((el) => el.addEventListener('input', update));

$('download').addEventListener('click', async () => {
  const out = document.createElement('canvas');
  out.width = SHEET_W; out.height = SHEET_H;
  draw(out, true);
  clearError('err');
  try {
    await saveImages([{ blob: await setJpegDpi(await exportCanvas(out, 'image/jpeg', 0.98), 300), name: 'selphy-magnets.jpg' }]);
  } catch (err) {
    showError('err', (err as Error).message);
  }
});

document.fonts.ready.then(update);
update();
