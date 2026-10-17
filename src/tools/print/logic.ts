export type Rect = { x: number; y: number; w: number; h: number };
export type PrintSize = { id: string; label: string; wIn: number; hIn: number; unit: 'in' | 'mm' };

const inch = (w: number, h: number): PrintSize => ({ id: `${w}x${h}`, label: `${w} × ${h} in`, wIn: w, hIn: h, unit: 'in' });
const iso = (id: string, w: number, h: number): PrintSize => ({ id, label: `${id.toUpperCase()} · ${w} × ${h} mm`, wIn: w / 25.4, hIn: h / 25.4, unit: 'mm' });

export const PRINT_SIZES: PrintSize[] = [
  inch(4, 6), inch(5, 7), inch(8, 10), inch(8, 12), inch(11, 14), inch(12, 18), inch(16, 20), inch(20, 30), inch(24, 36),
  iso('a6', 105, 148), iso('a5', 148, 210), iso('a4', 210, 297), iso('a3', 297, 420), iso('a2', 420, 594), iso('a1', 594, 841),
];

export type Rating = 'excellent' | 'good' | 'acceptable' | 'low';
export const rateDpi = (dpi: number): Rating => (dpi >= 300 ? 'excellent' : dpi >= 200 ? 'good' : dpi >= 150 ? 'acceptable' : 'low');

export type FitInput = { imgW: number; imgH: number; wIn: number; hIn: number; orientation: 'auto' | 'portrait' | 'landscape'; pan?: number };
export type Fit = { dpi: number; cropPct: number; src: Rect; printW: number; printH: number };

/** Largest crop of the image at the print's aspect ratio; `pan` (0–1) slides it along the cropped axis. */
export function printFit({ imgW, imgH, wIn, hIn, orientation, pan = 0.5 }: FitInput): Fit {
  const long = Math.max(wIn, hIn), short = Math.min(wIn, hIn);
  const landscape = orientation === 'landscape' || (orientation === 'auto' && imgW >= imgH);
  const printW = landscape ? long : short, printH = landscape ? short : long;
  const pa = printW / printH;
  let src: Rect;
  if (imgW / imgH > pa) {
    const w = Math.round(imgH * pa);
    src = { x: Math.round((imgW - w) * pan), y: 0, w, h: imgH };
  } else {
    const h = Math.round(imgW / pa);
    src = { x: 0, y: Math.round((imgH - h) * pan), w: imgW, h };
  }
  return {
    dpi: Math.round(src.w / printW),
    cropPct: Math.round((1 - (src.w * src.h) / (imgW * imgH)) * 1000) / 10,
    src, printW, printH,
  };
}

export function maxPrint(imgW: number, imgH: number, dpi: number) {
  const wIn = imgW / dpi, hIn = imgH / dpi;
  return { wIn, hIn, wMm: wIn * 25.4, hMm: hIn * 25.4 };
}
