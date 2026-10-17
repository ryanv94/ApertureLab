export const SENSORS = [
  { id: 'ff', label: 'Full frame (35mm)', crop: 1.0 },
  { id: 'apsc', label: 'APS-C — Nikon, Sony, Fuji (1.5×)', crop: 1.5 },
  { id: 'apsc-canon', label: 'APS-C — Canon (1.6×)', crop: 1.6 },
  { id: 'mft', label: 'Micro Four Thirds (2×)', crop: 2.0 },
  { id: 'one-inch', label: '1-inch (2.7×)', crop: 2.7 },
  { id: 'gfx', label: 'Medium format 44×33 (0.79×)', crop: 0.79 },
  { id: 'custom', label: 'Custom crop factor', crop: 1.0 },
] as const;

export type CocMode = 'default' | 'print' | 'custom';

/** Circle of confusion in mm. */
export function cocFor(crop: number, mode: CocMode, customUm = 30): number {
  if (mode === 'custom') return customUm / 1000;
  return (mode === 'print' ? 0.020 : 0.030) / crop;
}

export type DofInput = { focalMm: number; n: number; distanceMm: number; cocMm: number };
export type DofResult = { hyperfocal: number; near: number; far: number; total: number; front: number; behind: number };

/** Thin-lens depth of field; all distances in mm from the sensor plane. */
export function computeDof({ focalMm: f, n, distanceMm: s, cocMm: c }: DofInput): DofResult {
  const hyperfocal = (f * f) / (n * c) + f;
  const near = (s * (hyperfocal - f)) / (hyperfocal + s - 2 * f);
  const far = s < hyperfocal ? (s * (hyperfocal - f)) / (hyperfocal - s) : Infinity;
  return { hyperfocal, near, far, total: far - near, front: s - near, behind: far - s };
}
