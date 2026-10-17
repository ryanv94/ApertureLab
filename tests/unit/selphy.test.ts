import { it, expect } from 'vitest';
import { slotRects, cutMarks, CALIBRATIONS, SHEET_W, SHEET_H } from '../../src/tools/selphy/logic';

it('sheet is 6×4 in landscape at 300 DPI', () => expect([SHEET_W, SHEET_H]).toEqual([1800, 1200]));

it('SELPHY calibration pre-shrinks the slots', () => {
  const [a, b] = slotRects(CALIBRATIONS.selphy.w, CALIBRATIONS.selphy.h);
  expect(a).toEqual({ x: 346, y: 198, w: 508, h: 804 });
  expect(b.x).toBe(946);
  expect([CALIBRATIONS.selphy.w, CALIBRATIONS.selphy.h]).toEqual([95.7, 97.2]);
});

it('exact 1:1 uses the base slot', () => {
  const [a] = slotRects(100, 100);
  expect(a).toEqual({ x: 334.5, y: 186.5, w: 531, h: 827 });
});

it('cut marks: 8 segments offset from the corners', () => {
  const r = { x: 100, y: 100, w: 500, h: 800 };
  const m = cutMarks(r);
  expect(m).toHaveLength(8);
  expect(m[0]).toEqual([88, 100, 64, 100]);
});
