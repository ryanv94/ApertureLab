import { kmeans } from './kmeans';

self.onmessage = (e: MessageEvent<{ pixels: Uint8ClampedArray; k: number }>) => {
  try {
    self.postMessage({ swatches: kmeans(e.data.pixels, e.data.k, { seed: 1 }) });
  } catch (err) {
    self.postMessage({ error: (err as Error).message });
  }
};
