import { describe, expect, it } from 'vitest';
import { BAY_MACHINES, BOTTOM, COLUMN, conduitRun, MACHINES_MIN, MARGIN_MIN, sideLayout, SPINES, TAGS, TOP } from '../src/works/list-art';
import { CALLOUTS } from '../src/works/machines';

// THE LIST's margins (owner, 2026-10-13: "decoration art filling up the two sides' negative space" — "keep all the
// projects all perfectly readable in the middle"): nothing ever stands in the reading column.
describe('the list\'s margins', () => {
  const screens = [[1440, 900], [1920, 1080], [2560, 1440], [3440, 1440], [1920, 760]] as const;

  it('never cross into the reading column, on either side, at any screen', () => {
    for (const [W, H] of screens) for (const s of ['left', 'right'] as const) {
      const side = sideLayout(W, H, s)!;
      const col: [number, number] = [(W - COLUMN) / 2, (W + COLUMN) / 2];
      const boxes = [
        ...side.slots.map((b) => [b.x, b.x + b.w]), ...(side.tag ? [[side.tag.x, side.tag.x + side.tag.w]] : []),
        [side.spine, side.spine + 14], ...(side.labels ? [side.labels] : []),
      ];
      for (const [a, b] of boxes) expect(b <= col[0] || a >= col[1], `${W}: ${s} ${a}–${b} against ${col}`).toBe(true);
      for (const b of side.slots) {
        expect(b.y).toBeGreaterThanOrEqual(TOP);
        expect(b.y + b.h, `${W}×${H}: a machine under the HUD`).toBeLessThanOrEqual(H - BOTTOM);
      }
    }
  });

  it('leaves a phone\'s and a tablet\'s list plain, a narrow margin its hardware alone, a wide one its machines and callouts', () => {
    expect(sideLayout(390, 844, 'left')).toBeNull();
    expect(sideLayout(1024, 768, 'right')).toBeNull();
    expect(sideLayout(COLUMN + 2 * (MARGIN_MIN - 1), 900, 'left')).toBeNull();
    const narrow = sideLayout(1440, 900, 'left')!;
    expect(narrow.slots).toEqual([]);
    expect(narrow.labels).toBeNull();
    expect(sideLayout(COLUMN + 2 * (MACHINES_MIN - 1), 1080, 'right')!.slots).toEqual([]);
    const mid = sideLayout(1920, 1080, 'right')!;
    expect(mid.slots.map((s) => s.key)).toEqual([...BAY_MACHINES.right]);
    expect(mid.labels, 'at 1,920 the machines take the whole margin').toBeNull();
    const wide = sideLayout(2560, 1440, 'left')!;
    expect(wide.slots.map((s) => s.key)).toEqual([...BAY_MACHINES.left]);
    expect(wide.labels).not.toBeNull();
  });

  it('keeps the machines to the column\'s side, the upper one the taller, the callouts outside them', () => {
    for (const s of ['left', 'right'] as const) {
      const side = sideLayout(2560, 1440, s)!;
      const [a, b] = side.slots;
      expect(a.h).toBeGreaterThan(b.h);
      expect(a.y + a.h).toBeLessThanOrEqual(b.y);
      const [l0, l1] = side.labels!;
      expect(l1 <= a.x || l0 >= a.x + a.w, 'the labels beside the machines, not over them').toBe(true);
      expect(s === 'left' ? l1 <= a.x : l0 >= a.x + a.w, 'on the outer side').toBe(true);
    }
  });

  it('runs the conduit from bay to bay, below their machines, behind the list between them', () => {
    const l = sideLayout(2560, 1440, 'left')!, r = sideLayout(2560, 1440, 'right')!;
    const c = conduitRun(l, r)!;
    expect(c.x0).toBeLessThan((2560 - COLUMN) / 2);
    expect(c.x1).toBeGreaterThan((2560 + COLUMN) / 2);
    expect(c.y).toBeGreaterThanOrEqual(l.slots[1].y + l.slots[1].h);
    expect(c.y).toBeLessThanOrEqual(1440 - BOTTOM);
    expect(conduitRun(sideLayout(1440, 900, 'left')!, sideLayout(1440, 900, 'right')!)).toBeNull();
  });

  it('names no AI tool anywhere (owner, 2026-10-13: "no AI tools. Colorist, filmmaking tools, computer tools in general is okay")', () => {
    const words = [...Object.values(TAGS), ...Object.values(SPINES), ...Object.values(CALLOUTS).flat()].join(' ');
    expect(words).not.toMatch(/\b(AI|GEN|DIFFUSION|PROMPT|SAMPLE|SAMPLER|UPSCALE|NEURAL|MODEL|LATENT|INFER)\b/);
  });
});
