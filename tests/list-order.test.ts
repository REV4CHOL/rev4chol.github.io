import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Project } from '../src/lib/content';
import { listGroups, titleOrder } from '../src/works/index-list';

// THE LIST'S ORDER (owner, 2026-11-25, from a phone, with a picture of THE LIST standing in the file's order: "all
// platform: The film list must follow the alphabetic order"). Inside each chapter the rows stand A to Z by the name
// the row shows as its headline. One list for every screen, so one rule for every screen. The floor, the phone's
// strip (its own order: tests/phone-order.test.ts) and the film pages' next-film chain are not this list.

const project = (over: Partial<Project> = {}): Project => ({
  slug: 'philia', title: 'PHILIA', year: 2026, role: 'Colorist', runtime: '', client: '', artist: '', productionHouse: '', director: '', short: '', tags: [],
  accent: '#c8ff00', tileSize: 'large', aspect: '16:9', category: 'human', synopsis: '', credits: [],
  film: { type: 'youtube', src: 'https://youtu.be/abcdefghijk' }, films: [], filmPending: false, filmPrivate: false,
  stills: [], bigStills: [], phoneOrder: null, position: null, focus: '50% 50%',
  ...over,
});

const film = (title: string, over: Partial<Project> = {}) =>
  project({ slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), title, ...over });
const titles = (rows: readonly { title: string }[]) => rows.map((r) => r.title);
const sorted = (list: string[]) => [...list].sort(titleOrder);

describe('THE LIST stands A to Z inside each chapter', () => {
  // the file's order is the order the films were added in: nothing like the alphabet
  const FILE = [
    'Remnants of a Dream', 'Ever Faraway / Miên Viễn', 'MISTCHILD', 'The Betrothal', 'APL 2026 TEASER: Valor Rises, Battles Collide',
    'Soda Coast', 'mr_PURPLE_dreams_in_electric_fish', 'Soft Hours & Lonely Lands', 'PHILIA', 'Mission: Impassible', 'HALIDE',
    'FAR EAST', 'THE LOVERS', 'Temptation / Xiêu Lòng',
  ];
  const AZ = [
    'APL 2026 TEASER: Valor Rises, Battles Collide', 'Ever Faraway / Miên Viễn', 'FAR EAST', 'HALIDE', 'Mission: Impassible',
    'MISTCHILD', 'mr_PURPLE_dreams_in_electric_fish', 'PHILIA', 'Remnants of a Dream', 'Soda Coast', 'Soft Hours & Lonely Lands',
    'Temptation / Xiêu Lòng', 'The Betrothal', 'THE LOVERS',
  ];

  it('a chapter\'s rows stand by their names, whatever order the file has them in', () => {
    const [human] = listGroups(FILE.map((t) => film(t)));
    expect(titles(human.rows)).toEqual(AZ);
  });

  it('each chapter is sorted on its own; the chapters keep their order, their names and their counts', () => {
    const groups = listGroups([
      film('KATARA', { category: 'machine' }), film('PHILIA'), film('DEATHMAN', { category: 'machine' }), film('FAR EAST'),
      film('The Father', { category: 'machine' }), film('HALIDE'), film('FOREST ONSEN', { category: 'machine' }),
    ]);
    expect(groups.map((g) => g.heading)).toEqual(['CH·01 ▪ COLORIST ▪ 3 FILMS', 'CH·02 ▪ AI ▪ 4 FILMS']);
    expect(titles(groups[0].rows)).toEqual(['FAR EAST', 'HALIDE', 'PHILIA']);
    expect(titles(groups[1].rows)).toEqual(['DEATHMAN', 'FOREST ONSEN', 'KATARA', 'The Father']);
  });

  it('the list handed in is left as it was (the floor places its panes by the file\'s order, the strip reads it too)', () => {
    const all = FILE.map((t) => film(t));
    const before = all.map((p) => p.slug);
    listGroups(all);
    expect(all.map((p) => p.slug)).toEqual(before);
  });
});

describe('what "alphabetic" means here', () => {
  it('capitals and small letters are one alphabet (the rows are drawn in capitals)', () => {
    expect(sorted(['mr_PURPLE', 'MISTCHILD', 'Mission: Impassible'])).toEqual(['Mission: Impassible', 'MISTCHILD', 'mr_PURPLE']);
    expect(sorted(['Soft Hours', 'SODA COAST', 'soda bay'])).toEqual(['soda bay', 'SODA COAST', 'Soft Hours']);
    expect(titleOrder('philia', 'PHILIA')).toBe(0);
  });

  it('an accent does not move a name: Ấ stands with A, É with E, never after Z', () => {
    expect(sorted(['Zero', 'Élan', 'Dune', 'Ấm', 'Bay'])).toEqual(['Ấm', 'Bay', 'Dune', 'Élan', 'Zero']);
  });

  it('THE is a word like any other: "The Betrothal" stands under T, as the row shows it', () => {
    expect(sorted(['THE LOVERS', 'Temptation', 'The Betrothal', 'Zero', 'Bay'])).toEqual(['Bay', 'Temptation', 'The Betrothal', 'THE LOVERS', 'Zero']);
  });

  it('a number inside a name counts as a number: PART 2 before PART 10', () => {
    expect(sorted(['PART 10', 'PART 2', 'PART 1'])).toEqual(['PART 1', 'PART 2', 'PART 10']);
  });

  it('a two-language name stands by its first line, the one the row shows large; its second line only breaks a tie', () => {
    // by the whole string "Temptation / Xiêu Lòng" would stand before "Temptation 2" (a space, then a slash)
    expect(sorted(['Temptation II', 'Temptation / Xiêu Lòng', 'Temptation'])).toEqual(['Temptation', 'Temptation / Xiêu Lòng', 'Temptation II']);
    expect(sorted(['Home / Nhà', 'Home / Về'])).toEqual(['Home / Nhà', 'Home / Về']);
  });

  it('two films of one name keep the file\'s order between them', () => {
    const [human] = listGroups([film('ZERO'), film('Echo', { slug: 'echo-first' }), film('ECHO', { slug: 'echo-second' }), film('ALPHA')]);
    expect(human.rows.map((r) => r.slug)).toEqual(['alpha', 'echo-first', 'echo-second', 'zero']);
  });
});

describe('where the order lives', () => {
  const file = (f: string) => readFileSync(f, 'utf8');
  it('the page builds its rows from the list\'s own order and sorts nothing itself', () => {
    expect(file('src/pages/works.ts')).toContain('for (const g of listGroups(projects))');
    expect(file('src/pages/works.ts')).not.toMatch(/titleOrder|\.sort\(/);
  });
  it('the phone\'s strip and the floor do not read it', () => {
    for (const f of ['src/works/reel.ts', 'src/works/reel-view.ts', 'src/works/world.ts', 'src/works/layout.ts', 'src/works/channels.ts'])
      expect(file(f), f).not.toMatch(/titleOrder/);
  });
  it('the owner\'s guide says a new film takes its place in THE LIST by its name', () => {
    expect(file('HOW-TO-EDIT.md')).toMatch(/THE LIST[^\n]*A to Z/);
  });
});
