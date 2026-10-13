/** THE LIST'S CITY (owner, 2026-10-13: "an animated 8bit city in the black background too" — and "keep all the projects
 *  all perfectly readable in the middle"): a skyline planned in 8-bit pixels, and the clock it moves on. Pure — the
 *  plan is a seed's, the traffic a function of the time; works/list-deco.ts paints both behind THE LIST, whose column
 *  stays black in CSS whatever happens here.
 *
 *  Three skylines, far to near and darkest nearest, under a sky that bands from the void (the header's) down to the
 *  city's glow, every band dithered into the next; windows in bone and lavender, a few turning on and off; neon strips
 *  and billboards in the site's accents; masts blinking red; two searchlights; an elevated line with a train; a street
 *  of head- and taillights; craft crossing with nav lights. The moon, the beams, the boards and the tallest towers
 *  stand in the margins either side of the column, where they are seen. */
import { mulberry32 } from '../lib/rng';

/** The 8-bit palette: the site's own colours, and the night's blues between the void and the field. */
export const INK = {
  /** the sky's bands, from the top (the void) to the city's glow on the horizon */
  sky: ['#060606', '#07081a', '#0a0c2a', '#10123f', '#191759', '#262074'],
  far: '#151b55', farLit: '#3b3f98',
  mid: '#0b0f33', midEdge: '#1d2575',
  near: '#05061a', nearEdge: '#121845',
  bone: '#EDEDE6', boneDim: '#8e8e9e', flourish: '#B79CFF', flourishDim: '#5c4d9e',
  signal: '#C8FF00', alert: '#FF2E63', field: '#2418FF', void: '#060606',
} as const;
/** Every colour the city may paint. */
export const INKS: readonly string[] = [...INK.sky, ...(Object.values(INK) as (string | readonly string[])[]).filter((v): v is string => typeof v === 'string')];

/** The 8-bit clock: everything steps this many times a second (the look, and light on the machine). */
export const STEPS = 12;
/** The 4 × 4 ordered-dither thresholds (Bayer), 0–15. */
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x: number, y: number): number => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

export interface Win { x: number; y: number; c: string; lit: boolean; /** frames a state lasts; 0 = steady */ flip: number; phase: number }
export interface Mast { x: number; y: number; period: number; phase: number }
/** A neon strip (w ≤ 3) or a billboard's face, its glyphs a seed for a pattern of lit pixels. */
export interface Sign { x: number; y: number; w: number; h: number; c: string; glyph: number; period: number; phase: number }
export interface Box { x: number; y: number; w: number; h: number }
export interface Building {
  layer: 0 | 1 | 2; x: number; w: number; top: number; base: number;
  /** setbacks, tanks, spires, a billboard's legs: in the building's own fill */
  roof: Box[]; wins: Win[]; masts: Mast[]; signs: Sign[];
}
export interface Star { x: number; y: number; c: string; period: number; phase: number; cross: boolean }
export interface Beam { x: number; y: number; reach: number; period: number; phase: number }
export interface Plan {
  w: number; h: number; buildings: Building[]; stars: Star[]; beams: Beam[];
  moon: { x: number; y: number; r: number };
  /** the elevated line's deck row, and the street's two rows (head, tail) */
  rail: number; street: [number, number];
  /** the reading column, in the plan's pixels (nothing special is placed behind it) */
  band: [number, number];
  /** for each column, the highest row anything stands at: the sky is open above it */
  skyTop: Int16Array;
}

/** The sky's band at row `y`, continuous (0 = the void, INK.sky.length − 1 = the glow): the top 28 % void, the glow on
 *  the horizon behind the far skyline. */
export function skyTone(y: number, h: number): number {
  const v = y / h, n = INK.sky.length - 1;
  if (v < 0.28) return 0;
  return Math.min(n, ((v - 0.28) / 0.54) * n);
}

/** Whole screen pixels to an 8-bit pixel, for a screen `deviceH` pixels tall: about 240 rows, never under 2. */
export const cityScale = (deviceH: number): number => Math.max(2, Math.round(deviceH / 288));

const pick = <T>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
const between = (r: () => number, a: number, b: number) => a + (b - a) * r();

/** The city for a seed, `w` × `h` 8-bit pixels, its reading column `band` (columns [band[0], band[1])) in the middle. */
export function planCity(seed: number, w: number, h: number, band: [number, number] = [w, w]): Plan {
  const r = mulberry32(seed);
  const margins: [number, number][] = [[0, band[0]], [band[1], w]].filter(([a, b]) => b - a >= 8) as [number, number][];
  const inMargin = (x: number) => margins.some(([a, b]) => x >= a && x < b);
  const buildings: Building[] = [];
  const rail = Math.round(h * 0.8);
  const street: [number, number] = [h - 2, h - 3];
  // three skylines, each a run of buildings across the whole width (a little past each edge)
  const run = (layer: 0 | 1 | 2) => {
    const spec = [
      { wMin: 5, wMax: 16, gap: 2, top: [0.5, 0.68], base: 0.86 },
      { wMin: 9, wMax: 26, gap: 4, top: [0.44, 0.74], base: 0.93 },
      { wMin: 14, wMax: 40, gap: 2, top: [0.84, 0.93], base: 1 },
    ][layer];
    for (let x = -4 - Math.floor(r() * 6); x < w + 4;) {
      const bw = Math.round(between(r, spec.wMin, spec.wMax));
      let top = Math.round(h * between(r, spec.top[0], spec.top[1]));
      // a landmark now and then in a margin: a tower to a third of the height
      const landmark = layer === 1 && inMargin(x + bw / 2) && r() < 0.22;
      if (landmark) top = Math.round(h * between(r, 0.34, 0.42));
      const b: Building = { layer, x, w: bw, top, base: Math.round(h * spec.base), roof: [], wins: [], masts: [], signs: [] };
      dress(b, r, landmark, inMargin);
      for (const m of b.masts) m.y = Math.max(m.y, Math.ceil(h * 0.21)); // (nothing in the header's rows, the top fifth)
      buildings.push(b);
      x += bw + Math.floor(r() * (spec.gap + 1));
    }
  };
  run(0); run(1); run(2);
  // the billboards: one or two in each margin, on a mid building's roof (legs in its fill)
  for (const [a, bnd] of margins) {
    const roofs = buildings.filter((b) => b.layer === 1 && b.w >= 14 && b.x >= a && b.x + b.w <= bnd && b.top > h * 0.5);
    for (let k = 0; k < Math.min(roofs.length, bnd - a > 90 ? 2 : 1); k++) {
      const b = roofs.splice(Math.floor(r() * roofs.length), 1)[0];
      const bw = Math.min(b.w - 2, 16), bh = 7, bx = b.x + Math.floor((b.w - bw) / 2), by = b.top - bh - 3;
      b.roof.push({ x: bx + 2, y: by + bh, w: 1, h: 3 }, { x: bx + bw - 3, y: by + bh, w: 1, h: 3 });
      b.signs.push({ x: bx, y: by, w: bw, h: bh, c: pick(r, [INK.flourishDim, INK.midEdge, INK.farLit]), glyph: Math.floor(r() * 1e6), period: 36 + Math.floor(r() * 60), phase: Math.floor(r() * 96) });
    }
  }
  // the sky's open edge, column by column
  const skyTop = new Int16Array(w).fill(h);
  for (const b of buildings) {
    const boxes: Box[] = [{ x: b.x, y: b.top, w: b.w, h: b.base - b.top }, ...b.roof, ...b.signs.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h })), ...b.masts.map((m) => ({ x: m.x, y: m.y, w: 1, h: b.top - m.y }))];
    for (const q of boxes) for (let x = Math.max(0, q.x); x < Math.min(w, q.x + q.w); x++) skyTop[x] = Math.min(skyTop[x], q.y);
  }
  // the stars, only where the sky is open
  const stars: Star[] = [];
  const nStars = Math.round((w * h) / 420);
  for (let i = 0; i < nStars; i++) {
    const x = Math.floor(r() * w), y = 2 + Math.floor(r() * h * 0.6);
    if (y >= skyTop[x] - 2) continue;
    const c = r() < 0.62 ? INK.bone : r() < 0.85 ? INK.flourish : r() < 0.5 ? INK.signal : INK.alert;
    stars.push({ x, y, c, period: 24 + Math.floor(r() * 96), phase: Math.floor(r() * 120), cross: r() < 0.04 });
  }
  // the moon, high in the left margin (the margins' one light comes from it: the machines are lit from the left, and
  // the GRADE bay's prism takes its beam); the searchlights, one a margin
  const wide = margins.find(([a]) => a === 0) ?? margins.slice().sort((p, q) => (q[1] - q[0]) - (p[1] - p[0]))[0] ?? [0, w];
  const moon = { x: Math.round(wide[0] + (wide[1] - wide[0]) * 0.32), y: Math.round(h * 0.09), r: Math.max(4, Math.round(h / 40)) };
  const beams: Beam[] = margins.map(([a, b]) => ({ x: Math.round(between(r, a + (b - a) * 0.3, a + (b - a) * 0.7)), y: Math.round(h * 0.72), reach: Math.round(h * 0.7), period: 240 + Math.floor(r() * 120), phase: Math.floor(r() * 360) }));
  return { w, h, buildings, stars, beams, moon, rail, street, band, skyTop };
}

/** A building's windows, roof and neon. */
function dress(b: Building, r: () => number, landmark: boolean, inMargin: (x: number) => boolean): void {
  const { layer } = b;
  if (layer === 0) { // far: a sparse dotting of dim lights
    for (let y = b.top + 2; y < b.base - 1; y += 3) for (let x = b.x + 1; x < b.x + b.w - 1; x += 2) {
      if (r() < 0.09) b.wins.push({ x, y, c: r() < 0.6 ? INK.farLit : INK.flourishDim, lit: true, flip: 0, phase: 0 });
    }
    return;
  }
  if (layer === 2) { // near: the street's walls, a few lit
    for (let y = b.top + 2; y < b.base - 3; y += 3) for (let x = b.x + 2; x < b.x + b.w - 2; x += 3) {
      if (r() < 0.12) b.wins.push({ x, y, c: r() < 0.7 ? INK.boneDim : INK.flourishDim, lit: true, flip: 0, phase: 0 });
    }
    return;
  }
  // mid: the city proper — a roof, a grid of windows, sometimes a neon strip
  const roof = r();
  if (landmark) { // a spire: steps narrowing to a mast
    let y = b.top, bw = b.w;
    for (let k = 0; k < 3 && bw > 3; k++) { bw = Math.max(3, Math.round(bw * 0.6)); const h = 4 + Math.floor(r() * 4); y -= h; b.roof.push({ x: b.x + Math.floor((b.w - bw) / 2), y, w: bw, h }); }
    b.masts.push({ x: b.x + Math.floor(b.w / 2), y: y - 6 - Math.floor(r() * 6), period: 18 + Math.floor(r() * 18), phase: Math.floor(r() * 36) });
  } else if (roof < 0.3 && b.w >= 8) { // a setback
    const bw = Math.round(b.w * between(r, 0.45, 0.7)), h = 3 + Math.floor(r() * 6);
    b.roof.push({ x: b.x + Math.floor((b.w - bw) / 2), y: b.top - h, w: bw, h });
  } else if (roof < 0.45 && b.w >= 6) { // a water tank on legs
    const tx = b.x + 1 + Math.floor(r() * (b.w - 5));
    b.roof.push({ x: tx, y: b.top - 5, w: 3, h: 3 }, { x: tx, y: b.top - 2, w: 1, h: 2 }, { x: tx + 2, y: b.top - 2, w: 1, h: 2 });
  } else if (roof < 0.65) { // a mast
    b.masts.push({ x: b.x + 1 + Math.floor(r() * Math.max(1, b.w - 2)), y: b.top - 4 - Math.floor(r() * 7), period: 18 + Math.floor(r() * 30), phase: Math.floor(r() * 48) });
  }
  const px = b.w >= 14 && r() < 0.5 ? 3 : 2, py = r() < 0.5 ? 2 : 3;
  // (the windows keep to the night's dim tones: the backdrop recedes, and the margins' machines carry the accents)
  const lit = between(r, 0.14, 0.36);
  for (let y = b.top + 2; y < b.base - 2; y += py) for (let x = b.x + 1; x < b.x + b.w - 1; x += px) {
    const on = r() < lit;
    const c = pick(r, [INK.bone, INK.boneDim, INK.boneDim, INK.boneDim, INK.flourishDim, INK.flourishDim, INK.farLit, INK.flourish]);
    const flip = r() < 0.07 ? 48 + Math.floor(r() * 360) : 0;
    if (on || flip) b.wins.push({ x, y, c, lit: on, flip, phase: Math.floor(r() * 400) });
  }
  if (b.w >= 8 && r() < (inMargin(b.x + b.w / 2) ? 0.22 : 0.18)) { // a neon strip down one side, glyphs stacked
    const sh = 8 + Math.floor(r() * 12), sx = r() < 0.5 ? b.x + 1 : b.x + b.w - 3;
    const sy = b.top + 3 + Math.floor(r() * Math.max(1, b.base - b.top - sh - 6));
    b.signs.push({ x: sx, y: sy, w: 2, h: sh, c: pick(r, [INK.alert, INK.flourish, INK.flourishDim, INK.flourishDim, INK.boneDim]), glyph: Math.floor(r() * 1e6), period: 30 + Math.floor(r() * 200), phase: Math.floor(r() * 230) });
    b.wins = b.wins.filter((w0) => w0.x < sx - 1 || w0.x > sx + 2 || w0.y < sy - 1 || w0.y > sy + sh); // (the strip hangs over its windows)
  }
}

/* -------------------------------------------------------------- the clock -- */

/** The frame of the 8-bit clock at `t` seconds. */
export const frameAt = (t: number): number => Math.floor(t * STEPS);
/** A window's state at frame `f` (a flipping one alternates, each state `flip` frames long). */
export const windowLit = (win: Win, f: number): boolean => (win.flip ? (Math.floor((f + win.phase) / win.flip) % 2 === 1) !== win.lit : win.lit);
/** A star shows most of its beat, and goes out for the rest. */
export const starOn = (s: Star, f: number): boolean => ((f + s.phase) % s.period) < s.period * 0.72;
/** A mast's red tip: a short blink each beat. */
export const mastOn = (m: Mast, f: number): boolean => ((f + m.phase) % m.period) < 4;
/** A neon sign stutters off a few frames each beat. */
export const signOn = (s: Sign, f: number): boolean => { const k = (f + s.phase) % s.period; return !(k < 3 || (k > 5 && k < 7)); };
/** Whether a sign's pixel (dx, dy inside it) is lit: its glyphs, a pattern of its seed. A strip stacks 3 × 2 glyphs; a
 *  board shows a band of marks that scrolls with the clock. */
export function signPixel(s: Sign, dx: number, dy: number, f: number): boolean {
  if (s.w <= 3) { const g = (s.glyph >> ((Math.floor(dy / 3) * 2) % 20)) & 0b111111; return ((g >> ((dy % 3) * 2 + dx)) & 1) === 1 || dy % 3 === 2; }
  if (dy === 0 || dy === s.h - 1 || dx === 0 || dx === s.w - 1) return true; // the frame
  const col = (dx + Math.floor(f / 2)) % 12;
  return dy > 1 && dy < s.h - 2 && ((s.glyph >> (col % 24)) & 1) === 1 && col % 4 !== 3;
}
/** A searchlight's angle off the vertical at frame `f`, radians: a slow sweep of ±0.5. */
export const beamAngle = (b: Beam, f: number): number => Math.sin(((f + b.phase) / b.period) * Math.PI * 2) * 0.5;

/** THE TRAIN: one every TRAIN_EVERY seconds, the other way each time, at TRAIN_SPEED pixels a second. Null between. */
export const TRAIN_EVERY = 20, TRAIN_SPEED = 34, TRAIN_LEN = 64;
export function trainAt(t: number, w: number): { x: number; dir: 1 | -1 } | null {
  const k = Math.floor(t / TRAIN_EVERY), s = (t - k * TRAIN_EVERY) * TRAIN_SPEED;
  if (s > w + TRAIN_LEN) return null;
  const dir: 1 | -1 = k % 2 === 0 ? 1 : -1;
  return { x: dir === 1 ? Math.round(s - TRAIN_LEN) : Math.round(w - s), dir }; // the train's left end
}

/** THE STREET: cars as light pairs, rightwards on the head row, leftwards on the tail row; each its own speed. */
export const carCount = (w: number): number => Math.max(10, Math.min(60, Math.round(w / 8)));
export function carAt(i: number, t: number, w: number): { x: number; row: 0 | 1 } {
  const r = mulberry32(0x5ca1 + i * 7919);
  const speed = 5 + r() * 11, span = w + 16, s = ((r() * span + speed * t) % span + span) % span;
  const row: 0 | 1 = i % 2 === 0 ? 0 : 1;
  return { x: row === 0 ? Math.floor(s) - 8 : Math.floor(w + 8 - s), row };
}

/** THE CRAFT: a few, high, slow, each blinking its nav lights. */
export const flyerCount = (w: number): number => 3 + Math.floor(w / 160);
export function flyerAt(i: number, t: number, w: number, h: number): { x: number; y: number; dir: 1 | -1; blink: boolean } {
  const r = mulberry32(0xf17e + i * 104729);
  const y = Math.round(h * (0.2 + r() * 0.3)), speed = 3 + r() * 7, dir: 1 | -1 = r() < 0.5 ? 1 : -1, span = w + 24;
  const s = ((r() * span + speed * t) % span + span) % span;
  return { x: Math.floor(dir === 1 ? s - 12 : w + 12 - s), y, dir, blink: (frameAt(t) + i * 5) % 14 < 3 };
}
