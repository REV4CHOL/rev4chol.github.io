/** THE PHONE'S FIRST FRAME (owner's testers, 2026-09-27). The floor's camera opens on the world origin, and the
 *  featured cluster is centred on it — so a phone, too narrow for the cluster, opened on the SEAM between two
 *  featured panes: half of each, nothing that read as a card to tap. Now a touch screen opens on one whole pane:
 *  the featured pane nearest the origin (first in json order on a tie; any pane when nothing is featured), fitted
 *  to the width and centred. Desktop keeps the cluster. */
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
