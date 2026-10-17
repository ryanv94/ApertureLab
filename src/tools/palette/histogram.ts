export type Histograms = { r: Uint32Array; g: Uint32Array; b: Uint32Array; l: Uint32Array };

/** Per-channel and luminance (Rec. 709) histograms, sampling every `step`th pixel. */
export function computeHistograms(data: Uint8ClampedArray, step = 1): Histograms {
  const h = { r: new Uint32Array(256), g: new Uint32Array(256), b: new Uint32Array(256), l: new Uint32Array(256) };
  for (let i = 0; i < data.length; i += 4 * step) {
    if (data[i + 3] < 128) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    h.r[r]++; h.g[g]++; h.b[b]++;
    h.l[Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)]++;
  }
  return h;
}
