import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BAY_MACHINES, BOTTOM, COLUMN, COLUMN_MIN, columnFor, conduitRun, listTight, MACHINES_MIN, MARGIN_MIN, sideLayout, SPINES, TAGS,
  TOP,
} from '../src/works/list-art';
import { CALLOUTS } from '../src/works/machines';

// THE LIST's margins (owner, 2026-10-13: "decoration art filling up the two sides' negative space" — "keep all the
// projects all perfectly readable in the middle"): nothing ever stands in the reading column.
describe('the list\'s margins', () => {
  const screens = [[1440, 900], [1470, 956], [1536, 864], [1728, 1117], [1920, 1080], [2560, 1440], [3440, 1440], [1920, 760]] as const;

  it('never cross into the reading column, on either side, at any screen', () => {
    for (const [W, H] of screens) for (const s of ['left', 'right'] as const) {
      const side = sideLayout(W, H, s)!;
      const col: [number, number] = [(W - columnFor(W)) / 2, (W + columnFor(W)) / 2];
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
    expect(sideLayout(1180, 820, 'right')).toBeNull();
    expect(sideLayout(1366, 1024, 'left')!.slots, 'a plate under a laptop\'s keeps the full column: hardware alone').toEqual([]);
    expect(sideLayout(COLUMN + 2 * (MARGIN_MIN - 1), 900, 'left')).toBeNull();
    const narrow = sideLayout(1438, 900, 'left')!;
    expect(narrow.slots).toEqual([]);
    expect(narrow.labels).toBeNull();
    const laptop = sideLayout(1440, 900, 'left')!; // (2026-11-24: the column narrows on a laptop, the machines come in)
    expect(laptop.slots.map((s) => s.key)).toEqual([...BAY_MACHINES.left]);
    expect(laptop.labels).toBeNull();
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
    const k = conduitRun(sideLayout(1440, 900, 'left')!, sideLayout(1440, 900, 'right')!)!; // (a laptop's, under its column)
    expect(k.x0).toBeLessThan((1440 - columnFor(1440)) / 2);
    expect(k.x1).toBeGreaterThan((1440 + columnFor(1440)) / 2);
    expect(conduitRun(sideLayout(1438, 900, 'left')!, sideLayout(1438, 900, 'right')!)).toBeNull();
  });

  it('names no AI tool anywhere (owner, 2026-10-13: "no AI tools. Colorist, filmmaking tools, computer tools in general is okay")', () => {
    const words = [...Object.values(TAGS), ...Object.values(SPINES), ...Object.values(CALLOUTS).flat()].join(' ');
    expect(words).not.toMatch(/\b(AI|GEN|DIFFUSION|PROMPT|SAMPLE|SAMPLER|UPSCALE|NEURAL|MODEL|LATENT|INFER)\b/);
  });
});

// A LAPTOP'S LIST (owner, 2026-11-24: "When I bring on this list in the Macbook laptops, windows laptops etc., the
// animation on the two left and right sides is not showing up"; the owner's choice, B: the column narrows, a row stands
// its name over its details, and the machines come in at full size). Screens 1,920 and wider stay exactly as they were.
describe('a laptop\'s list', () => {
  it('narrows the column on a laptop\'s plate just enough for the machines, and never on a wide screen', () => {
    const cases: [number, number][] = [
      [1440, 840], [1439.99, COLUMN_MIN], [1470, 870], [1512, 912], [1536, 936], [1728, 1128], [1791, 1191], [1792, 1192],
      [1920, 1192], [2560, 1192],
    ];
    for (const [w, c] of cases) expect(columnFor(w), `${w}`).toBe(c);
    expect(COLUMN_MIN + 2 * MACHINES_MIN).toBe(1440); // (the narrowest laptop's plate: the poster lock's floor)
    expect(columnFor(1438), 'under a laptop\'s plate, the column as it was').toBe(COLUMN);
  });

  it('gives a zoomed plate of 1,439.99 its machines (the margin rounded, not floored)', () => {
    for (const s of ['left', 'right'] as const) {
      const side = sideLayout(1439.99, 900, s)!;
      expect(side.slots.map((q) => q.key)).toEqual([...BAY_MACHINES[s]]);
    }
  });

  it('keeps the wide screens\' margins exactly as they were (read off the code of 2026-10-13)', () => {
    const was = {
      '1920x1080': [
        { side: 'left', span: [0, 364], spine: 12, tag: { x: 108, y: 168, w: 220 }, slots: [{ key: 'orrery', x: 44, y: 228, w: 284, h: 416 }, { key: 'lut', x: 44, y: 644, w: 284, h: 340 }], labels: null },
        { side: 'right', span: [1556, 1920], spine: 1894, tag: { x: 1592, y: 168, w: 220 }, slots: [{ key: 'totem', x: 1592, y: 228, w: 284, h: 416 }, { key: 'flatbed', x: 1592, y: 644, w: 284, h: 340 }], labels: null },
      ],
      '2000x1131': [
        { side: 'left', span: [0, 404], spine: 12, tag: { x: 148, y: 168, w: 220 }, slots: [{ key: 'orrery', x: 44, y: 228, w: 324, h: 444 }, { key: 'lut', x: 44, y: 672, w: 324, h: 363 }], labels: null },
        { side: 'right', span: [1596, 2000], spine: 1974, tag: { x: 1632, y: 168, w: 220 }, slots: [{ key: 'totem', x: 1632, y: 228, w: 324, h: 444 }, { key: 'flatbed', x: 1632, y: 672, w: 324, h: 363 }], labels: null },
      ],
      '2560x1440': [
        { side: 'left', span: [0, 684], spine: 12, tag: { x: 428, y: 168, w: 220 }, slots: [{ key: 'orrery', x: 236, y: 228, w: 412, h: 614 }, { key: 'lut', x: 236, y: 842, w: 412, h: 502 }], labels: [44, 220] },
        { side: 'right', span: [1876, 2560], spine: 2534, tag: { x: 1912, y: 168, w: 220 }, slots: [{ key: 'totem', x: 1912, y: 228, w: 412, h: 614 }, { key: 'flatbed', x: 1912, y: 842, w: 412, h: 502 }], labels: [2340, 2516] },
      ],
    };
    for (const [k, [l, r]] of Object.entries(was)) {
      const [w, h] = k.split('x').map(Number);
      expect(sideLayout(w, h, 'left'), k).toEqual(l);
      expect(sideLayout(w, h, 'right'), k).toEqual(r);
    }
  });

  it('gives every laptop\'s plate, 1,440 to 1,791, both bays\' machines, none of them over the narrowed column', () => {
    for (let w = 1440; w <= 1791; w += 0.5) for (const h of [720, 900, 1117]) {
      const col = columnFor(w), c0 = (w - col) / 2, c1 = (w + col) / 2;
      for (const s of ['left', 'right'] as const) {
        const side = sideLayout(w, h, s)!;
        expect(side.slots.map((q) => q.key), `${w}×${h} ${s}`).toEqual([...BAY_MACHINES[s]]);
        const boxes = [...side.slots.map((b) => [b.x, b.x + b.w]), ...(side.tag ? [[side.tag.x, side.tag.x + side.tag.w]] : [])];
        for (const [a, b] of boxes) expect(b <= c0 || a >= c1, `${w}: ${s} ${a}–${b} against ${c0}–${c1}`).toBe(true);
        for (const b of side.slots) expect(b.w, 'a machine at full size: the margin\'s whole room').toBeGreaterThanOrEqual(MACHINES_MIN - 80);
      }
    }
  });

  it('narrows the list only for a fine pointer on a laptop\'s plate: never a touch screen, never a wide screen', () => {
    expect(listTight(1440, true)).toBe(true);
    expect(listTight(1728, true)).toBe(true);
    expect(listTight(1791, true)).toBe(true);
    expect(listTight(1792, true)).toBe(false);
    expect(listTight(1920, true)).toBe(false);
    expect(listTight(1440, false)).toBe(false); // (a touch screen builds no city: its list stays as it is)
    expect(listTight(1180, false)).toBe(false);
    expect(listTight(1366, true)).toBe(false);
  });
});

// The three places that hold the column's numbers: works/list-art.ts, components.css, and the page that sets the class
// before the list is first drawn. Read with their line ends normalised: the pins hold on any checkout.
describe('the narrowed column, in its three places', () => {
  const read = (f: string) => readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  const css = read('src/styles/components.css');
  const rule = (sel: string) => {
    const i = css.indexOf(`\n${sel} {`);
    expect(i, sel).toBeGreaterThan(-1);
    return css.slice(i + sel.length + 3, css.indexOf('}', i));
  };

  it('draws the black band and the rows from the same numbers as the margins', () => {
    const pad = /padding: \d+px (\d+)px \d+px;/.exec(rule('.film-list'))!;
    const side = Number(pad[1]); // the sheet's own padding a side
    const rows = Number(/max-width: (\d+)px;/.exec(rule('.fl-group'))![1]);
    const gutter = (COLUMN - rows) / 2; // the 36 a side between the rows and the column's edge
    expect(gutter).toBe(36);
    const band = rule('html.rvl-list-city.rvl-list-tight .film-list');
    const half = `clamp(${COLUMN_MIN / 2}px, 50% - ${MACHINES_MIN}px, ${COLUMN / 2}px)`;
    expect(band).toContain(`background: linear-gradient(90deg, transparent calc(50% - ${half}), var(--void) calc(50% - ${half}) calc(50% + ${half}), transparent calc(50% + ${half}));`);
    expect(rule('html.rvl-list-tight .fl-group')).toContain(
      `max-width: clamp(${COLUMN_MIN - 2 * gutter}px, 100% - ${2 * MACHINES_MIN + 2 * gutter - 2 * side}px, ${COLUMN - 2 * gutter}px);`);
  });

  it('stands a row\'s name over its details, the thumbnail and OPEN beside them both', () => {
    const row = rule('html.rvl-list-tight .fl-row');
    expect(row).toContain("grid-template-areas: 'thumb title open' 'thumb meta open';");
    expect(row).toContain('grid-template-columns: 128px minmax(0, 1fr) auto;');
    expect(rule('html.rvl-list-tight .fl-title')).toContain('grid-area: title;');
    expect(rule('html.rvl-list-tight .fl-meta')).toContain('grid-area: meta;');
    expect(rule('html.rvl-list-tight .fl-thumb')).toContain('grid-area: thumb;');
    expect(rule('html.rvl-list-tight .fl-open')).toContain('grid-area: open;');
  });

  it('sets the class with the poster lock, before the list is first drawn, and lets no tier move it', () => {
    const page = read('src/pages/works.ts'), deco = read('src/works/list-deco.ts');
    const lock = page.indexOf("armPosterLock({ exempt: '#floor' });"), set = page.indexOf(".toggle('rvl-list-tight'");
    expect(lock).toBeGreaterThan(-1);
    expect(set).toBeGreaterThan(lock);
    expect(set, 'before the first await: the list never draws wide first').toBeLessThan(page.indexOf('await loadProjects()'));
    expect(page).toContain('listTight(window.innerWidth / posterZoom(), !reelOn && finePointer())');
    expect(deco).toContain('const plateW = window.innerWidth / Z'); // (the same plate the deco lays its margins on)
    expect(deco, 'the deco never sets the layout: one device, one layout, whatever the tier').not.toContain('rvl-list-tight');
    expect(deco).toContain('columnFor(plateW)');
  });
});
