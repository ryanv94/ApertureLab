import type { Swatch } from './kmeans';

export const paletteCss = (sw: Swatch[]): string =>
  `:root {\n${sw.map((s, i) => `  --palette-${i + 1}: ${s.hex};`).join('\n')}\n}\n`;

export const paletteJson = (sw: Swatch[]): string =>
  JSON.stringify(sw.map((s) => ({ hex: s.hex, rgb: s.rgb, share: +s.share.toFixed(4) })), null, 2);
