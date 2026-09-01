/** REVACHOL BY NIGHT — the about hero's pixel metropolis.
 *
 *  The fusion decree (owner refs: pixel-city nightscapes): the page opens on
 *  the city the alias names. Drawn at a tiny internal resolution and
 *  upscaled with image-rendering: pixelated — the blow-up IS the aesthetic,
 *  the same law as the dither machine. Palette discipline: the night mass
 *  is field-blue over void, and every light source is quartet neon (signal /
 *  alert / flourish) or bone — the city is dark so each lit pixel reads as
 *  signal, exactly like the reference plates.
 *
 *  Deterministic per seed (layout survives resizes), animated on a coarse
 *  step clock (windows wake and sleep, signs buzz, the beacon blinks) —
 *  steps, never tweens: broadcast grammar. rvl-calm gets one still frame. */
import { reducedMotion } from '../lib/env';
import { mulberry32 } from '../lib/rng';

const PXH = 340; // internal pixel rows; width follows the box's aspect

// the night ramp: void up top, field bleeding in toward the skyline
const SKY = ['#060606', '#060710', '#070919', '#080b22', '#0a0e2b', '#0c1134', '#0e133c', '#101543'];
const SIL = ['#131847', '#0b0d24', '#060609']; // far → near building mass
const NEON = ['#C8FF00', '#FF2E63', '#B79CFF'];

interface Win { x: number; y: number; w: number; h: number; c: string; on: boolean }
interface Sign { x: number; y: number; c: string; cells: [number, number][] }
interface Tower { x: number; w: number; h: number; layer: number }

export function mountCity(canvas: HTMLCanvasElement, seed: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let W = 600;
  let towers: Tower[] = [];
  let wins: Win[] = [];
  let signs: Sign[] = [];
  let stars: { x: number; y: number; p: number }[] = [];
  let clouds: { x: number; y: number; w: number }[] = [];
  let beacon = { x: 0, y: 0 };
  let t = 0;

  const build = () => {
    const box = canvas.getBoundingClientRect();
    W = Math.max(280, Math.round(PXH * (box.width / Math.max(1, box.height || 1))));
    canvas.width = W;
    canvas.height = PXH;
    const rand = mulberry32(seed);
    towers = []; wins = []; signs = [];
    stars = Array.from({ length: Math.round(W / 5) }, () => ({ x: rand() * W, y: rand() * PXH * 0.42, p: rand() * 9 }));
    clouds = Array.from({ length: 6 }, () => ({ x: rand() * W, y: 16 + rand() * PXH * 0.26, w: 26 + rand() * 64 }));
    let tallest = 0;
    for (let layer = 0; layer < 3; layer++) {
      let x = -8;
      while (x < W + 8) {
        const w = 12 + Math.floor(rand() * (22 + layer * 16));
        const h = Math.floor(PXH * (0.16 + rand() * 0.3) * (0.65 + layer * 0.3));
        towers.push({ x, w, h, layer });
        if (layer === 2 && h > tallest) { tallest = h; beacon = { x: x + Math.floor(w / 2), y: PXH - h - 9 }; }
        if (layer > 0) {
          const cw = layer === 1 ? 1 : 2;
          const ch = layer === 1 ? 2 : 3;
          const gx = cw + 3;
          const gy = ch + (layer === 1 ? 3 : 4);
          for (let cx = x + 2; cx < x + w - cw - 1; cx += gx) {
            for (let cy = PXH - h + 3; cy < PXH - ch - 2; cy += gy) {
              if (rand() < (layer === 1 ? 0.15 : 0.2)) {
                const roll = rand();
                wins.push({
                  x: cx, y: cy, w: cw, h: ch, on: rand() < 0.82,
                  // most windows burn bone-white; the quartet is rationed
                  c: roll < 0.62 ? '#EDEDE6' : roll < 0.78 ? '#C8FF00' : roll < 0.92 ? '#B79CFF' : '#FF2E63',
                });
              }
            }
          }
          // vertical neon signage riding the near towers — image 1's grammar
          if (layer === 2 && w > 22 && rand() < 0.5) {
            const cells: [number, number][] = [];
            const n = 3 + Math.floor(rand() * 4);
            for (let g = 0; g < n; g++)
              for (let px = 0; px < 3; px++) for (let py = 0; py < 3; py++)
                if (rand() < 0.55) cells.push([px, g * 5 + py]);
            signs.push({ x: x + w - 7, y: PXH - h + 6 + Math.floor(rand() * 8), c: NEON[Math.floor(rand() * NEON.length)], cells });
          }
        }
        x += w + (layer === 0 ? 0 : 1 + Math.floor(rand() * 3));
      }
    }
  };

  const draw = () => {
    // sky in quantized bands — a gradient would be too smooth for this city
    const bandH = Math.ceil((PXH * 0.62) / SKY.length);
    for (let i = 0; i < SKY.length; i++) {
      ctx.fillStyle = SKY[i];
      ctx.fillRect(0, i * bandH, W, bandH);
    }
    ctx.fillStyle = SKY[SKY.length - 1];
    ctx.fillRect(0, SKY.length * bandH, W, PXH - SKY.length * bandH);
    // stars twinkle on the step clock
    ctx.fillStyle = '#EDEDE6';
    for (const s of stars) if ((t + s.p) % 9 > 1.4) ctx.fillRect(s.x, s.y, 1, 1);
    // dithered clouds — alternating 2px dashes, the dither machine's checker
    ctx.fillStyle = 'rgba(183, 156, 255, 0.16)';
    for (const c of clouds) {
      for (let row = 0; row < 3; row++)
        for (let dx = row % 2 ? 2 : 0; dx < c.w; dx += 4)
          ctx.fillRect(c.x + dx, c.y + row * 2, 2, 1);
    }
    // horizon haze — the reference plates' pink-lavender glow line
    ctx.fillStyle = 'rgba(183, 156, 255, 0.2)';
    ctx.fillRect(0, PXH * 0.6, W, 3);
    ctx.fillStyle = 'rgba(255, 46, 99, 0.12)';
    ctx.fillRect(0, PXH * 0.6 + 3, W, 5);
    // the city, far to near
    for (let layer = 0; layer < 3; layer++) {
      ctx.fillStyle = SIL[layer];
      for (const b of towers) if (b.layer === layer) ctx.fillRect(b.x, PXH - b.h, b.w, b.h);
    }
    for (const wn of wins) {
      if (!wn.on) continue;
      ctx.fillStyle = wn.c;
      ctx.globalAlpha = wn.c === '#EDEDE6' ? 0.5 : 0.85;
      ctx.fillRect(wn.x, wn.y, wn.w, wn.h);
    }
    ctx.globalAlpha = 1;
    for (const s of signs) {
      const dim = (t + s.x) % 23 < 1; // the occasional neon brown-out
      ctx.fillStyle = s.c;
      ctx.globalAlpha = dim ? 0.25 : 0.16;
      ctx.fillRect(s.x - 2, s.y - 2, 7, 24); // glow slab behind the strip
      ctx.globalAlpha = dim ? 0.4 : 0.95;
      for (const [px, py] of s.cells) ctx.fillRect(s.x + px, s.y + py, 1, 1);
      ctx.globalAlpha = 1;
    }
    // the landmark antenna + aircraft beacon
    ctx.fillStyle = '#0b0d24';
    ctx.fillRect(beacon.x, beacon.y, 1, 9);
    if ((t >> 2) % 2 === 0) {
      ctx.fillStyle = '#FF2E63';
      ctx.fillRect(beacon.x - 1, beacon.y - 2, 3, 2);
    }
    // settle into the void so the page below takes over
    const fade = ctx.createLinearGradient(0, PXH - 46, 0, PXH);
    fade.addColorStop(0, 'rgba(6, 6, 6, 0)');
    fade.addColorStop(1, 'rgba(6, 6, 6, 0.96)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, PXH - 46, W, 46);
  };

  build();
  draw();
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => { build(); draw(); }).observe(canvas);
  }
  if (reducedMotion()) return; // calm mode holds the still frame
  setInterval(() => {
    if (document.hidden) return;
    t += 1;
    // a handful of windows change their mind each step
    for (let i = 0; i < 7; i++) {
      const wn = wins[(Math.random() * wins.length) | 0];
      if (wn) wn.on = Math.random() < 0.8;
    }
    draw();
  }, 150);
}
