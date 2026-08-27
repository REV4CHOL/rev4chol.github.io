import { describe, expect, it } from 'vitest';
import { isStreet, layoutProjects } from '../src/works/layout';

const item = (slug: string, tileSize: 'normal' | 'large' = 'normal', position: { col: number; row: number } | null = null) =>
  ({ slug, tileSize, position });

describe('isStreet', () => {
  it('marks every third column and row, including negatives', () => {
    expect(isStreet(2, 0)).toBe(true);
    expect(isStreet(0, 2)).toBe(true);
    expect(isStreet(-1, 0)).toBe(true); // -1 mod 3 === 2
    expect(isStreet(0, 0)).toBe(false);
    expect(isStreet(1, 1)).toBe(false);
    expect(isStreet(3, 4)).toBe(false);
  });
});

describe('layoutProjects', () => {
  it('is deterministic and starts at the origin', () => {
    const a = layoutProjects([item('a'), item('b'), item('c')]);
    const b = layoutProjects([item('a'), item('b'), item('c')]);
    expect(a).toEqual(b);
    expect(a[0]).toEqual({ slug: 'a', col: 0, row: 0, span: 1 });
  });

  it('skips street cells', () => {
    const placed = layoutProjects(Array.from({ length: 12 }, (_, i) => item(`p${i}`)));
    for (const p of placed) {
      expect(isStreet(p.col, p.row), `${p.slug} at ${p.col},${p.row}`).toBe(false);
    }
  });

  it('never overlaps tiles, including large spans', () => {
    const placed = layoutProjects([item('big', 'large'), ...Array.from({ length: 11 }, (_, i) => item(`p${i}`))]);
    const cells = new Set<string>();
    for (const p of placed) {
      for (let dc = 0; dc < p.span; dc++) {
        for (let dr = 0; dr < p.span; dr++) {
          const k = `${p.col + dc},${p.row + dr}`;
          expect(cells.has(k), `overlap at ${k}`).toBe(false);
          cells.add(k);
        }
      }
    }
  });

  it('large tiles occupy a full 2x2 non-street block', () => {
    const [big] = layoutProjects([item('big', 'large')]);
    expect(big.span).toBe(2);
    for (let dc = 0; dc < 2; dc++)
      for (let dr = 0; dr < 2; dr++)
        expect(isStreet(big.col + dc, big.row + dr)).toBe(false);
  });

  it('honors explicit position overrides and keeps others clear of them', () => {
    const placed = layoutProjects([item('pinned', 'normal', { col: 4, row: 4 }), item('auto')]);
    expect(placed[0]).toEqual({ slug: 'pinned', col: 4, row: 4, span: 1 });
    expect(placed[1].col === 4 && placed[1].row === 4).toBe(false);
  });
});
