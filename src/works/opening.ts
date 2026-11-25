import { reelMode } from './reel';

/** THE PHONE'S FIRST FRAME (owner's testers, 2026-09-27). The floor's camera opens on the world origin, and the
 *  featured cluster is centred on it — so a phone, too narrow for the cluster, opened on the SEAM between two
 *  featured panes: half of each, nothing that read as a card to tap. Now a touch screen opens on one whole pane:
 *  the featured pane nearest the origin (first in json order on a tie; any pane when nothing is featured), fitted
 *  to the width and centred. Desktop keeps the cluster. Since 2026-11-24 a tablet keeps it too (`openingFor`). */
export interface FramePane {
  x: number;
  y: number;
  /** the pane's drawn half-width at scale 1 (`extentX()`), shear included */
  halfW: number;
  featured: boolean;
}

export interface OpeningFrame {
  /** the pan offset that centres the pane (−pane · scale) */
  x: number;
  y: number;
  scale: number;
}

export function openingFrame(
  panes: FramePane[],
  screenW: number,
  minScale: number,
  maxScale = 1,
  margin = 18,
): OpeningFrame | null {
  const pool = panes.some((p) => p.featured) ? panes.filter((p) => p.featured) : panes;
  let best: FramePane | null = null;
  let bestD = Infinity;
  for (const p of pool) {
    const d = Math.hypot(p.x, p.y);
    if (d < bestD) {
      best = p;
      bestD = d;
    }
  }
  if (!best) return null;
  const fit = (screenW - 2 * margin) / (2 * best.halfW);
  const scale = Math.min(maxScale, Math.max(minScale, fit));
  return { x: -best.x * scale, y: -best.y * scale, scale };
}

/** The width of world a full-HD desktop opens on (1920 screen px at scale 1): the same 1920 the pinch's floor names
 *  (world.ts `minZoom`: "full pinch-out on any device reveals what a ~1920px desktop sees"). */
export const DESKTOP_VIEW_W = 1920;

/** A TABLET OPENS ON WHAT A DESKTOP SHOWS (owner, on an iPad: "When go to work section, initially, it got zoomed WAY
 *  TOO CLOSE to the panes"). Every touch screen used to take the phone's frame above; on a tablet that is scale 1 (the
 *  fit is wider than the screen, so the cap holds it), centred on one pane: a featured pane 73% of an iPad's width, 98%
 *  of a portrait iPad's, wider than a portrait Android tablet. Now:
 *  - a fine pointer: fully zoomed out (`pcOpening`, below), in a wide window and a narrow one alike;
 *  - a phone-shaped touch screen (the strip's own cut, `reelMode`): the phone's frame, one whole pane. The strip is
 *    decided once, as the page loads, so the floor reaches such a screen only when a tablet narrowed after loading
 *    (split view, multi-window) and builds its next chapter at that size;
 *  - any other touch screen, a tablet: the desktop's cluster at the origin, scaled so the screen's width shows the
 *    width of world a full-HD desktop shows (a featured pane the same share of the screen, the same panes across),
 *    never closer than scale 1 and never past the pinch's floor. */
export function openingFor(
  panes: FramePane[],
  screen: { w: number; h: number },
  fine: boolean,
  minScale: number,
): OpeningFrame | null {
  if (fine) return pcOpening(minScale);
  if (reelMode({ coarse: true, width: screen.w, height: screen.h })) return openingFrame(panes, screen.w, minScale);
  return desktopOpening(screen.w, minScale);
}

/** A PC OPENS FULLY ZOOMED OUT (owner, 2026-11-25: "for PC's work section when first booting up, I want the view to
 *  already be maxed zoomed out. Right now its already zoom in a bit, and I dont like it"). The cluster at the middle,
 *  at the zoom's own floor: the scale the wheel can go no further out than (world.ts `minZoom`, 0.5 on any window
 *  960 px or wider). It stood at scale 1. A mouse has this one opening in every window: a narrow PC window took the
 *  tablet's until the same night, and never takes the phone's one-pane frame. */
export function pcOpening(minScale: number): OpeningFrame {
  return { x: 0, y: 0, scale: minScale };
}

/** The desktop's cluster at the origin, scaled so a screen `screenW` wide shows the width of world a full-HD desktop
 *  showed at scale 1, never closer than scale 1 and never past the pinch's floor: a TABLET's opening (above). A PC,
 *  narrow window or wide, opens further out since 2026-11-25 (`pcOpening`). */
export function desktopOpening(screenW: number, minScale: number): OpeningFrame {
  return { x: 0, y: 0, scale: Math.min(1, Math.max(minScale, screenW / DESKTOP_VIEW_W)) };
}
