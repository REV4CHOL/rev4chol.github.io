import { describe, expect, it } from 'vitest';
import { layoutProjects, Placed } from '../src/works/layout';

const item = (slug: string, tileSize: 'normal' | 'large' = 'normal', position: { col: number; row: number } | null = null) =>
  ({ slug, tileSize, position });

const cellsOf = (p: Placed): string[] => {
  const out: string[] = [];
  for (let dc = 0; dc < p.span; dc++)
    for (let dr = 0; dr < p.span; dr++) out.push(`${p.col + dc},${p.row + dr}`);
  return out;
};

describe('layoutProjects (contiguous carpet)', () => {
  it('is deterministic', () => {
    const items = Array.from({ length: 9 }, (_, i) => item(`p${i}`));
    expect(layoutProjects(items)).toEqual(layoutProjects(items));
  });

  it('never overlaps tiles, including large spans', () => {
    const placed = layoutProjects([
      item('big-a', 'large'),
      ...Array.from({ length: 20 }, (_, i) => item(`p${i}`)),
      item('big-b', 'large'),
    ]);
    const cells = new Set<string>();
    for (const p of placed) {
      for (const k of cellsOf(p)) {
        expect(cells.has(k), `overlap at ${k}`).toBe(false);
        cells.add(k);
      }
    }
  });

  it('packs a contiguous carpet — every tile shares an edge with another', () => {
    const placed = layoutProjects([
      item('big', 'large'),
      ...Array.from({ length: 25 }, (_, i) => item(`p${i}`)),
    ]);
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

  it('leaves no interior gaps in any row (first-fit refills holes)', () => {
    // a large at a row end forces a temporary skip; later 1×1s must fill back in
    const placed = layoutProjects([
      ...Array.from({ length: 5 }, (_, i) => item(`a${i}`)),
      item('big', 'large'),
      ...Array.from({ length: 8 }, (_, i) => item(`b${i}`)),
    ]);
    const rows = new Map<number, number[]>();
    for (const k of placed.flatMap(cellsOf)) {
      const [c, r] = k.split(',').map(Number);
      if (!rows.has(r)) rows.set(r, []);
      rows.get(r)!.push(c);
    }
    let gaps = 0;
    for (const cols of rows.values()) {
      cols.sort((a, b) => a - b);
      for (let i = 1; i < cols.length; i++) if (cols[i] - cols[i - 1] > 1) gaps++;
    }
    expect(gaps).toBe(0);
  });

  it('large tiles occupy a full 2×2 block', () => {
    const placed = layoutProjects([item('big', 'large'), item('a'), item('b')]);
    expect(placed[0].span).toBe(2);
    expect(cellsOf(placed[0])).toHaveLength(4);
  });

  it('concentrates featured larges into one solid centered cluster', () => {
    // stream order must not matter: smalls arriving first cannot squat the centre
    const placed = layoutProjects([
      ...Array.from({ length: 10 }, (_, i) => item(`s${i}`)),
      ...Array.from({ length: 6 }, (_, i) => item(`big${i}`, 'large')),
      ...Array.from({ length: 10 }, (_, i) => item(`t${i}`)),
    ]);
    const bigs = placed.filter((p) => p.span === 2);
    expect(bigs).toHaveLength(6);
    const cells = bigs.flatMap(cellsOf).map((k) => k.split(',').map(Number));
    const minC = Math.min(...cells.map(([c]) => c));
    const maxC = Math.max(...cells.map(([c]) => c));
    const minR = Math.min(...cells.map(([, r]) => r));
    const maxR = Math.max(...cells.map(([, r]) => r));
    // one solid block: the bounding box is exactly filled by the six larges
    expect((maxC - minC + 1) * (maxR - minR + 1)).toBe(24);
    expect(cells).toHaveLength(24);
    // and it sits at the heart of the carpet
    const all = placed.flatMap(cellsOf).map((k) => k.split(',').map(Number));
    const cAll = all.reduce((s, [c]) => s + c, 0) / all.length;
    const rAll = all.reduce((s, [, r]) => s + r, 0) / all.length;
    expect(Math.abs((minC + maxC) / 2 - cAll)).toBeLessThanOrEqual(1);
    expect(Math.abs((minR + maxR) / 2 - rAll)).toBeLessThanOrEqual(1);
  });

  it('grows organically — future films can be appended at any scale, no cap', () => {
    // Adding panes must never require touching the engine: the band widens
    // with the count, rows extend as needed, every tile lands exactly once,
    // and the featured larges stay inside their centred cluster envelope.
    for (const [smalls, larges] of [[10, 3], [23, 3], [34, 6], [54, 6], [92, 8], [200, 12]] as const) {
      const items = [
        ...Array.from({ length: smalls }, (_, i) => item(`s${i}`)),
        ...Array.from({ length: larges }, (_, i) => item(`big${i}`, 'large')),
      ];
      const placed = layoutProjects(items);
      expect(placed, `${smalls}+${larges}: every film placed`).toHaveLength(items.length);

      const cells = new Set<string>();
      for (const p of placed) {
        for (const k of cellsOf(p)) {
          expect(cells.has(k), `overlap at ${k} (${smalls}+${larges})`).toBe(false);
          cells.add(k);
        }
      }

      // the carpet stays a bounded landscape band — growth adds rows, and
      // width never exceeds the derived band (or the cluster envelope)
      const cellCount = smalls + larges * 4;
      const clusterCols = Math.ceil(Math.sqrt(larges));
      const expectedCols = Math.max(2, Math.round(Math.sqrt(cellCount * 1.6)), clusterCols * 2);
      const colsUsed = [...cells].map((k) => Number(k.split(',')[0]));
      expect(Math.max(...colsUsed) - Math.min(...colsUsed) + 1).toBeLessThanOrEqual(expectedCols);

      // larges stay confined to the reserved centre cluster envelope
      const bigCells = placed.filter((p) => p.span === 2).flatMap(cellsOf).map((k) => k.split(',').map(Number));
      const bw = Math.max(...bigCells.map(([c]) => c)) - Math.min(...bigCells.map(([c]) => c)) + 1;
      const bh = Math.max(...bigCells.map(([, r]) => r)) - Math.min(...bigCells.map(([, r]) => r)) + 1;
      const clusterRows = Math.ceil(larges / clusterCols);
      expect(bw, `${smalls}+${larges}: cluster width`).toBeLessThanOrEqual(clusterCols * 2);
      expect(bh, `${smalls}+${larges}: cluster height`).toBeLessThanOrEqual(clusterRows * 2);
    }
  });

  it('honors explicit position overrides and keeps others clear of them', () => {
    const placed = layoutProjects([item('pinned', 'normal', { col: 0, row: 0 }), item('auto')]);
    expect(placed[0]).toEqual({ slug: 'pinned', col: 0, row: 0, span: 1 });
    expect(cellsOf(placed[1])).not.toContain('0,0');
  });
});
