export type Rect = { x: number; y: number; w: number; h: number };
export type FrameLayout = 'bar' | 'polaroid' | 'even';
export type Frame = { canvasW: number; canvasH: number; image: Rect; caption: Rect };

/** Frame geometry in output pixels; `thicknessPct` is a percentage of the image's short edge. */
export function computeFrame({ imgW, imgH, layout, thicknessPct }: { imgW: number; imgH: number; layout: FrameLayout; thicknessPct: number }): Frame {
  const short = Math.min(imgW, imgH);
  const t = Math.round((short * thicknessPct) / 100);
  const bottom = Math.round(
    layout === 'bar' ? Math.max(short * 0.09, t * 1.8)
      : layout === 'polaroid' ? Math.max(short * 0.18, t * 3.5)
        : Math.max(short * 0.05, t),
  );
  const image = { x: t, y: t, w: imgW, h: imgH };
  return {
    canvasW: imgW + 2 * t,
    canvasH: t + imgH + bottom,
    image,
    caption: { x: t, y: t + imgH, w: imgW, h: bottom },
  };
}
