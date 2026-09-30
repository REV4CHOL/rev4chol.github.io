import type { TileRect, ViewRect } from './priority';

/** NEVER LOST IN EMPTY FLOOR (the review's walkthroughs, 2026-09-30: on a phone "one drag threw the wall into empty floor with no
 *  way back"). The floor may be panned a halo past the carpet, so its furniture can be framed; on a small screen that
 *  halo is several screens of black, and the carpet's own outline (a sheared block) leaves its corners empty too. A
 *  visitor who lands there sees no film and no sign of where the films went. The floor now notices: when the middle of
 *  the screen holds no pane, and the floor has come to rest, it glides back to the nearest one (world.ts). Pure. */

/** The part of the screen that must hold a pane: the view less this share of its width and height on every side. */
const EDGE = 0.2;
/** A pane counts by its core, not by the empty corners of its sheared outline's bounding box. */
const CORE = 0.6;

export function strayed(view: ViewRect, panes: TileRect[]): boolean {
  if (panes.length === 0) return false; // nowhere to return to
  const x0 = view.x + view.w * EDGE;
  const x1 = view.x + view.w * (1 - EDGE);
  const y0 = view.y + view.h * EDGE;
  const y1 = view.y + view.h * (1 - EDGE);
  return !panes.some(
    (p) => p.cx + p.hw * CORE > x0 && p.cx - p.hw * CORE < x1 && p.cy + p.hh * CORE > y0 && p.cy - p.hh * CORE < y1,
  );
}

/** The pane nearest the middle of the screen: where a strayed floor returns to. */
export function nearestPane(view: ViewRect, panes: TileRect[]): TileRect | null {
  const cx = view.x + view.w / 2;
  const cy = view.y + view.h / 2;
  let best: TileRect | null = null;
  let bestD = Infinity;
  for (const p of panes) {
    const d = (p.cx - cx) ** 2 + (p.cy - cy) ** 2;
    if (d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
}
