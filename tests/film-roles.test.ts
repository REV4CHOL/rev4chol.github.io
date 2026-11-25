import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CROSS, crossedHtml } from '../src/lib/cross';
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

  // (owner, 2026-11-25, of who directed THE FATHER: "Minh Quốc / Myke (the / should always be the icon we already
  //  designed)": the slash between two names is drawn as the site's red cross, as between two roles: lib/cross.ts)
  it('two names in the field are parted by the cross wherever the line is drawn, never by a plain slash', () => {
    const line = directedLine(film('Colorist', 'Minh Quốc / Myke'));
    expect(line).toBe('DIRECTED BY MINH QUỐC / MYKE');
    expect(crossedHtml(line)).toBe(`DIRECTED BY MINH <span class="rvl-xp">QUỐC${CROSS}</span><wbr>MYKE`); // (the cross keeps to the word before it)
    expect(crossedHtml(directorOf(film('Colorist', 'Minh Quốc / Myke')).toUpperCase()).split(CROSS).length - 1).toBe(1);
  });

  it('a Vietnamese name is shouted whole: every accented letter keeps its accent as one letter', () => {
    expect(directedLine(film('Colorist', 'Hồ Mai Phương'))).toBe('DIRECTED BY HỒ MAI PHƯƠNG');
    expect(directedLine(film('Colorist', 'Võ Thành Công'))).toBe('DIRECTED BY VÕ THÀNH CÔNG');
    const shouted = directedLine(film('Colorist', 'Nguyễn Lion'));
    expect(shouted).toBe('DIRECTED BY NGUYỄN LION');
    expect(shouted).toBe(shouted.normalize('NFC'));
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

  // (the names are the owner's own words, letter for letter: REMNANTS and TEMPTATION on 2026-11-24 and 25, the other
  //  seven on 2026-11-25, answering "Who directed the seven films that show no DIRECTED BY line yet?". A credit is
  //  never guessed: a new film without a name shows no line until the owner gives one.)
  it('the films as they stand today: eleven directed by REVACHOL, nine by the names the owner gave, none without a name, every role line A to Z', () => {
    const films = JSON.parse(readFileSync('public/content/projects.json', 'utf8')) as { slug: string; role?: string; director?: string }[];
    const by = (name: (d: string) => boolean) => films.filter((f) => name(directorOf({ role: f.role ?? '', director: f.director ?? '' }))).map((f) => f.slug);
    expect(by((d) => d === 'Revachol')).toEqual([
      'katara', 'mistchild', 'an-hoi', 'jaecoo-j5', 'soda-coast', 'electric-fish', 'soft-hours-lonely-lands', 'halide', 'far-east', 'the-lovers', 'deathman',
    ]);
    const named: Record<string, string> = {
      'remnants-of-a-dream': 'BERRY',
      'mien-vien': 'Hồ Mai Phương',
      'the-father': 'Minh Quốc / Myke',
      'forest-onsen': 'Tony Phạm',
      'lien-quan': 'Nguyễn Lion',
      'galaxy-z-fold-8-ultra': 'Võ Thành Công',
      philia: 'Bá Hương',
      'mission-impassible': 'Khang Nguyễn',
      'xieu-long': 'Khadarec [XPOKIT]',
    };
    expect(Object.fromEntries(films.filter((f) => f.director).map((f) => [f.slug, f.director]))).toEqual(named);
    for (const name of Object.values(named)) expect(name, name).toBe(name.normalize('NFC')); // (each accented letter one letter)
    expect(by((d) => d === '')).toEqual([]);
    const order = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
    for (const f of films) {
      const shown = rolesShown({ role: f.role ?? '' }).split(' / ');
      expect([...shown].sort(order.compare), f.slug).toEqual(shown);
      expect(shown.some((r) => /^director$/i.test(r)), f.slug).toBe(false);
    }
  });
});
