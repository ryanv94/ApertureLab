export type RGB = [number, number, number];
export type Lab = [number, number, number];

const WHITE = [0.95047, 1, 1.08883];
const lin = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const gam = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
const fi = (t: number) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27));

/** sRGB (0–255) → CIE Lab (D65). */
export function rgbToLab(r: number, g: number, b: number): Lab {
  const R = lin(r), G = lin(g), B = lin(b);
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / WHITE[0]);
  const y = f((0.2126 * R + 0.7152 * G + 0.0722 * B) / WHITE[1]);
  const z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / WHITE[2]);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

export function labToRgb(L: number, a: number, b: number): RGB {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const X = fi(fx) * WHITE[0], Y = fi(fy) * WHITE[1], Z = fi(fz) * WHITE[2];
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, gam(v))));
  return [c(3.2406 * X - 1.5372 * Y - 0.4986 * Z), c(-0.9689 * X + 1.8758 * Y + 0.0415 * Z), c(0.0557 * X - 0.204 * Y + 1.057 * Z)];
}

export const toHex = (r: number, g: number, b: number): string => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
