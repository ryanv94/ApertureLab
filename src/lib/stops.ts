/** Photographic stop scales. `ev` is in stops (thirds are exact multiples of 1/3); `value` is the exact physical value. */
export type Stop = { label: string; value: number; ev: number };

// Nominal third-stop labels, slowest/widest first.
const SHUTTER_LABELS = [
  '30', '25', '20', '15', '13', '10', '8', '6', '5', '4', '3.2', '2.5', '2', '1.6', '1.3', '1',
  '0.8', '0.6', '0.5', '0.4', '0.3', '1/4', '1/5', '1/6', '1/8', '1/10', '1/13', '1/15', '1/20', '1/25',
  '1/30', '1/40', '1/50', '1/60', '1/80', '1/100', '1/125', '1/160', '1/200', '1/250', '1/320', '1/400',
  '1/500', '1/640', '1/800', '1/1000', '1/1250', '1/1600', '1/2000', '1/2500', '1/3200', '1/4000',
  '1/5000', '1/6400', '1/8000',
];
const APERTURE_LABELS = [
  '1', '1.1', '1.2', '1.4', '1.6', '1.8', '2', '2.2', '2.5', '2.8', '3.2', '3.5', '4', '4.5', '5', '5.6',
  '6.3', '7.1', '8', '9', '10', '11', '13', '14', '16', '18', '20', '22', '25', '29', '32',
];
const ISO_LABELS = [
  '50', '64', '80', '100', '125', '160', '200', '250', '320', '400', '500', '640', '800', '1000', '1250',
  '1600', '2000', '2500', '3200', '4000', '5000', '6400', '8000', '10000', '12800', '16000', '20000',
  '25600', '32000', '40000', '51200', '64000', '80000', '102400',
];

/** ev = stops faster than 1s (30s ≈ −5, 1/8000 ≈ +13). */
export const SHUTTER_THIRDS: Stop[] = SHUTTER_LABELS.map((l, i) => {
  const ev = (i - 15) / 3;
  return { label: `${l}s`, value: 2 ** -ev, ev };
});

/** ev = stops from f/1. */
export const APERTURE_THIRDS: Stop[] = [
  { label: 'f/0.95', value: 0.95, ev: 2 * Math.log2(0.95) },
  ...APERTURE_LABELS.map((l, i) => ({ label: `f/${l}`, value: 2 ** (i / 6), ev: i / 3 })),
];

export const APERTURE_FULL: Stop[] = APERTURE_THIRDS.filter((s, i) => i === 0 || Math.abs(s.ev - Math.round(s.ev)) < 1e-9);

/** ev = stops from ISO 100. */
export const ISO_THIRDS: Stop[] = ISO_LABELS.map((l, i) => {
  const ev = (i - 3) / 3;
  return { label: l, value: 100 * 2 ** ev, ev };
});
