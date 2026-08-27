import { reducedMotion } from '../lib/env';

export function mountAtmosphere(): void {
  const grain = document.createElement('canvas');
  grain.id = 'grain';
  // fine enough to read as film grain when scaled — coarse buffers turn into a
  // blocky mosaic over color fields
  grain.width = 640;
  grain.height = 360;
  const scan = document.createElement('div');
  scan.className = 'scan-layer';
  const vig = document.createElement('div');
  vig.className = 'vignette-layer';
  document.body.append(grain, scan, vig);
  const ctx = grain.getContext('2d');
  if (!ctx) return;
  const draw = () => {
    const img = ctx.createImageData(640, 360);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  };
  draw();
  if (!reducedMotion()) {
    setInterval(() => { if (!document.hidden) draw(); }, 120);
  }
}
