import { watermarkAnchor, type Position, type ResizePlan } from './logic';

export type Watermark = {
  kind: 'none' | 'text' | 'image'; text: string; font: 'serif' | 'mono' | 'sans'; sizePct: number; color: string;
  opacity: number; shadow: boolean; image: ImageBitmap | null; imageScale: number; position: Position; marginPct: number;
};

const FONTS = { serif: '"Fraunces Variable", Georgia, serif', mono: '"IBM Plex Mono", monospace', sans: '"Helvetica Neue", Helvetica, Arial, sans-serif' };
export const wmFont = (wm: Watermark, px: number) => `${wm.font === 'serif' ? 500 : 600} ${px}px ${FONTS[wm.font]}`;

/** Renders one output image at `scale` (1 = full output size). */
export function renderOne(bitmap: ImageBitmap, plan: ResizePlan, wm: Watermark, scale = 1): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(plan.canvasW * scale));
  c.height = Math.max(1, Math.round(plan.canvasH * scale));
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  const { src, dst } = plan;
  ctx.drawImage(bitmap, src.x, src.y, src.w, src.h, dst.x * scale, dst.y * scale, dst.w * scale, dst.h * scale);

  if (wm.kind === 'text' && wm.text.trim()) {
    const px = Math.max(6, (Math.min(c.width, c.height) * wm.sizePct) / 100);
    ctx.font = wmFont(wm, px);
    ctx.textBaseline = 'top';
    const w = ctx.measureText(wm.text).width, h = px * 1.1;
    const { x, y } = watermarkAnchor(c.width, c.height, w, h, wm.position, wm.marginPct);
    ctx.globalAlpha = wm.opacity;
    if (wm.shadow) { ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = px * 0.25; ctx.shadowOffsetY = px * 0.05; }
    ctx.fillStyle = wm.color;
    ctx.fillText(wm.text, x, y);
  } else if (wm.kind === 'image' && wm.image) {
    const w = (c.width * wm.imageScale) / 100, h = (w * wm.image.height) / wm.image.width;
    const { x, y } = watermarkAnchor(c.width, c.height, w, h, wm.position, wm.marginPct);
    ctx.globalAlpha = wm.opacity;
    ctx.drawImage(wm.image, x, y, w, h);
  }
  ctx.globalAlpha = 1;
  ctx.shadowColor = 'transparent';
  return c;
}
