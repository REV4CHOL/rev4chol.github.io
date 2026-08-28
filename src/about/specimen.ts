import { ditherImageToCanvas } from '../lib/dither';
import { reducedMotion } from '../lib/env';
import { mulberry32 } from '../lib/rng';
import { burstLength, nextBurstDelay, slicePlan } from './operator';

/** Internal working size of the portrait frame (4:5). The display canvas is
 *  scaled by CSS; all drawing happens at this resolution. */
export const FRAME_W = 720;
export const FRAME_H = 900;

const VOID = '#060606';
const SIGNAL = '#C8FF00';
const ALERT = '#FF2E63';
const FIELD = '#2418FF';

export interface Specimen {
  burst(ms?: number): void;
  destroy(): void;
}

/** Cover-fit any source into a FRAME_W×FRAME_H master canvas. */
function coverMaster(source: CanvasImageSource, srcW: number, srcH: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = FRAME_W;
  c.height = FRAME_H;
  const ctx = c.getContext('2d')!;
  const s = Math.max(FRAME_W / srcW, FRAME_H / srcH);
  const w = srcW * s;
  const h = srcH * s;
  ctx.drawImage(source, (FRAME_W - w) / 2, (FRAME_H - h) / 2, w, h);
  return c;
}

/** No portrait yet: a procedural noise subject, so the machine still has
 *  something on the table. Deterministic per seed. */
function noiseMaster(seed: number): HTMLCanvasElement {
  const rand = mulberry32(seed);
  const c = document.createElement('canvas');
  c.width = FRAME_W;
  c.height = FRAME_H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#101010';
  ctx.fillRect(0, 0, FRAME_W, FRAME_H);
  // banded static
  for (let y = 0; y < FRAME_H; y += 6) {
    const v = 14 + Math.floor(rand() * 70);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(0, y, FRAME_W, 3 + Math.floor(rand() * 3));
  }
  // a vague subject: stacked bright blocks where a head/shoulders would be
  ctx.fillStyle = '#3a3a3a';
  ctx.beginPath();
  ctx.ellipse(FRAME_W / 2, FRAME_H * 0.38, FRAME_W * 0.19, FRAME_H * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(FRAME_W / 2, FRAME_H * 0.86, FRAME_W * 0.34, FRAME_H * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 260; i++) {
    const v = 30 + Math.floor(rand() * 200);
    ctx.fillStyle = `rgba(${v},${v},${v},0.5)`;
    ctx.fillRect(Math.floor(rand() * FRAME_W), Math.floor(rand() * FRAME_H), 2 + Math.floor(rand() * 5), 2 + Math.floor(rand() * 5));
  }
  return c;
}

/** One color channel of the master, for chromatic-split ghost frames. */
function channel(master: HTMLCanvasElement, tint: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = FRAME_W;
  c.height = FRAME_H;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(master, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, FRAME_W, FRAME_H);
  return c;
}

/**
 * The glitch portrait. Resting state: signal-green Bayer dither with a slow
 * scan sweep. Bursts (ambient every 4–9s, on hover, on click): treatment
 * flips, slice displacement, block corruption, chromatic splits.
 * Calm mode: one static dither, nothing ever moves.
 */
export function mountSpecimen(
  canvas: HTMLCanvasElement,
  source: CanvasImageSource | null,
  srcW: number,
  srcH: number,
  seed: number,
): Specimen {
  canvas.width = FRAME_W;
  canvas.height = FRAME_H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false; // dithers upscale as hard pixels, never mush
  const rand = mulberry32(seed);

  const master = source ? coverMaster(source, srcW, srcH) : noiseMaster(seed);
  // treatments, resting first: fine signal dither / pink dither / chunky blue
  const tSignal = ditherImageToCanvas(master, FRAME_W, FRAME_H, 360, VOID, SIGNAL);
  const tAlert = ditherImageToCanvas(master, FRAME_W, FRAME_H, 300, VOID, ALERT);
  const tField = ditherImageToCanvas(master, FRAME_W, FRAME_H, 140, VOID, FIELD);
  const chR = channel(master, '#ff0044');
  const chG = channel(master, '#00ff66');
  const chB = channel(master, '#2418ff');
  const flips: CanvasImageSource[] = [tSignal, tAlert, tField, master, tSignal];

  const drawResting = (sweepY: number | null, cursor: { x: number; y: number } | null) => {
    ctx.clearRect(0, 0, FRAME_W, FRAME_H);
    ctx.drawImage(tSignal, 0, 0, FRAME_W, FRAME_H);
    if (sweepY !== null) {
      const g = ctx.createLinearGradient(0, sweepY - 40, 0, sweepY + 4);
      g.addColorStop(0, 'rgba(200,255,0,0)');
      g.addColorStop(1, 'rgba(200,255,0,0.28)');
      ctx.fillStyle = g;
      ctx.fillRect(0, sweepY - 40, FRAME_W, 44);
    }
    if (cursor) drawReticle(cursor.x, cursor.y);
  };

  const drawReticle = (x: number, y: number) => {
    ctx.strokeStyle = 'rgba(200,255,0,0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(FRAME_W, y + 0.5);
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, FRAME_H);
    ctx.stroke();
    ctx.strokeRect(x - 26, y - 26, 52, 52);
  };

  const drawBurstFrame = (cursor: { x: number; y: number } | null) => {
    const base = flips[Math.floor(rand() * flips.length)];
    ctx.clearRect(0, 0, FRAME_W, FRAME_H);
    if (rand() < 0.35) {
      // chromatic split of the true image
      const dx = Math.round((rand() * 2 - 1) * 26);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(chR, -dx, 0);
      ctx.drawImage(chG, 0, Math.round((rand() * 2 - 1) * 10));
      ctx.drawImage(chB, dx, 0);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.drawImage(base, 0, 0, FRAME_W, FRAME_H);
    }
    // slice displacement
    for (const s of slicePlan(rand, FRAME_H, 90)) {
      ctx.drawImage(canvas, 0, s.y, FRAME_W, s.h, s.dx, s.y, FRAME_W, s.h);
    }
    // block corruption: teleport a few rects
    const blocks = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < blocks; i++) {
      const bw = 40 + Math.floor(rand() * 180);
      const bh = 20 + Math.floor(rand() * 80);
      ctx.drawImage(
        canvas,
        Math.floor(rand() * (FRAME_W - bw)), Math.floor(rand() * (FRAME_H - bh)), bw, bh,
        Math.floor(rand() * (FRAME_W - bw)), Math.floor(rand() * (FRAME_H - bh)), bw, bh,
      );
    }
    if (cursor) drawReticle(cursor.x, cursor.y);
  };

  // calm: a single still dither and we are done — the engine never starts
  if (reducedMotion()) {
    drawResting(null, null);
    return { burst: () => {}, destroy: () => {} };
  }

  let raf = 0;
  let burstUntil = 0;
  let ambientTimer = 0;
  let cursor: { x: number; y: number } | null = null;
  let dead = false;

  const scheduleAmbient = () => {
    ambientTimer = window.setTimeout(() => {
      burstUntil = performance.now() + burstLength(rand);
      scheduleAmbient();
    }, nextBurstDelay(rand));
  };

  const loop = (now: number) => {
    if (dead) return;
    if (now < burstUntil) {
      drawBurstFrame(cursor);
    } else {
      drawResting((now / 3.2) % (FRAME_H + 80), cursor);
    }
    raf = requestAnimationFrame(loop);
  };

  const toLocal = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * FRAME_W,
      y: ((e.clientY - r.top) / r.height) * FRAME_H,
    };
  };
  const onMove = (e: PointerEvent) => { cursor = toLocal(e); };
  const onEnter = (e: PointerEvent) => {
    cursor = toLocal(e);
    burstUntil = performance.now() + burstLength(rand);
  };
  const onLeave = () => { cursor = null; };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerenter', onEnter);
  canvas.addEventListener('pointerleave', onLeave);

  scheduleAmbient();
  raf = requestAnimationFrame(loop);

  return {
    burst: (ms) => { burstUntil = performance.now() + (ms ?? burstLength(rand) * 2); },
    destroy: () => {
      dead = true;
      cancelAnimationFrame(raf);
      clearTimeout(ambientTimer);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerenter', onEnter);
      canvas.removeEventListener('pointerleave', onLeave);
    },
  };
}
