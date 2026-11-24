import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BAY_MACHINES, BOTTOM, COLUMN, COLUMN_MIN, COLUMN_TOUCH_MIN, columnFor, conduitRun, listPointer, listTight, MACHINES_MIN, MARGIN_MIN,
  sideLayout, SPINES, TAGS, TOP,
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

  it('narrows the list for a fine pointer on a laptop\'s plate, never on a wide screen nor on a phone', () => {
    expect(listTight(1440, 'fine')).toBe(true);
    expect(listTight(1728, 'fine')).toBe(true);
    expect(listTight(1791, 'fine')).toBe(true);
    expect(listTight(1792, 'fine')).toBe(false);
    expect(listTight(1920, 'fine')).toBe(false);
    expect(listTight(1366, 'fine')).toBe(false);
    expect(listTight(1440, 'none')).toBe(false); // (a phone's reel: its list stays as it is)
    expect(listTight(390, 'none')).toBe(false);
  });
});

// A TABLET'S LIST (owner, of THE LIST on an iPad: "The film list does not have the animations appear"; and "pls check
// android tablet too"). A touch screen that is not a phone's reel lays the laptop's rule on its own screen: the column
// narrows to leave each margin MACHINES_MIN, down to COLUMN_TOUCH_MIN; a screen too narrow for that (a tablet held
// upright) keeps the plain list.
describe('a tablet\'s list', () => {
  it('reads the pointer once: a fine pointer, a touch screen, or a phone\'s reel', () => {
    expect(listPointer(true, false)).toBe('fine');
    expect(listPointer(false, false)).toBe('touch');
    expect(listPointer(false, true)).toBe('none');
    expect(listPointer(true, true)).toBe('none');
  });

  it('narrows a landscape tablet\'s column to leave the machines their margins, and never an upright one\'s', () => {
    const cases: [number, number][] = [
      [1366, 766], [1280, 680], [1180, 580], [1160, 560], [1159, COLUMN_TOUCH_MIN], [1158, COLUMN], [1024, COLUMN], [800, COLUMN],
      [1440, 840], [1792, 1192], [1920, 1192],
    ];
    for (const [w, c] of cases) expect(columnFor(w, true), `${w}`).toBe(c);
    for (const w of [1024, 1180, 1280, 1366, 1440, 1600, 1920]) expect(columnFor(w, false), `${w}: a fine pointer as it was`).toBe(columnFor(w));
    expect(COLUMN_TOUCH_MIN).toBeLessThan(COLUMN_MIN);
  });

  it('gives a landscape tablet both bays\' machines at full width, none of them over the column or the chrome', () => {
    for (const [W, H] of [[1366, 939], [1366, 1024], [1280, 672], [1280, 800], [1180, 735], [1180, 820], [1160, 700]] as const) {
      const col = columnFor(W, true), c0 = (W - col) / 2, c1 = (W + col) / 2;
      for (const s of ['left', 'right'] as const) {
        const side = sideLayout(W, H, s, true)!;
        expect(side.slots.map((q) => q.key), `${W}×${H} ${s}`).toEqual([...BAY_MACHINES[s]]);
        const boxes = [...side.slots.map((b) => [b.x, b.x + b.w]), ...(side.tag ? [[side.tag.x, side.tag.x + side.tag.w]] : []), [side.spine, side.spine + 14]];
        for (const [a, b] of boxes) expect(b <= c0 || a >= c1, `${W}: ${s} ${a}–${b} against ${c0}–${c1}`).toBe(true);
        for (const b of side.slots) {
          expect(b.w).toBeGreaterThanOrEqual(MACHINES_MIN - 80);
          expect(b.y).toBeGreaterThanOrEqual(TOP);
          expect(b.y + b.h, `${W}×${H}: a machine under the HUD`).toBeLessThanOrEqual(H - BOTTOM);
        }
      }
      expect(conduitRun(sideLayout(W, H, 'left', true)!, sideLayout(W, H, 'right', true)!), `${W}`).not.toBeNull();
    }
  });

  it('leaves an upright tablet\'s list plain, and a fine pointer\'s margins exactly as they were', () => {
    for (const [W, H] of [[1024, 1281], [800, 1152], [1158, 700]] as const) expect(sideLayout(W, H, 'left', true), `${W}`).toBeNull();
    for (const [W, H] of [[1440, 900], [1600, 900], [1920, 1080], [2560, 1440], [1366, 1024]] as const) for (const s of ['left', 'right'] as const) {
      expect(sideLayout(W, H, s, false), `${W}`).toEqual(sideLayout(W, H, s));
    }
  });

  it('narrows a landscape tablet\'s rows, name over details, and never an upright one\'s', () => {
    expect(listTight(1366, 'touch')).toBe(true);
    expect(listTight(1280, 'touch')).toBe(true);
    expect(listTight(1180, 'touch')).toBe(true);
    expect(listTight(1158, 'touch')).toBe(false);
    expect(listTight(1024, 'touch')).toBe(false);
    expect(listTight(800, 'touch')).toBe(false);
    expect(listTight(1920, 'touch')).toBe(false);
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

  it('draws a tablet\'s band and rows from its own floor, after the laptop\'s rules they override', () => {
    const side = Number(/padding: \d+px (\d+)px \d+px;/.exec(rule('.film-list'))![1]), gutter = 36;
    const half = `clamp(${COLUMN_TOUCH_MIN / 2}px, 50% - ${MACHINES_MIN}px, ${COLUMN / 2}px)`;
    expect(rule('html.rvl-list-city.rvl-list-touch .film-list')).toContain(
      `background: linear-gradient(90deg, transparent calc(50% - ${half}), var(--void) calc(50% - ${half}) calc(50% + ${half}), transparent calc(50% + ${half}));`);
    expect(rule('html.rvl-list-touch .fl-group')).toContain(
      `max-width: clamp(${COLUMN_TOUCH_MIN - 2 * gutter}px, 100% - ${2 * MACHINES_MIN + 2 * gutter - 2 * side}px, ${COLUMN - 2 * gutter}px);`);
    // (equal specificity: the touch rules must come after the laptop's)
    expect(css.indexOf('\nhtml.rvl-list-city.rvl-list-touch .film-list {')).toBeGreaterThan(css.indexOf('\nhtml.rvl-list-city.rvl-list-tight .film-list {'));
    expect(css.indexOf('\nhtml.rvl-list-touch .fl-group {')).toBeGreaterThan(css.indexOf('\nhtml.rvl-list-tight .fl-group {'));
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
    expect(page).toContain('const pointer = listPointer(finePointer(), reelOn);');
    expect(page).toContain('const on = listTight(window.innerWidth / posterZoom(), pointer);');
    expect(page).toContain(".toggle('rvl-list-touch', on && pointer === 'touch');");
    expect(deco).toContain('const plateW = window.innerWidth / Z'); // (the same plate the deco lays its margins on)
    expect(deco, 'the deco never sets the layout: one device, one layout, whatever the tier').not.toContain('rvl-list-tight');
    expect(deco).not.toContain('rvl-list-touch');
    // the deco reads the pointer as the page does, and lays its margins on the same column
    expect(deco).toContain('const pointer = listPointer(finePointer(), window.matchMedia(REEL_QUERY).matches), touch = pointer === \'touch\';');
    expect(deco).toContain('columnFor(plateW, touch)');
    expect(deco).toContain("sideLayout(plateW, plateH, 'left', touch)");
    expect(deco).toContain("sideLayout(plateW, plateH, 'right', touch)");
  });
});

// THE MACHINES AT EVERY TIER (owner, 2026-11-24, from a questionnaire: "Animate them anyway"): the lightest tier no
// longer hides or stills them; CALM still stills them, and a failed load or a lost context still hides them. The city
// keeps LITE's still.
describe('the list\'s machines at every tier (pins)', () => {
  const deco = readFileSync('src/works/list-deco.ts', 'utf8').replace(/\r\n/g, '\n');

  it('loads, shows and moves the machines whatever the tier', () => {
    expect(deco).toContain('gl.hidden = !slots.length || machinesOff;');
    expect(deco).toContain('if (slots.length && !machinesOff) ensureMachines();');
    expect(deco).toContain('const still = () => reducedMotion();');
    expect(deco).not.toMatch(/gl\.hidden = [^;]*lite\(\)/);
  });

  it('keeps CALM still, the city still at LITE, and a failed or lost machine hidden', () => {
    expect(deco).toContain('const f = still() ? 60 : frameAt(');
    expect(deco).toContain('const cityStill = () => still() || lite();');
    expect(deco).toContain('if (!machines) { machinesOff = true; gl.hidden = true; return; }');
    expect(deco).toContain("gl.addEventListener('webglcontextlost', () => { machines = null; machinesOff = true; gl.hidden = true; });");
    expect(deco).toContain('.catch(() => { loading = false; machinesOff = true; gl.hidden = true; });');
    expect(deco).toContain("const built = !!l && !!r && !!cctx && pointer !== 'none';"); // (a phone's reel builds none)
  });
});
