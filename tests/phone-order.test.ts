import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ContentError, parseJson, parseProjects } from '../src/lib/content';
import { channelProjects } from '../src/works/channels';
import { stripFilms } from '../src/works/reel';

// THE PHONE STRIP'S OWN ORDER (owner, 2026-11-25, on their phone: "When first open work section and scroll down, I want
// the first films for the viewers that they will see are: 1. Temptation 2. Philia 3. Mien Vien 4. Mr. Purple 5. The
// Lovers 6. The Betrothal 7. HALIDE 8. Far East then the rest"). A film's `phoneOrder` in projects.json is its place on
// the phone's strip; the films without one follow in the file's order. The floor, THE LIST, the counts and the film
// pages' next-film chain keep the file's order.

const file = (f: string) => readFileSync(fileURLToPath(new URL(`../${f}`, import.meta.url)), 'utf8');
const real = () => parseProjects(parseJson(file('public/content/projects.json'), 'projects.json'));

const film = (slug: string, phoneOrder: number | null = null) => ({ slug, phoneOrder });
const slugs = (list: readonly { slug: string }[]) => list.map((p) => p.slug);

describe('the strip\'s films in the phone\'s order (works/reel.ts: stripFilms)', () => {
  it('the numbered films come first, lowest number first; the rest follow in the order given', () => {
    const chapter = [film('a'), film('b', 2), film('c'), film('d', 1), film('e', 3), film('f')];
    expect(slugs(stripFilms(chapter))).toEqual(['d', 'b', 'e', 'a', 'c', 'f']);
  });
  it('a chapter with no number keeps the order given', () => {
    const chapter = [film('a'), film('b'), film('c')];
    expect(slugs(stripFilms(chapter))).toEqual(['a', 'b', 'c']);
  });
  it('the numbers need not run on from 1 without a gap: only their order counts', () => {
    expect(slugs(stripFilms([film('a', 9), film('b'), film('c', 4), film('d', 20)]))).toEqual(['c', 'a', 'd', 'b']);
  });
  it('the list given is left as it was (the floor reads the same list)', () => {
    const chapter = [film('a'), film('b', 1)];
    stripFilms(chapter);
    expect(slugs(chapter)).toEqual(['a', 'b']);
  });
});

describe('`phoneOrder` in projects.json (lib/content.ts)', () => {
  const valid = (over: Record<string, unknown> = {}) => ({
    slug: 'neon-dream', title: 'Neon Dream', year: 2025, role: 'Colorist', runtime: '', tags: ['short film'], accent: '#C8FF00',
    tileSize: 'normal', synopsis: '', credits: [], film: null, filmPending: true, stills: [], category: 'human', ...over,
  });
  it('a film without it has none; a whole number from 1 is its place', () => {
    expect(parseProjects([valid()])[0].phoneOrder).toBeNull();
    expect(parseProjects([valid({ phoneOrder: null })])[0].phoneOrder).toBeNull();
    expect(parseProjects([valid({ phoneOrder: 3 })])[0].phoneOrder).toBe(3);
  });
  it('anything else is refused by name', () => {
    for (const bad of [0, -1, 1.5, '2', true, [1]]) {
      expect(() => parseProjects([valid({ phoneOrder: bad })]), JSON.stringify(bad)).toThrow(ContentError);
      expect(() => parseProjects([valid({ phoneOrder: bad })]), JSON.stringify(bad)).toThrow(/phoneOrder/);
    }
  });
  it('two films of one chapter cannot hold the same place: the message names both', () => {
    const two = [valid({ phoneOrder: 2 }), valid({ slug: 'second-film', phoneOrder: 2 })];
    expect(() => parseProjects(two)).toThrow(ContentError);
    expect(() => parseProjects(two)).toThrow(/phoneOrder 2.*neon-dream.*second-film|neon-dream.*second-film.*phoneOrder 2/s);
  });
  it('the same number in two chapters is fine: each chapter has its own strip', () => {
    const two = [valid({ phoneOrder: 1 }), valid({ slug: 'second-film', category: 'machine', phoneOrder: 1 })];
    expect(slugs(parseProjects(two))).toEqual(['neon-dream', 'second-film']);
  });
});

describe('the site\'s own films', () => {
  const FLOOR = ['remnants-of-a-dream', 'mien-vien', 'mistchild', 'an-hoi', 'lien-quan', 'soda-coast', 'electric-fish',
    'soft-hours-lonely-lands', 'philia', 'mission-impassible', 'halide', 'far-east', 'the-lovers', 'xieu-long'];
  // Temptation, Philia, Miên Viễn, Mr. Purple, The Lovers, The Betrothal, HALIDE, Far East: the owner's eight, by slug
  const FIRST = ['xieu-long', 'philia', 'mien-vien', 'electric-fish', 'the-lovers', 'an-hoi', 'halide', 'far-east'];

  it('chapter one\'s strip opens on the owner\'s eight, in their order, then the rest in the file\'s order', () => {
    const strip = slugs(stripFilms(channelProjects(real(), 'human')));
    expect(strip.slice(0, 8)).toEqual(FIRST);
    expect(strip.slice(8)).toEqual(FLOOR.filter((s) => !FIRST.includes(s)));
    expect(strip.slice(8)).toEqual(['remnants-of-a-dream', 'mistchild', 'lien-quan', 'soda-coast', 'soft-hours-lonely-lands', 'mission-impassible']);
  });
  it('the eight are named by the titles the owner used', () => {
    const title = (slug: string) => real().find((p) => p.slug === slug)!.title;
    const named = [/temptation/i, /philia/i, /miên viễn/i, /mr_purple/i, /the lovers/i, /the betrothal/i, /halide/i, /far east/i];
    FIRST.forEach((slug, i) => expect(title(slug), slug).toMatch(named[i]));
  });
  it('the floor, THE LIST and the counts keep the file\'s order: the chapter\'s own list is untouched', () => {
    expect(slugs(channelProjects(real(), 'human'))).toEqual(FLOOR);
  });
  it('chapter two has no order of its own: its strip is the file\'s order', () => {
    const two = channelProjects(real(), 'machine');
    expect(two.every((p) => p.phoneOrder === null)).toBe(true);
    expect(slugs(stripFilms(two))).toEqual(slugs(two));
  });
});

describe('the strip is built from that order, and only the strip', () => {
  const view = file('src/works/reel-view.ts');
  it('one helper gives a chapter\'s films to the strip and to its rail', () => {
    expect(view).toMatch(/const filmsOf = \(key: ChannelKey\) => stripFilms\(channelProjects\(projects, key\)\);/);
    expect(view).toMatch(/const films = filmsOf\(ch\.key\);/); // (the panes)
    expect(view).toMatch(/const films = filmsOf\(active\)/); // (the rail's ticks: one per film, in the panes' order)
    expect(view).not.toMatch(/const films = channelProjects\(/);
  });
  it('no other part of WORK reads the phone\'s order', () => {
    for (const f of ['src/pages/works.ts', 'src/works/index-list.ts', 'src/works/world.ts', 'src/works/layout.ts', 'src/works/channels.ts'])
      expect(file(f), f).not.toMatch(/stripFilms|phoneOrder/);
  });
  it('the owner\'s guide says how to set it', () => {
    expect(file('HOW-TO-EDIT.md')).toMatch(/\| phoneOrder \|/);
  });
});
