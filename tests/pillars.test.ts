import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as pillars from '../src/project/pillars';
import { stillParts } from '../src/project/pillars';
import { cardSize, hoverFit } from '../src/works/constants';
import { posterWidthFor } from '../src/works/poster';
import { spineFit } from '../src/works/spine';

// The owner, 2026-09-28 (GALAXY Z FOLD 8 ULTRA, the first vertical film): "whenever I bring you vertical footage, you
// gonna make a special vertical pane, and also design vertical stills for all vertical projects" — and its stills
// "include them all, with left pillar being ad #1, and right pillar being ad #2".

describe('stills in pillars: a part-named still belongs to its part', () => {
  const u = (n: string) => `/content/projects/g/stills/${n}`;

  it('part-named stills group by their N- prefix, in part order, each part in file order', () => {
    const urls = ['1-01.jpg', '1-02.jpg', '2-01.jpg', '2-02.jpg', '2-10.jpg'].map(u);
    expect(stillParts(urls)).toEqual([
      { part: 1, urls: [u('1-01.jpg'), u('1-02.jpg')] },
      { part: 2, urls: [u('2-01.jpg'), u('2-02.jpg'), u('2-10.jpg')] },
    ]);
  });

  it('plain numbered stills are one part (part 0): no pillars', () => {
    expect(stillParts(['01.jpg', '02.jpg'].map(u))).toEqual([{ part: 0, urls: ['01.jpg', '02.jpg'].map(u) }]);
  });

  it('parts come out in part order whatever the input order', () => {
    expect(stillParts([u('2-01.jpg'), u('1-01.jpg')]).map((g) => g.part)).toEqual([1, 2]);
    expect(stillParts([])).toEqual([]);
  });
});

// (owner 2026-09-28, on the shipped pillars, 2 across against 3: "the two columns must be equal-sized, not mismatch
// like this") — one column count for every pillar, so every still is the same size
describe('the pillars are equal: one column count, one still size', () => {
  const css = readFileSync('src/styles/project.css', 'utf8');
  it('3 across on a wide screen, 2 on a tablet and a phone, the same in every pillar', () => {
    expect(css).toContain('.p-stillcol .p-vgrid { --cols: 3; }');
    expect(css).toContain('.p-stillcol .p-vgrid { --cols: 2; }');
    expect(css).not.toMatch(/--cols-wide|--cols-mid/);
  });
  it('no per-pillar balancing is left', () => {
    expect('pillarColumns' in pillars).toBe(false);
    expect(readFileSync('src/pages/project.ts', 'utf8')).not.toContain('pillarColumns');
  });
});

// (owner 2026-09-28: "the galaxy fold page have some grain error in the still column of digital ad 1. Fix.") Ad #1's
// pillar ends in the hatch, and the hatch was a hard-edged line 1 px wide: sampled at device pixels, a line that thin
// renders by luck of phase, a solid staircase and then a chain of lone dots, and a field of those reads as grain.
describe("the pillars' hatch: every line drawn soft, all alike", () => {
  // the hatch as project.css draws it: its angle, and its stops (a stop with two positions counted as two)
  const hatch = () => {
    const css = readFileSync('src/styles/project.css', 'utf8');
    const m = /\.p-vgrid \{[^}]*?background: repeating-linear-gradient\((.*?)\);/s.exec(css);
    if (!m) throw new Error('.p-vgrid has no repeating hatch');
    const args = m[1].split(/,(?![^(]*\))/).map((s) => s.trim());
    const stops = args.slice(1).flatMap((s) => {
      const [, color, at] = /^(rgba\([^)]*\)|transparent)\s*(.*)$/.exec(s)!;
      const alpha = color === 'transparent' ? 0 : Number(color.slice(5, -1).split(',')[3]);
      return at.split(/\s+/).filter(Boolean).map((p) => ({ alpha, at: parseFloat(p) }));
    });
    return { angle: args[0], stops };
  };

  it('a line every 12 px at 135°, as before', () => {
    const { angle, stops } = hatch();
    expect(angle).toBe('135deg');
    expect(stops[0].at).toBe(0);
    expect(stops.at(-1)!.at).toBe(12);
  });

  it('no hard edge: every change of tone runs over a pixel at least', () => {
    const { stops } = hatch();
    for (let i = 1; i < stops.length; i++) {
      if (stops[i].alpha !== stops[i - 1].alpha) expect(stops[i].at - stops[i - 1].at, `stop ${i}`).toBeGreaterThanOrEqual(1);
    }
  });

  it("the same ink as the hard line it replaced: 0.13 px of bone per line", () => {
    const { stops } = hatch();
    let ink = 0;
    for (let i = 1; i < stops.length; i++) ink += ((stops[i].alpha + stops[i - 1].alpha) / 2) * (stops[i].at - stops[i - 1].at);
    expect(ink).toBeCloseTo(0.13, 4);
  });
});

// (owner 2026-09-28: "The verticle pane must be bigger and larger, as they are allowed to run irregular sizing")
describe("a pane's card: the carpet's row height, or two rows and the seam for a tall (vertical) pane", () => {
  it('every landscape card as before; the 9:16 card 258 × 458', () => {
    expect(cardSize(16 / 9, false)).toEqual({ cw: 400, ch: 225 });
    expect(cardSize(4 / 3, false)).toEqual({ cw: 300, ch: 225 });
    expect(cardSize(2.39, false)).toEqual({ cw: 538, ch: 225 });
    expect(cardSize(9 / 16, true)).toEqual({ cw: 258, ch: 458 });
  });

  // (upright and lifted 1.18x, the 916-unit card stood 1081 px at the floor's opening zoom: over any laptop's height)
  it("a tall pane's hover fits 84% of the screen's height; never enlarged past the plain lift", () => {
    expect(hoverFit(458, 2, 1, 900)).toBeCloseTo((900 * 0.84) / (458 * 2 * 1.18), 6); // ≈ 0.70: 756 px tall
    expect(hoverFit(458, 2, 0.5, 900)).toBe(1); // zoomed out, it fits as it is
    expect(hoverFit(458, 2, 0.354, 844)).toBe(1); // a phone's opening zoom
  });
});

describe("the vertical pane's spine", () => {
  it('fits the id into the room it has, never enlarging it', () => {
    expect(spineFit(100, 185)).toBe(1);
    expect(spineFit(250, 185)).toBeCloseTo(0.74, 2);
    expect(spineFit(0, 185)).toBe(1);
  });
});

describe("the vertical pane's poster keeps the floor's dither screen", () => {
  it('1.6 poster pixels per card unit: 413 for the tall 9:16 card; every landscape card keeps its 640', () => {
    expect(posterWidthFor({ aspect: '9:16' })).toBe(413);
    for (const aspect of ['16:9', '4:3', '2.39:1'] as const) expect(posterWidthFor({ aspect })).toBe(640);
  });
});

describe('the vertical format is wired (pins)', () => {
  const pins: Array<[string, string]> = [
    ['src/works/tile.ts', 'spineFit('],
    ['src/works/tile.ts', 'const vertical = aspectRatio(project.aspect) < 1;'],
    ['src/works/poster.ts', 'posterWidthFor('],
    ['src/pages/project.ts', "player.classList.add('p-player--multi')"],
    ['src/pages/project.ts', 'linkParts('],
    ['src/pages/project.ts', 'stillParts('],
    ['src/pages/project.ts', 'grid.dataset.eof'],
    ['src/styles/project.css', '.p-stillcol .p-vgrid::after'],
    ['src/works/tile.ts', 'cardSize('],
    ['src/works/world.ts', 'rowsOf('],
    ['src/works/debris.ts', 'rowsOf('],
    ['src/works/world.ts', 'hoverFit('],
    ['src/works/tile.ts', 'enterHover(fit = 1)'],
    ['src/styles/project.css', '.p-player--multi {'],
    ['src/styles/project.css', '.p-hinge {'],
    ['src/styles/project.css', '.p-wall--vertical'],
    ['src/styles/project.css', '.p-pillars {'],
  ];
  for (const [file, needle] of pins) {
    it(`${file} carries ${needle}`, () => {
      expect(readFileSync(file, 'utf8')).toContain(needle);
    });
  }
});
