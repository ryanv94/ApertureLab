export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/bmp'];
const ACCEPTED_EXT = /\.(jpe?g|png|webp|avif|gif|bmp)$/i;
const HEIC = /\.(heic|heif)$/i;

export const MAX_EDGE = 16384;
export const MAX_AREA = 268_435_456;

export type Validation = { ok: true } | { ok: false; message: string };

export function validateFile(f: File, opts: { allowSvg?: boolean } = {}): Validation {
  if (opts.allowSvg && (f.type === 'image/svg+xml' || /\.svg$/i.test(f.name))) return { ok: true };
  if (f.type === 'image/heic' || f.type === 'image/heif' || HEIC.test(f.name)) {
    return { ok: false, message: `${f.name}: HEIC photos can't be decoded by most browsers (only Safari). Export it as JPEG first.` };
  }
  if (ACCEPTED_TYPES.includes(f.type) || (!f.type && ACCEPTED_EXT.test(f.name))) return { ok: true };
  if (f.type.startsWith('image/')) return { ok: false, message: `${f.name}: this image format isn't supported. Try JPEG, PNG or WebP.` };
  return { ok: false, message: `${f.name} isn't an image file.` };
}

/** Decodes a file honouring EXIF orientation. SVGs are rasterised (2048px on the long edge). */
export async function loadImage(f: File): Promise<ImageBitmap> {
  if (f.type === 'image/svg+xml' || /\.svg$/i.test(f.name)) return rasteriseSvg(f);
  try {
    return await createImageBitmap(f, { imageOrientation: 'from-image' });
  } catch {
    throw new Error(`Couldn't decode ${f.name}. The file may be damaged or in an unsupported format.`);
  }
}

async function rasteriseSvg(f: File): Promise<ImageBitmap> {
  const url = URL.createObjectURL(new Blob([await f.arrayBuffer()], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const w0 = img.naturalWidth || 1024, h0 = img.naturalHeight || 1024;
    const s = 2048 / Math.max(w0, h0);
    const c = document.createElement('canvas');
    c.width = Math.round(w0 * s); c.height = Math.round(h0 * s);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return await createImageBitmap(c);
  } catch {
    throw new Error(`Couldn't read ${f.name} as an SVG image.`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

let probedArea: number | null = null;

/** Largest canvas area this browser can draw. iOS/iPadOS Safari stops at 16.7 MP; others are far higher. */
export function maxCanvasArea(): number {
  if (probedArea !== null) return probedArea;
  probedArea = MAX_AREA;
  try {
    const tiny = document.createElement('canvas').getContext('2d');
    if (!tiny) return probedArea; // no canvas (e.g. test DOM) — assume desktop limits
    const c = document.createElement('canvas');
    c.width = 4097; c.height = 4097; // just over 16,777,216 px
    const ctx = c.getContext('2d');
    ctx?.fillRect(4096, 4096, 1, 1);
    if (!ctx || ctx.getImageData(4096, 4096, 1, 1).data[3] === 0) probedArea = 16_777_216;
    c.width = c.height = 0;
  } catch {
    probedArea = 16_777_216;
  }
  return probedArea;
}

export function fitWithin(w: number, h: number, maxEdge: number): { width: number; height: number } {
  const s = Math.min(1, maxEdge / Math.max(w, h));
  return { width: Math.round(w * s), height: Math.round(h * s) };
}

/** Caps a canvas size to browser limits, preserving aspect ratio. */
export function guardCanvasSize(w: number, h: number, maxArea = maxCanvasArea()): { width: number; height: number; capped: boolean } {
  let s = Math.min(1, MAX_EDGE / Math.max(w, h));
  if (w * s * h * s > maxArea) s = Math.sqrt(maxArea / (w * h));
  if (s >= 1) return { width: w, height: h, capped: false };
  return { width: Math.floor(w * s), height: Math.floor(h * s), capped: true };
}

export type ExportType = 'image/jpeg' | 'image/png' | 'image/webp';

/** Encodes a canvas. JPEG output is composited onto `background` so transparency never turns black. */
export async function exportCanvas(
  c: HTMLCanvasElement | OffscreenCanvas, type: ExportType, quality = 0.92, background = '#FFFFFF',
): Promise<Blob> {
  let src = c;
  if (type === 'image/jpeg') {
    const flat = document.createElement('canvas');
    flat.width = c.width; flat.height = c.height;
    const ctx = flat.getContext('2d');
    if (!ctx) throw new Error('Export failed — the image is too large for this browser. Try a smaller size.');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, flat.width, flat.height);
    ctx.drawImage(c, 0, 0);
    src = flat;
  }
  if ('convertToBlob' in src) return src.convertToBlob({ type, quality });
  return new Promise((resolve, reject) =>
    (src as HTMLCanvasElement).toBlob((b) => (b ? resolve(b) : reject(new Error('Export failed — the image may be too large for this browser. Try a smaller size.'))), type, quality));
}

/** Writes print density into a JPEG's JFIF APP0 segment (inserting one if absent). */
export async function setJpegDpi(blob: Blob, dpi: number): Promise<Blob> {
  const b = new Uint8Array(await blob.arrayBuffer());
  const hi = (dpi >> 8) & 0xff, lo = dpi & 0xff;
  const isJfif = b[2] === 0xff && b[3] === 0xe0 && b[6] === 0x4a && b[7] === 0x46 && b[8] === 0x49 && b[9] === 0x46 && b[10] === 0;
  if (isJfif) {
    const out = b.slice();
    out[13] = 1; out[14] = hi; out[15] = lo; out[16] = hi; out[17] = lo;
    return new Blob([out], { type: 'image/jpeg' });
  }
  const app0 = new Uint8Array([0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, hi, lo, hi, lo, 0x00, 0x00]);
  return new Blob([b.subarray(0, 2), app0, b.subarray(2)], { type: 'image/jpeg' });
}
