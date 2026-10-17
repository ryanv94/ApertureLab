export const ND_PRESETS = [
  { label: 'ND2', stops: 1 }, { label: 'ND4', stops: 2 }, { label: 'ND8', stops: 3 }, { label: 'ND16', stops: 4 },
  { label: 'ND32', stops: 5 }, { label: 'ND64', stops: 6 }, { label: 'ND400', stops: 8.6 }, { label: 'ND1000', stops: 10 },
  { label: 'ND2000', stops: 11 }, { label: 'ND4000', stops: 12 }, { label: 'ND32000', stops: 15 }, { label: 'ND64000', stops: 16 },
  { label: 'ND1000000', stops: 20 },
];

/** Exposure value normalised to ISO 100. */
export const ev100 = (shutterS: number, n: number, iso: number): number => Math.log2((n * n) / shutterS) - Math.log2(iso / 100);

export type TargetInput = { baseS: number; baseN: number; baseIso: number; targetN: number; targetIso: number; filterStops: number };

/** Shutter time that keeps the metered exposure after filters and aperture/ISO changes. */
export function targetShutter({ baseS, baseN, baseIso, targetN, targetIso, filterStops }: TargetInput): number {
  return baseS * 2 ** (filterStops + Math.log2((targetN * targetN) / (baseN * baseN)) + Math.log2(baseIso / targetIso));
}
