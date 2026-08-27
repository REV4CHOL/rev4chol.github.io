export interface TileRect { slug: string; cx: number; cy: number; hw: number; hh: number }
export interface ViewRect { x: number; y: number; w: number; h: number }

const MARGIN = 160;

/** Which tiles get live video right now. Pure — unit tested. */
export function computePlaySet(
  tiles: TileRect[],
  view: ViewRect,
  hovered: string | null,
  cap: number,
): Set<string> {
  const vx = view.x - MARGIN;
  const vy = view.y - MARGIN;
  const vr = view.x + view.w + MARGIN;
  const vb = view.y + view.h + MARGIN;
  const cx = view.x + view.w / 2;
  const cy = view.y + view.h / 2;

  const visible = tiles.filter(
    (t) => t.cx + t.hw > vx && t.cx - t.hw < vr && t.cy + t.hh > vy && t.cy - t.hh < vb,
  );
  const d2 = (t: TileRect) => (t.cx - cx) ** 2 + (t.cy - cy) ** 2;
  visible.sort((a, b) => d2(a) - d2(b) || a.slug.localeCompare(b.slug));

  const out = new Set<string>();
  if (hovered) out.add(hovered);
  const limit = Math.max(cap, 1);
  for (const t of visible) {
    if (out.size >= limit) break;
    out.add(t.slug);
  }
  return out;
}
