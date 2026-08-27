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

  it('honors explicit position overrides and keeps others clear of them', () => {
    const placed = layoutProjects([item('pinned', 'normal', { col: 0, row: 0 }), item('auto')]);
    expect(placed[0]).toEqual({ slug: 'pinned', col: 0, row: 0, span: 1 });
    expect(cellsOf(placed[1])).not.toContain('0,0');
  });
});
