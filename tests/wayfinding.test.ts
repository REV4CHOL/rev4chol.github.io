import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { doorFromVoidClick } from '../src/home/door';
import { cursorLabelFor } from '../src/shell/cursor';

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

describe('the signposts are wired (pins)', () => {
  const pins: Array<[string, string]> = [
    ['index.html', 'id="home-door"'],
    ['index.html', 'class="home-cta-row"'],
    ['index.html', 'href="/works.html" data-internal data-cursor="ENTER ▸">ENTER MY WORK ▸</a>'],
    ['src/pages/index.ts', 'doorFromVoidClick('],
    ['src/pages/index.ts', 'leaveTo('],
    ['src/styles/components.css', '.home-door {'],
    ['works.html', '<p class="floor-hint micro" id="floor-hint"></p>'],
    ['src/pages/works.ts', 'legendText('],
    ['src/pages/works.ts', 'floorOpened('],
    ['src/pages/works.ts', "dataset.cursor = 'SWITCH ▸'"],
    ['src/works/world.ts', 'captionMeta('],
    ['src/works/world.ts', 'openingFrame('],
    ['src/works/world.ts', 'markFloorOpened('],
    ['src/works/tile.ts', "text: 'PLACEHOLDER'"],
    ['src/shell/cursor.ts', 'cursorLabelFor(e.target as Element, chromeWrote)'],
    // only the floor itself wakes a pane — never one lying under a tab, a nav link or a HUD button
    ['src/works/world.ts', 'document.elementFromPoint(e.clientX, e.clientY) === app.canvas'],
    // an open gap (owner: "remove the pane where MISTCHILD once stood") keeps its place and draws nothing — but it is
    // measured, so the carpet keeps its footprint and the furniture ringing it stays put (the corner is an extreme)
    ['src/works/world.ts', 'if (it.gap) { w.gaps.push(pane); continue; }'],
    ['src/works/world.ts', 'for (const t of [...w.panes(), ...w.gaps]) {'],
    ['src/styles/components.css', '.floor-hint {'],
    ['src/styles/components.css', '.floor-hint.is-fresh'],
    ['src/styles/components.css', '.ch-switch button:not(.is-on) .ch-name'],
    ['src/styles/components.css', '.nav-links a { font-size: 0.7rem; padding: 13px 0; }'],
    ['src/pages/project.ts', '◂ BACK TO THE FLOOR'],
    ['src/pages/project.ts', 'NEXT ▸ ${'],
    ['src/pages/project.ts', 'PLACEHOLDER PANE ▪ NO FILM HERE YET'],
    ['src/pages/project.ts', "isPlaceholder(p) ? 'PLACEHOLDER' : 'ONLINE'"],
    ['src/styles/project.css', '.p-placeholder'],
    ['src/pages/story.ts', 'AUTO ▸ THE CITY DRIVES ▪ FREE ▸ YOU FLY'],
  ];
  for (const [file, needle] of pins) {
    it(`${file} carries ${needle}`, () => {
      expect(readFileSync(file, 'utf8')).toContain(needle);
    });
  }

  it('the button says ENTER MY WORK and nothing about a film count (owner)', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).not.toMatch(/\d+ FILMS/);
  });

  it("the door row is not hidden from thumbs, and only the statement's words intercept a click", () => {
    const css = readFileSync('src/styles/components.css', 'utf8');
    expect(css).not.toContain('.page-home .home-cta-row { display: none; }');
    expect(css).toContain('.home-statement { pointer-events: none; }');
    expect(css).toContain('.home-statement [data-glitch] { pointer-events: auto; }');
  });
});
