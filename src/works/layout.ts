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

/** Contiguous carpet of EQUAL panes (owner 2026-09-26: "all panes outside the
    FEATURED must have the similar sizes as their FEATURED counterparts").
    Every pane is a 2×2 block of lattice cells — the size a featured pane
    always had — on a centered, landscape band of pane slots. Featured stays a
    dress, not a size: the featured still gather as one solid cluster at the
    heart of the band, reserved before anything else places, and every other
    pane fills around them first-fit, row-major (always rescanning from the
    top), so the band has no holes. The cluster's centre lands on the world
    origin, where the camera opens. Explicit positions pin a pane's SLOT on the
    band and are placed first. Deterministic. */
export function layoutProjects(items: LayoutInput[]): Placed[] {
  const n = items.length;
  const featured = items.filter((it) => !it.position && it.tileSize === 'large').length;
  const clusterCols = featured > 0 ? Math.ceil(Math.sqrt(featured)) : 0;
  const clusterRows = clusterCols > 0 ? Math.ceil(featured / clusterCols) : 0;
  // the band: of the landscape shapes (square to 2.2:1, in panes) the one that
  // leaves the fewest empty slots, nearest the classic 1.6 on a tie — so twenty
  // panes lie as a clean 5 × 4 block, six featured framed by a one-pane ring
  const waste = (c: number) => c * Math.ceil(n / c) - n;
  const lo = Math.max(2, clusterCols, Math.ceil(Math.sqrt(n)));
  const hi = Math.max(lo, Math.round(Math.sqrt(n * 2.2)));
  let cols = lo;
  for (let c = lo + 1; c <= hi; c++) {
    const better = waste(c) < waste(cols) ||
      (waste(c) === waste(cols) && Math.abs(c - Math.sqrt(n * 1.6)) < Math.abs(cols - Math.sqrt(n * 1.6)));
    if (better) cols = c;
  }
  const rows = Math.max(1, Math.ceil(n / cols), clusterRows);
  const c0 = -Math.floor(cols / 2);
  const r0 = -Math.floor(rows / 2);

  const occupied = new Set<string>();
  const key = (c: number, r: number) => `${c},${r}`;
  const slot = new Map<string, { c: number; r: number }>();
  const take = (slug: string, c: number, r: number) => {
    occupied.add(key(c, r));
    slot.set(slug, { c, r });
  };

  // pins first, so nothing auto-placed can squat on them
  for (const it of items) if (it.position) take(it.slug, it.position.col, it.position.row);

  // the featured cluster at the band's heart
  const cc0 = c0 + Math.floor((cols - clusterCols) / 2);
  const rr0 = r0 + Math.floor((rows - clusterRows) / 2);
  const clusterSlots: { c: number; r: number }[] = [];
  for (let ri = 0; ri < clusterRows; ri++)
    for (let ci = 0; ci < clusterCols; ci++)
      if (clusterSlots.length < featured && !occupied.has(key(cc0 + ci, rr0 + ri)))
        clusterSlots.push({ c: cc0 + ci, r: rr0 + ri });
  for (const s of clusterSlots) occupied.add(key(s.c, s.r));
  let next = 0;

  const firstFit = (slug: string): void => {
    for (let r = r0; ; r++) {
      for (let c = c0; c < c0 + cols; c++) {
        if (!occupied.has(key(c, r))) {
          take(slug, c, r);
          return;
        }
      }
      if (r > r0 + rows + 1000) throw new Error(`layout overflow placing "${slug}"`);
    }
  };

  for (const it of items) {
    if (it.position) continue;
    if (it.tileSize === 'large' && next < clusterSlots.length) {
      const s = clusterSlots[next++];
      slot.set(it.slug, s);
      continue;
    }
    firstFit(it.slug);
  }

  // slots → lattice cells: every pane a 2×2 block; shift the whole band so the
  // featured cluster (or, with none, the band) is centred on the origin
  const [mc0, mcols, mr0, mrows] = clusterCols ? [cc0, clusterCols, rr0, clusterRows] : [c0, cols, r0, rows];
  const dx = -Math.round(2 * mc0 + mcols - 0.5);
  const dy = -Math.round(2 * mr0 + mrows - 0.5);
  return items.map((it) => {
    const s = slot.get(it.slug)!;
    return { slug: it.slug, col: 2 * s.c + dx, row: 2 * s.r + dy, span: 2 as const };
  });
}

/** The pane's row on the band (a 2×2 pane covers two lattice rows) — what the
    floor's flights alternate and stagger by. A 1×1 is its own band. */
export function paneBand(p: Placed): number {
  return Math.floor(p.row / p.span);
}
