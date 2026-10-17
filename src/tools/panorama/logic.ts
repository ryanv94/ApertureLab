export type Rect = { x: number; y: number; w: number; h: number };

export const RATIOS = [
  { id: '4x5', label: '4:5 portrait', w: 4, h: 5 },
  { id: '1x1', label: '1:1 square', w: 1, h: 1 },
  { id: '191x1', label: '1.91:1 landscape', w: 1.91, h: 1 },
  { id: '9x16', label: '9:16 story', w: 9, h: 16 },
  { id: 'custom', label: 'Custom', w: 0, h: 0 },
];

export type SliceInput = { imgW: number; imgH: number; count: number; ratio: number; mode: 'fit' | 'crop'; offset: number };
export type SlicePlan = { slideW: number; slideH: number; slices: { src: Rect; dst: Rect }[] };

/** Slide geometry in source pixels. `ratio` is slide width / height; `offset` (0–1) positions the crop band. */
export function planSlices({ imgW, imgH, count, ratio, mode, offset }: SliceInput): SlicePlan {
  const slices: SlicePlan['slices'] = [];
  if (mode === 'crop') {
    let slideH = imgH, slideW = imgH * ratio, x0 = 0, y0 = 0;
    if (count * slideW > imgW) {
      slideH = imgW / (count * ratio);
      slideW = slideH * ratio;
      y0 = (imgH - slideH) * offset;
    } else {
      x0 = (imgW - count * slideW) * offset;
    }
    for (let i = 0; i < count; i++) slices.push({ src: { x: x0 + i * slideW, y: y0, w: slideW, h: slideH }, dst: { x: 0, y: 0, w: slideW, h: slideH } });
    return { slideW, slideH, slices };
  }
  const slideW = imgW / count, slideH = slideW / ratio;
  const bandH = Math.min(imgH, slideH);
  const srcY = imgH > slideH ? (imgH - slideH) * offset : 0;
  for (let i = 0; i < count; i++) {
    slices.push({ src: { x: i * slideW, y: srcY, w: slideW, h: bandH }, dst: { x: 0, y: (slideH - bandH) / 2, w: slideW, h: bandH } });
  }
  return { slideW, slideH, slices };
}

/** Whole panorama letterboxed into one slide of the target ratio. */
export function planCover({ imgW, imgH, ratio }: { imgW: number; imgH: number; ratio: number }): { canvasW: number; canvasH: number; dst: Rect } {
  if (imgW / imgH >= ratio) {
    const canvasH = imgW / ratio;
    return { canvasW: imgW, canvasH, dst: { x: 0, y: (canvasH - imgH) / 2, w: imgW, h: imgH } };
  }
  const canvasW = imgH * ratio;
  return { canvasW, canvasH: imgH, dst: { x: (canvasW - imgW) / 2, y: 0, w: imgW, h: imgH } };
}

export const outputScale = (slideW: number, size: 'ig' | 'native'): number => (size === 'ig' ? 1080 / slideW : 1);
