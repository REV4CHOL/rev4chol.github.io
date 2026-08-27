export const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** In-place ordered dither to a two-color image. Pure math — safe in node tests. */
export function bayerDither(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  dark: [number, number, number],
  light: [number, number, number],
): void {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      const threshold = ((BAYER4[y % 4][x % 4] + 0.5) / 16) * 255;
      const c = lum > threshold ? light : dark;
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = 255;
    }
  }
}

/** Draw source scaled to outW wide, dither it into a duotone canvas. Browser only. */
export function ditherImageToCanvas(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  outW: number,
  dark: string,
  light: string,
): HTMLCanvasElement {
  const outH = Math.max(1, Math.round((outW * srcH) / srcW));
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0, outW, outH);
  const img = ctx.getImageData(0, 0, outW, outH);
  bayerDither(img.data, outW, outH, hexToRgb(dark), hexToRgb(light));
  ctx.putImageData(img, 0, 0);
  return canvas;
}
