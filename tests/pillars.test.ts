import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pillarColumns, stillParts } from '../src/project/pillars';
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

describe("the pillars stand as one height (a pillar's height ∝ its rows ÷ its columns)", () => {
  it('6 and 11 stills stand 2 and 3 across (1.5 against 1.33 pillar widths × 16/9)', () => {
    expect(pillarColumns([6, 11], 2, 4)).toEqual([2, 3]);
  });

  it('equal counts stand alike; ties go to the bigger stills', () => {
    expect(pillarColumns([4, 4], 2, 4)).toEqual([2, 2]);
    expect(pillarColumns([1, 5], 2, 4)).toEqual([2, 4]);
    expect(pillarColumns([3], 2, 4)).toEqual([2]);
  });

  it('a narrow screen caps the columns', () => {
    expect(pillarColumns([6, 11], 1, 3)).toEqual([2, 3]);
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
  it('1.6 poster pixels per card unit: 203 for a 9:16 card; every landscape card keeps its 640', () => {
    expect(posterWidthFor({ aspect: '9:16' })).toBe(203);
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
    ['src/pages/project.ts', 'pillarColumns('],
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
