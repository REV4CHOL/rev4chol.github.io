export interface Placed { slug: string; col: number; row: number; span: 1 | 2 }

interface LayoutInput {
  slug: string;
  tileSize: 'normal' | 'large';
  position: { col: number; row: number } | null;
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** Every third column/row is a street (gap) — the "city blocks" rhythm. */
export const isStreet = (col: number, row: number): boolean =>
  mod(col, 3) === 2 || mod(row, 3) === 2;

/** Chebyshev rings around the origin, clockwise, deterministic. */
function* ringCells(maxRing: number): Generator<[number, number]> {
  yield [0, 0];
  for (let ring = 1; ring <= maxRing; ring++) {
    for (let c = -ring; c <= ring; c++) yield [c, -ring];
    for (let r = -ring + 1; r <= ring; r++) yield [ring, r];
    for (let c = ring - 1; c >= -ring; c--) yield [c, ring];
    for (let r = ring - 1; r >= -ring + 1; r--) yield [-ring, r];
  }
}

export function layoutProjects(items: LayoutInput[]): Placed[] {
  const occupied = new Set<string>();
  const key = (c: number, r: number) => `${c},${r}`;
  const claim = (c: number, r: number, span: 1 | 2) => {
    for (let dc = 0; dc < span; dc++)
      for (let dr = 0; dr < span; dr++) occupied.add(key(c + dc, r + dr));
  };
  const fits = (c: number, r: number, span: 1 | 2) => {
    for (let dc = 0; dc < span; dc++)
      for (let dr = 0; dr < span; dr++)
        if (isStreet(c + dc, r + dr) || occupied.has(key(c + dc, r + dr))) return false;
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
    let done = false;
    for (const [c, r] of ringCells(12)) {
      if (fits(c, r, span)) {
        claim(c, r, span);
        placed.push({ slug: it.slug, col: c, row: r, span });
        done = true;
        break;
      }
    }
    if (!done) throw new Error(`layout overflow placing "${it.slug}" — raise maxRing`);
  }
  return placed;
}
