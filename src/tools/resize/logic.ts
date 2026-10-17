export type Rect = { x: number; y: number; w: number; h: number };

export const SIZE_PRESETS = [
  { id: 'original', label: 'Original size', w: null, h: null },
  { id: 'ig-square', label: 'Instagram square · 1080×1080', w: 1080, h: 1080 },
  { id: 'ig-portrait', label: 'Instagram portrait · 1080×1350', w: 1080, h: 1350 },
  { id: 'ig-story', label: 'Story / Reel · 1080×1920', w: 1080, h: 1920 },
  { id: 'fhd', label: 'Full HD · 1920×1080', w: 1920, h: 1080 },
  { id: 'uhd', label: '4K UHD · 3840×2160', w: 3840, h: 2160 },
  { id: 'custom', label: 'Custom…', w: null, h: null },
] as const satisfies readonly { id: string; label: string; w: number | null; h: number | null }[];

export type ResizeInput = { srcW: number; srcH: number; targetW: number; targetH: number | null; mode: 'fit' | 'fill' | 'crop'; crop?: Rect };
export type ResizePlan = { canvasW: number; canvasH: number; src: Rect; dst: Rect };

export function planResize({ srcW, srcH, targetW, targetH, mode, crop }: ResizeInput): ResizePlan {
  if (mode === 'crop' && crop) {
    const canvasW = Math.round(targetW);
    const canvasH = Math.round(targetH ?? (canvasW * crop.h) / crop.w);
    return { canvasW, canvasH, src: { ...crop }, dst: { x: 0, y: 0, w: canvasW, h: canvasH } };
  }
  if (mode === 'fill' && targetH) {
    const ta = targetW / targetH;
    const src = srcW / srcH > ta
      ? { x: Math.round((srcW - srcH * ta) / 2), y: 0, w: Math.round(srcH * ta), h: srcH }
      : { x: 0, y: Math.round((srcH - srcW / ta) / 2), w: srcW, h: Math.round(srcW / ta) };
    return { canvasW: targetW, canvasH: targetH, src, dst: { x: 0, y: 0, w: targetW, h: targetH } };
  }
  const s = targetH ? Math.min(targetW / srcW, targetH / srcH) : targetW / srcW;
  const canvasW = Math.round(srcW * s), canvasH = Math.round(srcH * s);
  return { canvasW, canvasH, src: { x: 0, y: 0, w: srcW, h: srcH }, dst: { x: 0, y: 0, w: canvasW, h: canvasH } };
}

export type Position = 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br';

/** Top-left corner for a watermark box; margin is a percentage of the canvas's short edge. */
export function watermarkAnchor(canvasW: number, canvasH: number, boxW: number, boxH: number, position: Position, marginPct: number) {
  const m = (Math.min(canvasW, canvasH) * marginPct) / 100;
  const col = position[1], row = position[0];
  const x = col === 'l' ? m : col === 'r' ? canvasW - boxW - m : (canvasW - boxW) / 2;
  const y = row === 't' ? m : row === 'b' ? canvasH - boxH - m : (canvasH - boxH) / 2;
  return { x: Math.round(x), y: Math.round(y) };
}

export function outputName(original: string, w: number, h: number, ext: string): string {
  const i = original.lastIndexOf('.');
  return `${i > 0 ? original.slice(0, i) : original}-${w}x${h}.${ext}`;
}
