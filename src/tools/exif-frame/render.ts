import { computeFrame, type FrameLayout } from './layout';
import { settingsLine, type ExifFields } from './brands';

export type Typeface = 'modern' | 'fineart' | 'technical';
export type FrameOptions = {
  layout: FrameLayout; thicknessPct: number; matte: string; keyline: boolean; typeface: Typeface;
  fields: ExifFields; brandLabel: string; logo: HTMLImageElement | null;
};

const FACES: Record<Typeface, { main: string; sub: string; caps: boolean; weight: number }> = {
  modern: { main: '"Helvetica Neue", Helvetica, Arial, sans-serif', sub: '"Helvetica Neue", Helvetica, Arial, sans-serif', caps: false, weight: 700 },
  fineart: { main: '"Fraunces Variable", Georgia, serif', sub: '"Fraunces Variable", Georgia, serif', caps: false, weight: 500 },
  technical: { main: '"IBM Plex Mono", monospace', sub: '"IBM Plex Mono", monospace', caps: true, weight: 600 },
};

export const fontsFor = (t: Typeface) => [`${FACES[t].weight} 40px ${FACES[t].main}`, `400 40px ${FACES[t].sub}`];

function isDark(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) < 128;
}

/** Logo tinted to a single colour (used on dark mattes, where black logos would vanish). */
function tinted(logo: HTMLImageElement, w: number, h: number, colour: string) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  const x = c.getContext('2d')!;
  x.drawImage(logo, 0, 0, c.width, c.height);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = colour;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

/** Draws the framed photo into `canvas` at `scale` (1 = full resolution). */
export function renderFrame(canvas: HTMLCanvasElement, bitmap: ImageBitmap, o: FrameOptions, scale: number): void {
  const f = computeFrame({ imgW: bitmap.width, imgH: bitmap.height, layout: o.layout, thicknessPct: o.thicknessPct });
  canvas.width = Math.round(f.canvasW * scale);
  canvas.height = Math.round(f.canvasH * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = o.matte;
  ctx.fillRect(0, 0, f.canvasW, f.canvasH);
  ctx.drawImage(bitmap, f.image.x, f.image.y, f.image.w, f.image.h);

  const dark = isDark(o.matte);
  const ink = dark ? '#EDE6DA' : '#1B1916';
  const dim = dark ? '#9C9384' : '#7A736A';
  if (o.keyline) {
    const k = Math.max(1, Math.min(f.image.w, f.image.h) * 0.0012);
    ctx.strokeStyle = dim; ctx.lineWidth = k;
    ctx.strokeRect(f.image.x - k * 3, f.image.y - k * 3, f.image.w + k * 6, f.image.h + k * 6);
  }

  const face = FACES[o.typeface];
  const cap = (s: string) => (face.caps ? s.toUpperCase() : s);
  const c = f.caption;
  const short = Math.min(f.image.w, f.image.h);
  const pad = Math.max(c.x, short * 0.03);
  const model = cap([o.fields.model].filter(Boolean).join(' '));
  const lens = cap(o.fields.lens);
  const settings = cap(settingsLine(o.fields));
  const date = o.fields.date;
  ctx.textBaseline = 'middle';

  const drawLogo = (x: number, cy: number, h: number, align: 'left' | 'center' | 'right') => {
    if (!o.logo?.naturalWidth) {
      if (!o.brandLabel) return 0;
      ctx.font = `${face.weight} ${h * 0.8}px ${face.main}`;
      ctx.fillStyle = ink; ctx.textAlign = align;
      ctx.fillText(cap(o.brandLabel), x, cy);
      return ctx.measureText(cap(o.brandLabel)).width;
    }
    const w = (o.logo.naturalWidth / o.logo.naturalHeight) * h;
    const lx = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
    const src = dark ? tinted(o.logo, w * scale * 2, h * scale * 2, ink) : o.logo;
    ctx.drawImage(src, lx, cy - h / 2, w, h);
    return w;
  };

  if (o.layout === 'bar') {
    const cy = c.y + c.h / 2, big = c.h * 0.25, small = c.h * 0.17;
    ctx.textAlign = 'left';
    ctx.fillStyle = ink; ctx.font = `${face.weight} ${big}px ${face.main}`;
    ctx.fillText(model || cap(o.brandLabel), pad, lens ? cy - small * 0.75 : cy);
    if (lens) { ctx.fillStyle = dim; ctx.font = `400 ${small}px ${face.sub}`; ctx.fillText(lens, pad, cy + big * 0.75); }
    const right = f.canvasW - pad;
    ctx.textAlign = 'right';
    ctx.fillStyle = ink; ctx.font = `${face.weight} ${big}px ${face.main}`;
    const settingsW = settings ? ctx.measureText(settings).width : 0;
    if (settings) ctx.fillText(settings, right, date ? cy - small * 0.75 : cy);
    ctx.font = `400 ${small}px ${face.sub}`;
    const dateW = date ? ctx.measureText(date).width : 0;
    if (date) { ctx.fillStyle = dim; ctx.fillText(date, right, cy + big * 0.75); }
    const textW = Math.max(settingsW, dateW);
    const ruleX = right - textW - c.h * 0.22;
    if (textW) { ctx.fillStyle = dim; ctx.fillRect(ruleX, cy - c.h * 0.22, Math.max(1, c.h * 0.012), c.h * 0.44); }
    drawLogo(textW ? ruleX - c.h * 0.22 : right, cy, c.h * 0.32, 'right');
  } else if (o.layout === 'polaroid') {
    const cx = f.canvasW / 2, h = c.h;
    drawLogo(cx, c.y + h * 0.3, h * 0.17, 'center');
    ctx.textAlign = 'center';
    ctx.fillStyle = ink; ctx.font = `${face.weight} ${h * 0.11}px ${face.main}`;
    ctx.fillText([model, lens].filter(Boolean).join('  ·  '), cx, c.y + h * 0.56);
    ctx.fillStyle = dim; ctx.font = `400 ${h * 0.085}px ${face.sub}`;
    ctx.fillText([settings, date].filter(Boolean).join('  ·  '), cx, c.y + h * 0.74);
  } else {
    ctx.textAlign = 'center'; ctx.fillStyle = dim;
    ctx.font = `400 ${c.h * 0.28}px ${face.sub}`;
    ctx.fillText([cap(o.brandLabel), model, settings].filter(Boolean).join('   ·   '), f.canvasW / 2, c.y + c.h / 2);
  }
}
