/** QUALITY (owner: a render distance that adapts; then "on other people's devices it stutters, on mobile it's very
 *  laggy"): four tiers of far plane, fog, shadows, pixel size, real point lights and the far LOD's density — and the
 *  governor that steers a render scale and the tier by the measured frame. Pure, tested; city3d.ts applies it. */
export interface Tier { label: 'low' | 'mid' | 'high' | 'ultra'; far: number; fog: number; shadows: boolean; pix: number; lights: number; lod: [number, number] }
export const TIERS: Tier[] = [ // (the whole map inside the fence at every tier; ring 1 at every tier; ring 2 from high; the far LOD's rings always — dense from high, sparse below: masses 24 and 40 high in place of 12 and 24; high and ultra render at the screen's own pixels)
  { label: 'low', far: 20000, fog: 0.0003, shadows: false, pix: 3, lights: 0, lod: [24, 40] },
  { label: 'mid', far: 20000, fog: 0.0003, shadows: false, pix: 2, lights: 8, lod: [24, 40] },
  { label: 'high', far: 20000, fog: 0.00028, shadows: true, pix: 1, lights: 14, lod: [12, 24] },
  { label: 'ultra', far: 20000, fog: 0.00025, shadows: true, pix: 1, lights: 18, lod: [12, 24] },
];
/** A phone's budget: ring 2's stand-in takes masses 20 high and rings 3–4 take 40; real point lights 0 at low, 4 at mid;
 *  the render scale floors at 0.6 of CSS. */
export const PHONE = { lod: [20, 40] as [number, number], lights: [0, 4], floor: 0.6 };
export interface Device { connection?: { effectiveType?: string; saveData?: boolean; downlink?: number }; hardwareConcurrency?: number; deviceMemory?: number }
/** The opening tier: high; mid on a phone or a small device; low under saveData or 2G. A connection never promotes (it
 *  says nothing of the GPU: a fast line on a weak laptop opened at ultra and stuttered for ten seconds). */
export function startTier(dev: Device, mobile: boolean): number {
  const c = dev.connection;
  let t = 2;
  if (c && (c.saveData || c.effectiveType === 'slow-2g' || c.effectiveType === '2g')) t = 0;
  else if (c && c.effectiveType === '3g') t = 1;
  if ((dev.hardwareConcurrency ?? 8) < 4 || (dev.deviceMemory ?? 8) < 4) t = Math.min(t, 1);
  if (mobile) t = Math.min(t, 1);
  return t;
}
/** A frame over SLOW ms is long; under FAST with the CPU under BUSY ms is headroom; a window is WINDOW frames. */
export const SLOW = 20, FAST = 17.5, BUSY = 9, WINDOW = 90;
export interface Governor { tier: number; scale: number; ceiling: number; floor: number; until: number; lastChange: number; lastDown: number }
/** A governor at `tier`: the scale whole, the ceiling the top tier (a phone: mid — no shadows, no full ring 2 on a phone, however fast). */
export const newGovernor = (tier: number, now: number, floor = 0.6, ceiling = TIERS.length - 1): Governor => ({ tier, scale: 1, ceiling, floor, until: now + 3000, lastChange: now, lastDown: now });
export type Steer = 'scale-down' | 'down' | 'scale-up' | 'up' | null;
/** A window's verdict — `avg` the frames' mean interval (ms), `busy` the CPU's share of a frame (the steps and the
 *  render's submission), at `now` (ms). Long frames shrink the render scale by a fifth to the floor, then step the tier
 *  down and close the tier above for the session; short frames with headroom, twelve seconds after the last shrink or
 *  step down, grow the scale back and then the tier up to the ceiling. Two seconds' cooldown after a scale change,
 *  four after a tier down; the first three seconds hold. Mutates `g`; returns what changed. */
export function steer(g: Governor, avg: number, busy: number, now: number): Steer {
  if (now < g.until) return null;
  if (avg > SLOW) {
    if (g.scale > g.floor + 1e-9) { g.scale = Math.max(g.floor, g.scale * 0.8); g.until = now + 2000; g.lastChange = now; g.lastDown = now; return 'scale-down'; }
    if (g.tier > 0) { g.tier -= 1; g.ceiling = g.tier; g.scale = 1; g.until = now + 4000; g.lastChange = now; g.lastDown = now; return 'down'; }
    return null;
  }
  if (avg < FAST && busy < BUSY && now - g.lastDown >= 12000) {
    if (g.scale < 1 - 1e-9) { g.scale = Math.min(1, g.scale * 1.15); g.until = now + 2000; g.lastChange = now; return 'scale-up'; }
    if (g.tier < g.ceiling) { g.tier += 1; g.until = now + 2000; g.lastChange = now; return 'up'; }
  }
  return null;
}
/** THE BLOW-UP, WHOLE (owner, 2026-10-11: "roads across whole city still flickering when camera moves"): the browser
 *  blows the frame up to the screen nearest-neighbour (story.css: the pixels ARE the look), and at a fraction of a
 *  screen pixel a frame pixel — the governor's fifths (1.25, 1.56) or a phone's 2.4 — it doubled some rows and columns
 *  and not others, so every thin line (the lane paint, the kerbs, the zebras, the window grids) hopped between them as
 *  the eye moved. The frame for a canvas `cssW` × `cssH` at a device `ratio` and a render `scale` (frame pixels a CSS
 *  pixel): a whole number of screen pixels a frame pixel, blown up nearest-neighbour — the nearest whole number where
 *  the scale lands within 2 % of one; else, for the pixel tiers, the next whole number up (never more pixels than the
 *  governor allows); else (the screen's-own-pixel tiers) the asked size, blown up smooth. */
export function frameSize(cssW: number, cssH: number, ratio: number, scale: number, pixelLook: boolean): { w: number; h: number; smooth: boolean } {
  const f = ratio / scale; // screen pixels a frame pixel, along each axis
  const near = Math.round(f);
  const n = near >= 1 && Math.abs(f - near) < 0.02 * f ? near : pixelLook ? Math.max(1, Math.ceil(f)) : 0;
  if (!n) return { w: Math.max(1, Math.ceil(cssW * scale)), h: Math.max(1, Math.ceil(cssH * scale)), smooth: true };
  return { w: Math.max(1, Math.round((cssW * ratio) / n)), h: Math.max(1, Math.round((cssH * ratio) / n)), smooth: false };
}
