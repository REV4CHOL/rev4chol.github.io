export interface Placed { slug: string; col: number; row: number; span: 1 | 2 }

/** Lego pass: turn the integer grid into packed rows. Each pane advances its
    row cursor by its own width plus the seam, so a narrower pane (4:3 in a
    16:9 carpet) pulls every later neighbor in its row(s) tight against it —
    no air. A 2-row large takes the max cursor of both its rows and advances
    them together, which keeps the carpet overlap-free by construction.
    Uniform widths reproduce the classic lattice exactly (centers stepW
    apart). Returns each slug's u-CENTER in card-space px along the row axis. */
export function packRows(
  placed: Placed[],
  widthOf: (p: Placed) => number,
  seam: number,
  stepW: number,
): Map<string, number> {
  const rowStart = new Map<number, number>();
  for (const p of placed) {
    for (let k = 0; k < p.span; k++) {
      const r = p.row + k;
      rowStart.set(r, Math.min(rowStart.get(r) ?? Infinity, p.col));
    }
  }
  const cursor = new Map<number, number>();
  const out = new Map<string, number>();
  const items = [...placed].sort((a, b) => a.col - b.col || a.row - b.row);
  for (const p of items) {
    const w = widthOf(p) * p.span + seam * (p.span - 1);
    const myRows = Array.from({ length: p.span }, (_, k) => p.row + k);
    const start = Math.max(...myRows.map((r) => cursor.get(r) ?? (rowStart.get(r) ?? 0) * stepW));
    for (const r of myRows) cursor.set(r, start + w + seam);
    out.set(p.slug, start + w / 2);
  }
  return out;
}

interface LayoutInput {
  slug: string;
  tileSize: 'normal' | 'large';
  position: { col: number; row: number } | null;
}

/** Contiguous carpet: fill a centered, landscape rectangle row-major with zero
    gaps — one unbroken floor of screens (the floor796 read). Larges are the
    FEATURED tiles: their 2×2 blocks are reserved as one solid cluster at the
    centre of the band before anything else places, so the biggest screens
    concentrate at the heart of the floor and the 1×1s wrap around them.
    Explicit positions are honored first. Deterministic. */
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

  // reserve the featured cluster before any first-fit, so early 1×1s in the
  // stream can never squat on the centre
  const largeCount = items.filter((it) => !it.position && it.tileSize === 'large').length;
  const clusterCols = Math.ceil(Math.sqrt(largeCount));
  const clusterRows = clusterCols > 0 ? Math.ceil(largeCount / clusterCols) : 0;
  const cc0 = c0 + Math.max(0, Math.floor((cols - clusterCols * 2) / 2));
  const rr0 = r0 + Math.max(0, Math.floor((rows - clusterRows * 2) / 2));
  const slots: { c: number; r: number }[] = [];
  for (let ri = 0; ri < clusterRows && slots.length < largeCount; ri++)
    for (let ci = 0; ci < clusterCols && slots.length < largeCount; ci++)
      slots.push({ c: cc0 + ci * 2, r: rr0 + ri * 2 });
  for (const s of slots) claim(s.c, s.r, 2);
  let slotIdx = 0;

  const placed: Placed[] = [];
  const firstFit = (slug: string, span: 1 | 2): void => {
    // first-fit scan from the top of the band — always restarts so earlier
    // holes (left by a 2×2 at a row end) are filled by the next 1×1
    for (let r = r0; ; r++) {
      for (let c = c0; c <= c0 + cols - span; c++) {
        if (fits(c, r, span)) {
          claim(c, r, span);
          placed.push({ slug, col: c, row: r, span });
          return;
        }
      }
      if (r > r0 + rows + 1000) throw new Error(`layout overflow placing "${slug}"`);
    }
  };

  for (const it of items) {
    const span: 1 | 2 = it.tileSize === 'large' ? 2 : 1;
    if (it.position) {
      claim(it.position.col, it.position.row, span);
      placed.push({ slug: it.slug, col: it.position.col, row: it.position.row, span });
      continue;
    }
    if (span === 2 && slotIdx < slots.length) {
      const s = slots[slotIdx++];
      placed.push({ slug: it.slug, col: s.c, row: s.r, span });
      continue;
    }
    firstFit(it.slug, span);
  }
  return placed;
}
