export interface Placed { slug: string; col: number; row: number; span: 1 | 2 }

interface LayoutInput {
  slug: string;
  tileSize: 'normal' | 'large';
  position: { col: number; row: number } | null;
}

/** Contiguous carpet: fill a centered, landscape rectangle row-major with zero
    gaps — one unbroken floor of screens (the floor796 read). Larges claim 2×2
    blocks in stream order; explicit positions are honored first. Deterministic. */
export function layoutProjects(items: LayoutInput[]): Placed[] {
  const cellCount = items.reduce((s, it) => s + (it.tileSize === 'large' ? 4 : 1), 0);
  const cols = Math.max(2, Math.round(Math.sqrt(cellCount * 1.6)));
  const rows = Math.max(1, Math.ceil(cellCount / cols));
  const c0 = -Math.floor(cols / 2);
  const r0 = -Math.floor(rows / 2);

  const occupied = new Set<string>();
  const key = (c: number, r: number) => `${c},${r}`;
  const claim = (c: number, r: number, span: 1 | 2) => {
    for (let dc = 0; dc < span; dc++)
      for (let dr = 0; dr < span; dr++) occupied.add(key(c + dc, r + dr));
  };
  const fits = (c: number, r: number, span: 1 | 2) => {
    if (c < c0 || c + span - 1 > c0 + cols - 1) return false; // stay in the band
    for (let dc = 0; dc < span; dc++)
      for (let dr = 0; dr < span; dr++)
        if (occupied.has(key(c + dc, r + dr))) return false;
    return true;
  };

  const placed: Placed[] = [];
  for (const it of items) {
    const span: 1 | 2 = it.tileSize === 'large' ? 2 : 1;
    if (it.position) {
      claim(it.position.col, it.position.row, span);
      placed.push({ slug: it.slug, col: it.position.col, row: it.position.row, span });
      continue;
    }
    // first-fit scan from the top of the band — always restarts so earlier
    // holes (left by a 2×2 at a row end) are filled by the next 1×1
    let done = false;
    for (let r = r0; !done; r++) {
      for (let c = c0; c <= c0 + cols - span; c++) {
        if (fits(c, r, span)) {
          claim(c, r, span);
          placed.push({ slug: it.slug, col: c, row: r, span });
          done = true;
          break;
        }
      }
      if (r > r0 + rows + items.length) throw new Error(`layout overflow placing "${it.slug}"`);
    }
  }
  return placed;
}
