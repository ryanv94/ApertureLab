export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/bmp'];
const ACCEPTED_EXT = /\.(jpe?g|png|webp|avif|gif|bmp)$/i;
const HEIC = /\.(heic|heif)$/i;

export const MAX_EDGE = 16384;
export const MAX_AREA = 268_435_456;

export type Validation = { ok: true } | { ok: false; message: string };

export function validateFile(f: File): Validation {
  if (f.type === 'image/heic' || f.type === 'image/heif' || HEIC.test(f.name)) {
    return { ok: false, message: `${f.name}: HEIC photos can't be decoded by most browsers (only Safari). Export it as JPEG first.` };
  }
  if (ACCEPTED_TYPES.includes(f.type) || (!f.type && ACCEPTED_EXT.test(f.name))) return { ok: true };
  if (f.type.startsWith('image/')) return { ok: false, message: `${f.name}: this image format isn't supported. Try JPEG, PNG or WebP.` };
  return { ok: false, message: `${f.name} isn't an image file.` };
}

/** Decodes a file honouring EXIF orientation. */
export async function loadImage(f: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(f, { imageOrientation: 'from-image' });
  } catch {
    throw new Error(`Couldn't decode ${f.name}. The file may be damaged or in an unsupported format.`);
  }
}

export function fitWithin(w: number, h: number, maxEdge: number): { width: number; height: number } {
  const s = Math.min(1, maxEdge / Math.max(w, h));
  return { width: Math.round(w * s), height: Math.round(h * s) };
}

/** Caps a canvas size to browser limits, preserving aspect ratio. */
export function guardCanvasSize(w: number, h: number): { width: number; height: number; capped: boolean } {
  let s = Math.min(1, MAX_EDGE / Math.max(w, h));
  if (w * s * h * s > MAX_AREA) s = Math.sqrt(MAX_AREA / (w * h));
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
    const ctx = flat.getContext('2d')!;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, flat.width, flat.height);
    ctx.drawImage(c, 0, 0);
    src = flat;
  }
  if ('convertToBlob' in src) return src.convertToBlob({ type, quality });
  return new Promise((resolve, reject) =>
    (src as HTMLCanvasElement).toBlob((b) => (b ? resolve(b) : reject(new Error('Export failed — the image may be too large for this browser.'))), type, quality));
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
