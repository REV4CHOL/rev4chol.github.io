import { describe, expect, it } from 'vitest';
import { layoutProjects, packRows, paneBand, Placed } from '../src/works/layout';

const W169 = 400;
const W43 = 300;
const SEAM = 8;
const STEP = 408;

describe('packRows — the lego pass', () => {
  it('uniform widths reproduce the classic lattice spacing', () => {
    const placed: Placed[] = [
      { slug: 'a', col: 0, row: 0, span: 1 },
      { slug: 'b', col: 1, row: 0, span: 1 },
      { slug: 'c', col: 2, row: 0, span: 1 },
    ];
    const u = packRows(placed, () => W169, SEAM, STEP);
    expect(u.get('b')! - u.get('a')!).toBe(STEP);
    expect(u.get('c')! - u.get('b')!).toBe(STEP);
  });

  it('a 4:3 pane pulls every later neighbor in its row tight against it', () => {
    const placed: Placed[] = [
      { slug: 'a', col: 0, row: 0, span: 1 },
      { slug: 'fish', col: 1, row: 0, span: 1 },
      { slug: 'c', col: 2, row: 0, span: 1 },
    ];
    const u = packRows(placed, (p) => (p.slug === 'fish' ? W43 : W169), SEAM, STEP);
    expect(u.get('fish')! - u.get('a')!).toBe(W169 / 2 + SEAM + W43 / 2);
    expect(u.get('c')! - u.get('fish')!).toBe(W43 / 2 + SEAM + W169 / 2);
  });

  it('a 2-row 4:3 large advances both its rows together — later tiles align, no overlap', () => {
    const placed: Placed[] = [
      { slug: 'L', col: 0, row: 0, span: 2 },
      { slug: 'r0', col: 2, row: 0, span: 1 },
      { slug: 'r1', col: 2, row: 1, span: 1 },
    ];
    const u = packRows(placed, (p) => (p.slug === 'L' ? W43 : W169), SEAM, STEP);
    const lW = W43 * 2 + SEAM;
    expect(u.get('r0')! - u.get('L')!).toBe(lW / 2 + SEAM + W169 / 2);
    expect(u.get('r1')).toBe(u.get('r0'));
  });

  it('a row of equal 2×2 panes steps by two cells and a seam, whatever the widths', () => {
    const placed: Placed[] = [
      { slug: 'a', col: 0, row: 0, span: 2 },
      { slug: 'scope', col: 2, row: 0, span: 2 },
      { slug: 'c', col: 4, row: 0, span: 2 },
    ];
    const W239 = 538;
    const u = packRows(placed, (p) => (p.slug === 'scope' ? W239 : W169), SEAM, STEP);
    expect(u.get('scope')! - u.get('a')!).toBe((W169 * 2 + SEAM) / 2 + SEAM + (W239 * 2 + SEAM) / 2);
  });
});

const item = (slug: string, tileSize: 'normal' | 'large' = 'normal', position: { col: number; row: number } | null = null) =>
  ({ slug, tileSize, position });

const cellsOf = (p: Placed): string[] => {
  const out: string[] = [];
  for (let dc = 0; dc < p.span; dc++)
    for (let dr = 0; dr < p.span; dr++) out.push(`${p.col + dc},${p.row + dr}`);
  return out;
};

const noOverlaps = (placed: Placed[], tag = '') => {
  const cells = new Set<string>();
  for (const p of placed) {
    for (const k of cellsOf(p)) {
      expect(cells.has(k), `overlap at ${k} ${tag}`).toBe(false);
      cells.add(k);
    }
  }
  return cells;
};

/** A chapter as it ships: twenty panes, six featured, in json order. */
const chapter = () => [
  item('f0', 'large'), item('f1', 'large'), item('f2', 'large'),
  ...Array.from({ length: 5 }, (_, i) => item(`a${i}`)),
  item('f3', 'large'),
  ...Array.from({ length: 4 }, (_, i) => item(`b${i}`)),
  item('f4', 'large'), item('f5', 'large'),
  ...Array.from({ length: 5 }, (_, i) => item(`c${i}`)),
];

// (owner 2026-09-26: "all panes outside the FEATURED must have the similar sizes as their FEATURED counterparts")
describe('layoutProjects (a carpet of equal panes)', () => {
  it('is deterministic', () => {
    expect(layoutProjects(chapter())).toEqual(layoutProjects(chapter()));
  });

  it('lays every pane as a 2×2 block — the featured size — featured or not', () => {
    const placed = layoutProjects(chapter());
    expect(placed).toHaveLength(20);
    for (const p of placed) expect(p.span, p.slug).toBe(2);
  });

  it('never overlaps panes', () => {
    noOverlaps(layoutProjects(chapter()));
  });

  it('lays a shipped chapter (20 panes, 6 featured) as a clean 5 × 4 block: the featured 3 × 2, ringed by the rest', () => {
    const placed = layoutProjects(chapter());
    const slotC = (p: Placed) => p.col / 2;
    const slotR = (p: Placed) => p.row / 2;
    const cs = placed.map(slotC), rs = placed.map(slotR);
    const [minC, maxC, minR, maxR] = [Math.min(...cs), Math.max(...cs), Math.min(...rs), Math.max(...rs)];
    expect([maxC - minC + 1, maxR - minR + 1]).toEqual([5, 4]); // 20 slots, 20 panes: no ragged row
    for (const p of placed) {
      const ring = slotC(p) === minC || slotC(p) === maxC || slotR(p) === minR || slotR(p) === maxR;
      expect(ring, `${p.slug}: featured inside, the rest on the ring`).toBe(!p.slug.startsWith('f'));
    }
  });

  it('packs a contiguous carpet — every pane shares an edge with another', () => {
    const placed = layoutProjects([item('big', 'large'), ...Array.from({ length: 25 }, (_, i) => item(`p${i}`))]);
    const all = new Set(placed.flatMap(cellsOf));
    for (const p of placed) {
      const own = new Set(cellsOf(p));
      const touches = cellsOf(p).some((k) => {
        const [c, r] = k.split(',').map(Number);
        return [`${c + 1},${r}`, `${c - 1},${r}`, `${c},${r + 1}`, `${c},${r - 1}`].some(
          (n) => all.has(n) && !own.has(n),
        );
      });
      expect(touches, `${p.slug} is disconnected from the carpet`).toBe(true);
    }
  });

  it('leaves no holes in any band row — panes butt two cells apart', () => {
    const placed = layoutProjects(chapter());
    const rows = new Map<number, number[]>();
    for (const p of placed) {
      if (!rows.has(p.row)) rows.set(p.row, []);
      rows.get(p.row)!.push(p.col);
    }
    for (const cols of rows.values()) {
      cols.sort((a, b) => a - b);
      for (let i = 1; i < cols.length; i++) expect(cols[i] - cols[i - 1]).toBe(2);
    }
    // and the band rows themselves stack two cells apart
    const rs = [...rows.keys()].sort((a, b) => a - b);
    for (let i = 1; i < rs.length; i++) expect(rs[i] - rs[i - 1]).toBe(2);
  });

  it('gathers the featured into one solid cluster at the heart, on the camera\'s opening view', () => {
    // stream order must not matter: regular panes arriving first cannot squat the centre
    const placed = layoutProjects([
      ...Array.from({ length: 10 }, (_, i) => item(`s${i}`)),
      ...Array.from({ length: 6 }, (_, i) => item(`big${i}`, 'large')),
      ...Array.from({ length: 4 }, (_, i) => item(`t${i}`)),
    ]);
    const bigs = placed.filter((p) => p.slug.startsWith('big'));
    const cells = bigs.flatMap(cellsOf).map((k) => k.split(',').map(Number));
    const minC = Math.min(...cells.map(([c]) => c));
    const maxC = Math.max(...cells.map(([c]) => c));
    const minR = Math.min(...cells.map(([, r]) => r));
    const maxR = Math.max(...cells.map(([, r]) => r));
    // one solid block: the bounding box is exactly filled by the six (3 × 2 panes)
    expect((maxC - minC + 1) * (maxR - minR + 1)).toBe(24);
    expect(new Set(cells.map((c) => c.join(','))).size).toBe(24);
    // centred on the world origin, where the camera opens (cell centres sit on integers)
    expect(Math.abs((minC + maxC) / 2)).toBeLessThanOrEqual(0.5);
    expect(Math.abs((minR + maxR) / 2)).toBeLessThanOrEqual(0.5);
  });

  it('grows organically — future films can be appended at any scale, no cap', () => {
    for (const [smalls, larges] of [[10, 3], [14, 6], [23, 3], [34, 6], [54, 6], [92, 8], [200, 12], [7, 0]] as const) {
      const items = [
        ...Array.from({ length: smalls }, (_, i) => item(`s${i}`)),
        ...Array.from({ length: larges }, (_, i) => item(`big${i}`, 'large')),
      ];
      const placed = layoutProjects(items);
      const tag = `(${smalls}+${larges})`;
      expect(placed, `${tag}: every film placed`).toHaveLength(items.length);
      expect(new Set(placed.map((p) => p.slug)).size, `${tag}: each once`).toBe(items.length);
      noOverlaps(placed, tag);
      for (const p of placed) expect(p.span).toBe(2);

      // a bounded landscape band — growth adds rows; the width stays between a
      // square and a wide 2.2:1 (in panes), and the band leaves less than a row empty
      const n = items.length;
      const clusterCols = Math.ceil(Math.sqrt(larges));
      const colsUsed = placed.map((p) => p.col);
      const rowsUsed = placed.map((p) => p.row);
      const width = (Math.max(...colsUsed) - Math.min(...colsUsed)) / 2 + 1;
      const height = (Math.max(...rowsUsed) - Math.min(...rowsUsed)) / 2 + 1;
      expect(width, `${tag}: band width`).toBeLessThanOrEqual(Math.max(2, clusterCols, Math.round(Math.sqrt(n * 2.2))));
      expect(width, `${tag}: landscape`).toBeGreaterThanOrEqual(height);
      expect(width * height - n, `${tag}: empty slots`).toBeLessThan(width);

      // the featured stay inside their centred cluster envelope
      if (larges) {
        const bigs = placed.filter((p) => p.slug.startsWith('big'));
        const bw = (Math.max(...bigs.map((p) => p.col)) - Math.min(...bigs.map((p) => p.col))) / 2 + 1;
        const bh = (Math.max(...bigs.map((p) => p.row)) - Math.min(...bigs.map((p) => p.row))) / 2 + 1;
        expect(bw, `${tag}: cluster width`).toBeLessThanOrEqual(clusterCols);
        expect(bh, `${tag}: cluster height`).toBeLessThanOrEqual(Math.ceil(larges / clusterCols));
      }
    }
  });

  it('honors explicit pins in pane slots and keeps every other pane clear of them', () => {
    const placed = layoutProjects([
      item('pin-a', 'normal', { col: 0, row: 0 }),
      item('auto-1'),
      item('pin-b', 'normal', { col: 1, row: 0 }),
      item('auto-2'),
    ]);
    const [a, , b] = placed;
    expect(a.slug).toBe('pin-a');
    expect(b.slug).toBe('pin-b');
    // neighbouring slots on the band: the same band row, one pane (two cells) apart
    expect(b.row).toBe(a.row);
    expect(b.col - a.col).toBe(2);
    noOverlaps(placed);
  });

  it('paneBand alternates row by row, so the flights keep their rhythm on even lattice rows', () => {
    const placed = layoutProjects(chapter());
    const bands = [...new Set(placed.map(paneBand))].sort((x, y) => x - y);
    for (let i = 1; i < bands.length; i++) expect(bands[i] - bands[i - 1]).toBe(1);
    expect(paneBand({ slug: 'x', col: 0, row: 3, span: 1 })).toBe(3); // a 1×1 is its own band
  });
});
