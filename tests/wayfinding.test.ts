import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { doorFromVoidClick } from '../src/home/door';
import { cursorLabelFor } from '../src/shell/cursor';
import { paneToWake } from '../src/works/hover';

/** A stand-in for an event target: `ancestors` lists what it and its parents match ('a', '#statement', 'canvas',
 *  '[data-cursor]'); `closest(sel)` answers for any comma-separated token, as the DOM would. */
const target = (ancestors: string[], dataset: Record<string, string> = {}) => ({
  closest: (sel: string) => {
    const tokens = sel.split(',').map((s) => s.trim());
    return ancestors.some((a) => tokens.includes(a)) ? { dataset } : null;
  },
});

describe('the homepage footage is a door (testers clicked the picture and got a glitch)', () => {
  it('a clean click on the footage goes to WORK', () => {
    expect(doorFromVoidClick(target([]), 0)).toBe(true);
    expect(doorFromVoidClick(target(['p']), 8)).toBe(true);
    expect(doorFromVoidClick(undefined, 0)).toBe(true); // a target with no closest (the document) is the footage
  });

  it('a drag is not a click', () => {
    expect(doorFromVoidClick(target([]), 9)).toBe(false);
  });

  it("links, buttons and the poster's words keep their own jobs", () => {
    expect(doorFromVoidClick(target(['a']), 0)).toBe(false);
    expect(doorFromVoidClick(target(['button']), 0)).toBe(false);
    expect(doorFromVoidClick(target(['span', '#statement']), 0)).toBe(false); // DREAMS bursts, it does not leave
  });
});

describe("the cursor's label (ENTER ▸ never showed on the first pane hovered; SWITCH ▸ stuck over the floor)", () => {
  it("a canvas keeps a label its own code wrote: the DOM listener stands aside", () => {
    expect(cursorLabelFor(target(['canvas']), false)).toBeUndefined();
  });

  it("…but a label the page's chrome left does not ride out onto a canvas (owner: \"that Switch still stick\")", () => {
    expect(cursorLabelFor(target(['canvas']), true)).toBeNull();
  });

  it('a labelled ancestor names the label; nothing labelled clears it — whoever wrote the last one', () => {
    for (const chromeWrote of [false, true]) {
      expect(cursorLabelFor(target(['[data-cursor]'], { cursor: 'SEND ▸' }), chromeWrote)).toBe('SEND ▸');
      expect(cursorLabelFor(target(['[data-cursor]'], { cursor: '' }), chromeWrote)).toBeNull();
      expect(cursorLabelFor(target(['div']), chromeWrote)).toBeNull();
    }
  });
});

describe('the pane under the pointer is the one awake (a pane crossed in one quick move stayed awake)', () => {
  it('a pane on the floor wakes; another pane takes over; bare floor puts the awake one to sleep', () => {
    expect(paneToWake('halide', true, null, false)).toBe('halide');
    expect(paneToWake('mistchild', true, 'halide', false)).toBe('mistchild');
    expect(paneToWake(null, true, 'halide', false)).toBeNull();
    expect(paneToWake(null, true, null, false)).toBeNull();
  });

  it("the page's chrome never keeps a pane awake — not even the one lying under it", () => {
    expect(paneToWake('halide', false, 'halide', false)).toBeNull();
    expect(paneToWake('halide', false, null, false)).toBeNull();
  });

  it('a drag wakes nothing and lets the awake pane go — but keeps the one moving along under the pointer', () => {
    expect(paneToWake('mistchild', true, null, true)).toBeNull();
    expect(paneToWake('mistchild', true, 'halide', true)).toBeNull();
    expect(paneToWake('halide', true, 'halide', true)).toBe('halide');
  });

  it("the floor asks on every move, not through the panes' own pointerover/pointerout (their path went stale)", () => {
    const src = readFileSync('src/works/world.ts', 'utf8');
    expect(src).not.toContain("tile.on('pointerover'");
    expect(src).not.toContain("tile.on('pointerout'");
  });
});

describe('the signposts are wired (pins)', () => {
  const pins: Array<[string, string]> = [
    ['index.html', 'id="home-door"'],
    ['index.html', 'class="home-cta-row"'],
    // the door (owner, 2026-09-28: "ENTER MY WORK" → "ENTER" only; the arrow is the house's button arrow, as on WATCH ▸)
    ['index.html', 'href="/works.html" data-internal data-cursor="ENTER ▸">ENTER ▸</a>'],
    ['src/pages/index.ts', 'doorFromVoidClick('],
    ['src/pages/index.ts', 'leaveTo('],
    ['src/styles/components.css', '.home-door {'],
    ['works.html', '<p class="floor-hint micro" id="floor-hint"></p>'],
    ['src/pages/works.ts', 'legendText('],
    ['src/pages/works.ts', 'floorOpened('],
    // PLAIN WORDS (owner, 2026-09-28: "still unclear … imagine a not so tech-savvy person"): every instruction is a
    // sentence a stranger can follow; the arrows stay on buttons and links, where an arrow reads as an arrow
    ['src/pages/works.ts', "dataset.cursor = 'SWITCH CHAPTER ▸'"],
    ['src/works/world.ts', "setCursorLabel('OPEN ▸')"],
    ['src/works/world.ts', 'captionMeta('],
    ['src/works/world.ts', 'openingFrame('],
    ['src/works/world.ts', 'markFloorOpened('],
    ['src/works/tile.ts', "text: 'PLACEHOLDER'"],
    ['src/shell/cursor.ts', 'cursorLabelFor(e.target as Element, chromeWrote)'],
    // only the floor itself wakes a pane — never one lying under a tab, a nav link or a HUD button
    ['src/works/world.ts', 'document.elementFromPoint(e.clientX, e.clientY) === app.canvas'],
    // …decided on every pointer move from what is under the pointer; and leaving the canvas puts the pane to sleep
    ['src/works/world.ts', "app.stage.on('globalpointermove', (e) => {"],
    ['src/works/world.ts', 'paneToWake(hit, onFloor, w.hoveredSlug, w.pan.dragging)'],
    ['src/works/world.ts', "app.canvas.addEventListener('pointerleave', () => { if (finePointer()) w.unhover(); });"],
    // an open gap (owner: "remove the pane where MISTCHILD once stood") keeps its place and draws nothing — but it is
    // measured, so the carpet keeps its footprint and the furniture ringing it stays put (the corner is an extreme)
    ['src/works/world.ts', 'if (it.gap) { w.gaps.push(pane); continue; }'],
    ['src/works/world.ts', 'for (const t of [...w.panes(), ...w.gaps]) {'],
    ['src/styles/components.css', '.floor-hint {'],
    ['src/styles/components.css', '.floor-hint.is-fresh'],
    ['src/styles/components.css', '.ch-switch button:not(.is-on) .ch-name'],
    ['src/styles/components.css', '.nav-links a { font-size: 0.7rem; padding: 13px 0; }'],
    ['src/pages/project.ts', '◂ BACK TO ALL FILMS'],
    ['src/pages/project.ts', 'data-cursor="BACK ◂"'],
    ['src/pages/project.ts', 'NEXT FILM ▸ ${'],
    ['src/pages/project.ts', 'BACK TO ALL FILMS ▸'],
    ['src/pages/project.ts', 'PLACEHOLDER ▪ NO FILM HERE YET'],
    ['src/pages/project.ts', "watch.title = 'FILM LINK COMING SOON'"],
    // a film kept off the public web says so where WATCH would stand (owner 2026-09-28, MIEN VIEN)
    ['src/pages/project.ts', "note.textContent = 'PRIVATE FILM ▪ NOT AVAILABLE TO WATCH ONLINE'"],
    ['src/styles/project.css', '.p-placeholder, .p-private {'],
    ['src/styles/project.css', '.p-private { grid-column: 1; grid-row: 2; justify-self: start; }'], // where WATCH stands
    ['src/pages/project.ts', "isPlaceholder(p) ? 'PLACEHOLDER' : 'ONLINE'"],
    ['src/styles/project.css', '.p-placeholder'],
    ['src/pages/story.ts', "'AUTOPILOT IS ON ▪ PRESS FREE TO FLY THE CITY YOURSELF'"],
    ['src/pages/story.ts', "'DRAG TO LOOK AROUND ▪ STICK TO MOVE ▪ ▲ ▼ TO RISE / SINK'"],
    ['story.html', 'DRAG TO LOOK AROUND ▪ W A S D TO MOVE ▪ E / Q TO RISE / SINK ▪ SHIFT TO GO FASTER ▪ T TO CHANGE THE TIME OF DAY'],
    ['src/lib/swipe-nav.ts', "kicker.textContent = 'SCROLL DOWN ▾'"],
    ['src/lib/swipe-nav.ts', "'NEXT PAGE ▸' : '◂ PREVIOUS PAGE'"],
    ['src/pages/contact.ts', "copy.textContent = 'COPY EMAIL'"],
    ['contact.html', '>COPY EMAIL</button>'],
    ['src/shell/hud.ts', 'SFX ${'],
    ['src/shell/hud.ts', 'MUSIC ${'],
    ['src/shell/hud.ts', 'MOTION ${'],
  ];
  for (const [file, needle] of pins) {
    it(`${file} carries ${needle}`, () => {
      expect(readFileSync(file, 'utf8')).toContain(needle);
    });
  }

  it('the button says ENTER and nothing else — no "MY WORK", no film count (owner)', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).not.toMatch(/\d+ FILMS/);
    expect(html).not.toContain('ENTER MY WORK');
  });

  it("no instruction speaks the house's code any more (the old pairs, the house nouns, the abbreviations)", () => {
    const gone: Array<[string, string[]]> = [
      ['src/works/legend.ts', ['▸ ROAM', '▸ ZOOM', '▸ PREVIEW', '▸ OPEN', '▸ SELECT', 'PLACEHOLDER ▪']],
      ['src/works/world.ts', ["setCursorLabel('ENTER ▸')"]],
      ['src/pages/works.ts', ["'SWITCH ▸'"]],
      ['src/pages/story.ts', ['▸ LOOK', '▸ MOVE', '▸ BOOST', '▸ TIME', 'THE CITY DRIVES', 'YOU FLY']],
      ['story.html', ['▸ LOOK', '▸ MOVE', '▸ BOOST', '▸ TIME']],
      ['src/pages/project.ts', ['THE FLOOR', 'PLACEHOLDER PANE', 'TRANSMISSION PENDING', 'FLOOR ◂']],
      ['src/lib/swipe-nav.ts', ['TUNING ▸']],
      ['src/pages/contact.ts', ['COPY FREQ']],
      ['contact.html', ['COPY FREQ']],
      ['src/shell/hud.ts', ['MUS ${', 'MTN ${']],
    ];
    for (const [file, needles] of gone) {
      const src = readFileSync(file, 'utf8');
      for (const n of needles) expect(src, `${file} still says ${n}`).not.toContain(n);
    }
  });

  it('the legends are readable: 12 px at 70 % bone on the floor, 12 px on the city', () => {
    // the top-level rules start their line; the phone overrides inside @media are indented
    const rule = (css: string, sel: string) => { const at = css.indexOf(`\n${sel} {`); return css.slice(at, css.indexOf('}', at)); };
    const hint = rule(readFileSync('src/styles/components.css', 'utf8'), '.floor-hint');
    expect(hint).toContain('font-size: calc(var(--t-xs) * var(--uiz))');
    expect(hint).toContain('color-mix(in srgb, var(--bone) 70%, transparent)');
    const a3 = rule(readFileSync('src/styles/story.css', 'utf8'), '.a3-hint');
    expect(a3).toContain('font-size: var(--t-xs)');
  });

  it("the door row is not hidden from thumbs, and only the statement's words intercept a click", () => {
    const css = readFileSync('src/styles/components.css', 'utf8');
    expect(css).not.toContain('.page-home .home-cta-row { display: none; }');
    expect(css).toContain('.home-statement { pointer-events: none; }');
    expect(css).toContain('.home-statement [data-glitch] { pointer-events: auto; }');
  });
});
