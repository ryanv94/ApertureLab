import { cleanModel, type ExifFields } from './brands';
import { formatShutter } from '../../lib/format';

type Tag = { value?: unknown; description?: string } | undefined;

/** ExifReader values: number, [n] (shorts), [num, den] (rational) or [[num, den]]. */
function num(tag: Tag): number {
  const v = tag?.value;
  if (typeof v === 'number') return v;
  if (!Array.isArray(v) || v.length === 0) return NaN;
  if (Array.isArray(v[0])) return v[0][1] ? v[0][0] / v[0][1] : NaN;
  if (v.length === 2) return v[1] ? (v[0] as number) / (v[1] as number) : NaN;
  return typeof v[0] === 'number' ? v[0] : NaN;
}
const str = (tag: Tag) => (tag?.description ?? '').toString().replace(/\0/g, '').trim();
const ok = (n: number) => Number.isFinite(n) && n > 0;

export async function readExif(file: File): Promise<ExifFields> {
  const ExifReader = (await import('exifreader')).default;
  let tags: Record<string, Tag> = {};
  try {
    tags = ExifReader.load(await file.arrayBuffer()) as unknown as Record<string, Tag>;
  } catch {
    /* no EXIF block — every field stays blank */
  }
  const make = str(tags.Make);
  const focal = num(tags.FocalLength), fnum = num(tags.FNumber), exp = num(tags.ExposureTime);
  const iso = num(tags.ISOSpeedRatings ?? tags.PhotographicSensitivity);
  const date = str(tags.DateTimeOriginal).slice(0, 10).replace(/:/g, '-');
  return {
    make,
    model: cleanModel(make, str(tags.Model)),
    lens: str(tags.LensModel),
    focal: ok(focal) ? String(Math.round(focal)) : '',
    aperture: ok(fnum) ? String(+fnum.toFixed(1)) : '',
    shutter: ok(exp) ? formatShutter(exp) : '',
    iso: ok(iso) ? String(Math.round(iso)) : '',
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
  };
}
