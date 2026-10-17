// 6×4 in sheet at 300 DPI, two 45×70 mm magnet slots. Constants carried over from the original tool.
export const SHEET_W = 1800;
export const SHEET_H = 1200;
export const BASE_SLOT_W = 531; // 45 mm @ 300 DPI
export const BASE_SLOT_H = 827; // 70 mm @ 300 DPI
export const SLOT_CENTRES_X = [600, 1200] as const;
export const SLOT_ASPECT = 45 / 70;

/** SELPHY borderless prints overscan ~47×72 mm; pre-shrinking keeps the 45×70 mm image intact. */
export const CALIBRATIONS = {
  selphy: { w: 95.7, h: 97.2, label: '47×72mm → 45×70mm' },
  none: { w: 100, h: 100, label: '1:1 Digital Unscaled' },
} as const;

export type Rect = { x: number; y: number; w: number; h: number };

export function slotRects(wPct: number, hPct: number): [Rect, Rect] {
  const w = Math.round((BASE_SLOT_W * wPct) / 100);
  const h = Math.round((BASE_SLOT_H * hPct) / 100);
  const y = (SHEET_H - h) / 2;
  return [
    { x: SLOT_CENTRES_X[0] - w / 2, y, w, h },
    { x: SLOT_CENTRES_X[1] - w / 2, y, w, h },
  ];
}

/** Corner trim marks set `offset` px outside the slot, each `len` px long. */
export function cutMarks({ x, y, w, h }: Rect, offset = 12, len = 24): [number, number, number, number][] {
  const r = x + w, b = y + h, o = offset, e = offset + len;
  return [
    [x - o, y, x - e, y], [x, y - o, x, y - e],
    [r + o, y, r + e, y], [r, y - o, r, y - e],
    [x - o, b, x - e, b], [x, b + o, x, b + e],
    [r + o, b, r + e, b], [r, b + o, r, b + e],
  ];
}
