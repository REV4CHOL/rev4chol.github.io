import { reducedMotion } from '../lib/env';
import { grainIntervalFor, quality } from '../lib/quality';

const TILE = 96;
const FRAMES = 4;

/** One 1:1 noise tile. Values centre on 128 so that under `mix-blend-mode:
 *  overlay` a mid-grey texel is a no-op — and, more importantly, overlay over a
 *  black base stays black whatever the blend value. The grain therefore lives
 *  only on the posters and the colour fields and disappears completely on the
 *  void, instead of crawling across it as a stretched grey mosaic. */
function noiseTile(spread: number): string {
  const c = document.createElement('canvas');
  // bake at device resolution: CSS pins background-size to TILE px, so a
  // TILE×dpr source maps 1:1 to device pixels on any panel — at DPR 2 the
  // texels stay single device pixels instead of upscaling into 2×2 blocks
  const px = Math.round(TILE * (window.devicePixelRatio || 1));
  c.width = c.height = px;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(px, px);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (128 + (Math.random() * 2 - 1) * spread) | 0;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

export function mountAtmosphere(): void {
  const grain = document.createElement('div');
  grain.id = 'grain';

  // Pre-bake a short loop instead of regenerating ImageData every tick: the
  // texture never scales, so a frame costs one background swap.
  const frames = Array.from({ length: FRAMES }, () => noiseTile(60));
  let f = 0;
  const apply = () => {
    grain.style.backgroundImage = `url(${frames[f]})`;
    grain.style.backgroundPosition = `${(Math.random() * TILE) | 0}px ${(Math.random() * TILE) | 0}px`;
  };
  apply();

  const scan = document.createElement('div');
  scan.className = 'scan-layer';
  document.body.append(grain, scan);

  // THE RE-DEAL BY TIER (lib/quality.ts): every 90 ms at FULL, 180 at BALANCED; at LITE the layer is hidden by the
  // stylesheet (.rvl-lite #grain) and nothing re-deals — a full-viewport blend layer repainted eleven times a second
  // is a cost a weak machine can feel. Calm mode holds one frame at any tier. Re-tuned live when the tier changes.
  let timer = 0;
  const tune = () => {
    if (timer) { clearInterval(timer); timer = 0; }
    const ms = grainIntervalFor(quality.tier());
    if (reducedMotion() || ms === 0) return;
    timer = window.setInterval(() => {
      if (document.hidden) return;
      f = (f + 1) % FRAMES;
      apply();
    }, ms);
  };
  tune();
  quality.on(tune);
}
