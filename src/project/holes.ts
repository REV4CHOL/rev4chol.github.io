/** THE FILM LAYERS' HOLES (pages/project.ts, armEffectHole): the grain and the scan lines never land on the film's
 *  player or on the stills wall, so both full-screen layers carry a mask with a hole per region, following it as the
 *  page scrolls.
 *
 *  A hole is its region's box clamped to the screen and a margin round it (owner, 2026-11-25: "I am using phone. The
 *  performance when scrolling the Work section is super laggy"). Measured on a phone profile, every scroll event wrote
 *  the regions' raw boxes into both layers, so both were painted again on every scroll frame, even deep inside the
 *  stills wall, where the hole covers the whole screen. Clamped, nothing that shows changes (the layers are the screen,
 *  and a mask beyond them masks nothing), while a region that covers or misses the screen gives the same values from
 *  one frame to the next: the page writes nothing and nothing is painted again. An edge on the screen stays exact. */

export interface HoleBox { left: number; top: number; width: number; height: number }

/** The margin kept round the screen, plate px: a quarter of the screen's height, never under 64 (a phone's bars come
 *  and go as it scrolls; the layers' box follows the viewport, the margin outlasts the difference). */
export function holePad(viewH: number, zoom: number): number {
  return Math.max(64, (viewH / (zoom || 1)) * 0.25);
}

/** A region's box (viewport px, as getBoundingClientRect gives it) as its hole, in plate px (the layers lay out on the
 *  poster lock's plate: divided by `zoom`), clamped to the screen (`viewW` x `viewH`, viewport px) and `pad`. */
export function holeRect(r: HoleBox, zoom: number, viewW: number, viewH: number, pad: number): HoleBox {
  const z = zoom || 1;
  const W = viewW / z, H = viewH / z;
  const clampX = (v: number) => Math.min(W + pad, Math.max(-pad, v));
  const clampY = (v: number) => Math.min(H + pad, Math.max(-pad, v));
  const x0 = r.left / z, y0 = r.top / z, x1 = (r.left + r.width) / z, y1 = (r.top + r.height) / z;
  const cx0 = clampX(x0), cx1 = clampX(x1), cy0 = clampY(y0), cy1 = clampY(y1);
  // (an edge that needed no clamp keeps the value the layers had before, to the last digit)
  return {
    left: cx0,
    top: cy0,
    width: cx0 === x0 && cx1 === x1 ? r.width / z : cx1 - cx0,
    height: cy0 === y0 && cy1 === y1 ? r.height / z : cy1 - cy0,
  };
}

/** The mask's custom properties for each named hole that has a region (`null`: its region is not on the page, and its
 *  values stay as they were). */
export function holeProps(holes: readonly (readonly [prefix: string, box: HoleBox | null])[]): [string, string][] {
  const out: [string, string][] = [];
  for (const [p, b] of holes) {
    if (!b) continue;
    out.push([`${p}-x`, `${b.left}px`], [`${p}-y`, `${b.top}px`], [`${p}-w`, `${b.width}px`], [`${p}-h`, `${b.height}px`]);
  }
  return out;
}
