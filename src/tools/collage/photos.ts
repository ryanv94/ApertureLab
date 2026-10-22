import { validateFile as validateImage, loadImage } from '../../lib/image';

export const MIN_PHOTOS = 6;
export const MAX_PHOTOS = 10;

/** Shared image validation, as a message or null (Collage reports several files at once). */
export function validateFile(file: File): string | null {
  const v = validateImage(file);
  return v.ok ? null : v.message;
}

export function validateCount(n: number): string | null {
  if (n < MIN_PHOTOS) return `Add at least ${MIN_PHOTOS} photos (you have ${n}).`;
  if (n > MAX_PHOTOS) return `Collage takes at most ${MAX_PHOTOS} photos (you have ${n}).`;
  return null;
}

export interface Photo {
  id: string;
  name: string;
  file: File;
  /** Oriented full-size dimensions. */
  w: number;
  h: number;
  /** Downscaled bitmap for preview. */
  preview: ImageBitmap;
}

let nextId = 0;

export async function loadPhoto(file: File, previewMax: number): Promise<Photo> {
  const full = await loadImage(file);
  const { width: w, height: h } = full;
  const scale = Math.min(1, previewMax / Math.max(w, h));
  const preview =
    scale < 1
      ? await createImageBitmap(full, {
          resizeWidth: Math.max(1, Math.round(w * scale)),
          resizeHeight: Math.max(1, Math.round(h * scale)),
          resizeQuality: 'high',
        })
      : full;
  if (preview !== full) full.close();
  return { id: `p${nextId++}`, name: file.name, file, w, h, preview };
}

/** Centred cover-fit source rectangle for drawing `src` into a cell. */
export function coverSource(srcW: number, srcH: number, cellW: number, cellH: number) {
  const srcAspect = srcW / srcH;
  const cellAspect = cellW / cellH;
  if (srcAspect > cellAspect) {
    const sw = srcH * cellAspect;
    return { sx: (srcW - sw) / 2, sy: 0, sw, sh: srcH };
  }
  const sh = srcW / cellAspect;
  return { sx: 0, sy: (srcH - sh) / 2, sw: srcW, sh };
}
