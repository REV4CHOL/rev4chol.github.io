import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DIRECTED_BY, directedLine, directorOf, rolesShown } from '../src/lib/roles';

// THE ROLES AS THE SITE SHOWS THEM (owner, 2026-11-25: "In many panes and films' page, EDITOR are going before
// COLORIST. But this violate the alphabetic order. So it should be COLORIST, then EDITOR. And in the future, other
// roles will have the same treatment. As for DIRECTOR, I dont want it to be in ROLE anymore. So all projects that have
// ROLE as Director, its's directed by me. So I want this sentence: Directed by REVACHOL, placed above ROLE."; then:
// "there are some other films that are directed by other directors. Please give them the same treatment as ours too").
const film = (role: string, director = '') => ({ role, director });

describe("a film's roles stand A to Z, without Director", () => {
  it('COLORIST before EDITOR, whatever order the file has them in', () => {
    expect(rolesShown(film('Editor / Colorist'))).toBe('Colorist / Editor');
    expect(rolesShown(film('Director / Editor / Colorist / Sound Designer'))).toBe('Colorist / Editor / Sound Designer');
    expect(rolesShown(film('Director / Colorist / Editor'))).toBe('Colorist / Editor');
  });

  it('any role takes its place by its name: capitals and small letters are one alphabet, a number counts as a number', () => {
    expect(rolesShown(film('VFX Artist / editor / 1st AD / Colorist'))).toBe('1st AD / Colorist / editor / VFX Artist');
    expect(rolesShown(film('Sound Designer / AI Lead / Colorist'))).toBe('AI Lead / Colorist / Sound Designer');
    expect(rolesShown(film('2nd AD / 10th AD / 1st AD'))).toBe('1st AD / 2nd AD / 10th AD');
  });

  it('one role, no role and loose spaces', () => {
    expect(rolesShown(film('Colorist'))).toBe('Colorist');
    expect(rolesShown(film(''))).toBe('');
    expect(rolesShown(film('  Editor/Colorist  '))).toBe('Colorist / Editor');
    expect(rolesShown(film('Sound   Designer / Colorist'))).toBe('Colorist / Sound Designer');
  });

  it('a film whose only role was Director shows no role at all', () => {
    expect(rolesShown(film('Director'))).toBe('');
  });

  it('only the word Director alone is the director: an Art Director stays a role', () => {
    expect(rolesShown(film('Art Director / director / Editor'))).toBe('Art Director / Editor');
    expect(directorOf(film('Art Director / Editor'))).toBe('');
  });
});

describe('who directed a film', () => {
  it('REVACHOL, when the film\'s role line names Director', () => {
    expect(directorOf(film('Director / Colorist'))).toBe('Revachol');
    expect(directedLine(film('Director / Colorist'))).toBe('DIRECTED BY REVACHOL');
  });

  it("someone else, by the film's director field: the same line", () => {
    expect(directorOf(film('Colorist', 'BERRY'))).toBe('BERRY');
    expect(directedLine(film('Colorist', 'BERRY'))).toBe('DIRECTED BY BERRY');
    expect(directedLine(film('Colorist', 'Khadarec [XPOKIT]'))).toBe('DIRECTED BY KHADAREC [XPOKIT]');
  });

  it('both, when the film was directed together', () => {
    expect(directorOf(film('Director / Editor', 'BERRY'))).toBe('Revachol / BERRY');
  });

  it('nobody on record: no line, never a guess', () => {
    expect(directorOf(film('Colorist'))).toBe('');
    expect(directedLine(film('Colorist'))).toBe('');
    expect(DIRECTED_BY).toBe('DIRECTED BY');
  });
});

describe("the line's colour", () => {
  // (owner, 2026-11-25: "The phrase "DIRECTED BY REVACHOL" must have a special color to make it stand out"; of four
  //  colours shown on a film's sheet they chose "B: Gold")
  it('is gold, one token, and nothing else on the site takes it', () => {
    const sheet = (f: string) => readFileSync(`src/styles/${f}`, 'utf8');
    expect(sheet('tokens.css')).toContain('--credit: #FFC53D;');
    for (const f of readdirSync('src/styles').filter((n) => n.endsWith('.css') && !n.includes('about-old'))) {
      const css = sheet(f).replace('--credit: #FFC53D;', '');
      expect(css.toUpperCase(), f).not.toContain('#FFC53D'); // (only through the token)
    }
  });
});

describe('every place that shows a film goes through the rule', () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : e.name.endsWith('.ts') ? [`${dir}/${e.name}`] : []));

  it("no file under src reads a film's role line or its director but the parser and lib/roles.ts", () => {
    const readers = walk('src')
      .filter((f) => !f.includes('about-old') && /(^|[^\w.])\w+\.(role|director)\b/.test(readFileSync(f, 'utf8')))
      .sort();
    expect(readers).toEqual(['src/lib/content.ts', 'src/lib/roles.ts']);
  });

  it('the films as they stand today: eleven directed by REVACHOL, two by someone else, every role line A to Z', () => {
    const films = JSON.parse(readFileSync('public/content/projects.json', 'utf8')) as { slug: string; role?: string; director?: string }[];
    const by = (name: (d: string) => boolean) => films.filter((f) => name(directorOf({ role: f.role ?? '', director: f.director ?? '' }))).map((f) => f.slug);
    expect(by((d) => d === 'Revachol')).toEqual([
      'katara', 'mistchild', 'an-hoi', 'jaecoo-j5', 'soda-coast', 'electric-fish', 'soft-hours-lonely-lands', 'halide', 'far-east', 'the-lovers', 'deathman',
    ]);
    expect(by((d) => d !== '' && d !== 'Revachol')).toEqual(['remnants-of-a-dream', 'xieu-long']);
    const order = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
    for (const f of films) {
      const shown = rolesShown({ role: f.role ?? '' }).split(' / ');
      expect([...shown].sort(order.compare), f.slug).toEqual(shown);
      expect(shown.some((r) => /^director$/i.test(r)), f.slug).toBe(false);
    }
  });
});
