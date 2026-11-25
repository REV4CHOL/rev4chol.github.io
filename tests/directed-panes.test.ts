import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseJson, parseProjects, type Project } from '../src/lib/content';
import { captionMeta } from '../src/works/legend';
import { listGroups, rowMeta } from '../src/works/index-list';
import { paneLabel, roleLine } from '../src/works/reel';

// DIRECTED BY, ON THE WORK PAGE'S PANES (owner, 2026-11-25: "In many panes and films' page, EDITOR are going before
// COLORIST. But this violate the alphabetic order. So it should be COLORIST, then EDITOR. And in the future, other
// roles will have the same treatment. As for DIRECTOR, I dont want it to be in ROLE anymore. So all projects that have
// ROLE as Director, its's directed by me. So I want this sentence: Directed by REVACHOL, placed above ROLE."; asked
// about the panes: "On panes too"; then: "The phrase "DIRECTED BY REVACHOL" must have a special color to make it stand
// out" and "there are some other films that are directed by other directors. Please give them the same treatment as
// ours too"). The wall's caption, THE LIST's rows and the phone's strip show the roles A to Z without Director, and a
// small DIRECTED BY line above them, in the credit colour, only when someone is on record (src/lib/roles.ts).
const src = (f: string) => readFileSync(f, 'utf8');
const caption = { year: 2025, film: { type: 'youtube' as const, src: 'abc' }, filmPending: false, filmPrivate: false };

describe("the wall's caption", () => {
  it('its facts carry the roles A to Z, without Director', () => {
    expect(captionMeta({ ...caption, role: 'Director / Editor / Colorist / Sound Designer' }, true)).toBe(
      '2025 · COLORIST / EDITOR / SOUND DESIGNER ▪ CLICK TO OPEN');
    expect(captionMeta({ ...caption, role: 'Editor / Colorist' }, false)).toBe('2025 · COLORIST / EDITOR ▪ TAP AGAIN TO OPEN');
    expect(captionMeta({ ...caption, role: 'Director' }, true)).toBe('2025 ▪ CLICK TO OPEN');
  });

  it('the directed line stands above the facts, in the credit colour, only when someone is on record', () => {
    const world = src('src/works/world.ts');
    expect(world).toContain('directedLine(p)');
    const at = world.indexOf('directedLine(p)');
    expect(world.slice(at, at + 600)).toContain('meta.before(');
    expect(src('src/styles/components.css')).toMatch(/#tile-label \.tl-dir \{[^}]*color: var\(--credit\);/);
  });
});

describe("THE LIST's rows", () => {
  const film = (over: Partial<Project>): Project =>
    ({ slug: 'f', title: 'F', year: 2026, role: 'Colorist', director: '', category: 'human', aspect: '16:9', accent: '#c8ff00',
      film: { type: 'youtube', src: 'x' }, filmPending: false, filmPrivate: false, ...over }) as Project;

  it('the meta carries the roles A to Z, without Director', () => {
    expect(rowMeta(film({ role: 'Director / Editor / Colorist' }))).toBe('2026 · COLORIST / EDITOR');
    expect(rowMeta(film({ role: 'Editor / Colorist', filmPrivate: true }))).toBe('2026 · COLORIST / EDITOR · PRIVATE FILM');
  });

  it('a row carries its directed line, or none', () => {
    const rows = listGroups([
      film({ slug: 'a', title: 'A', role: 'Director / Colorist' }),
      film({ slug: 'b', title: 'B', role: 'Colorist', director: 'BERRY' }),
      film({ slug: 'c', title: 'C', role: 'Colorist' }),
    ])[0].rows;
    expect(rows.map((r) => r.directed)).toEqual(['DIRECTED BY REVACHOL', 'DIRECTED BY BERRY', '']);
  });

  it('the line stands inside the meta, above its facts, in the credit colour; the wide row keeps its facts at the middle', () => {
    expect(src('src/works/index-list.ts')).toContain('directed: directedLine(p)');
    const css = src('src/styles/components.css');
    expect(css).toMatch(/\.fl-dir \{[^}]*margin-top: -1\.6em;/); // (the facts at the row's middle; the line one line above)
    expect(css).toContain('html.rvl-list-tight .fl-dir { margin-top: 0; }');
    const page = src('src/pages/works.ts');
    expect(page).toContain('r.directed');
    expect(page).toContain("fillCrossed(span('fl-dir', ''), r.directed)");
    expect(src('src/styles/components.css')).toMatch(/\.fl-dir \{[^}]*color: var\(--credit\);/);
  });
});

describe("the phone's strip", () => {
  it('the role line: A to Z, without Director, upper case', () => {
    expect(roleLine({ role: 'Director / Editor / Colorist / Sound Designer' })).toBe('COLORIST / EDITOR / SOUND DESIGNER');
    expect(roleLine({ role: ' AI Lead /  Colorist ' })).toBe('AI LEAD / COLORIST');
  });

  it('the link reads naturally: the name, who directed, the roles, what it does', () => {
    expect(paneLabel({ title: 'Soda Coast', role: 'Director / Editor / Colorist / Sound Designer', director: '' })).toBe(
      'Soda Coast. Directed by Revachol. Colorist / Editor / Sound Designer. Open this film.');
    expect(paneLabel({ title: 'Remnants of a Dream / Tàn Tích Của Một Giấc Mơ', role: 'Colorist', director: 'BERRY' })).toBe(
      'Remnants of a Dream / Tàn Tích Của Một Giấc Mơ. Directed by BERRY. Colorist. Open this film.');
    expect(paneLabel({ title: 'Philia', role: 'Colorist', director: '' })).toBe('Philia. Colorist. Open this film.');
    expect(paneLabel({ title: 'X', role: 'Director', director: '' })).toBe('X. Directed by Revachol. Open this film.');
  });

  it('the directed line stands in the caption above the roles, in the credit colour', () => {
    const view = src('src/works/reel-view.ts');
    expect(view).toContain('directedLine(p)');
    expect(view).toContain("fillCrossed(el('span', 'rl-dir'), dir)");
    expect(view).toContain('paneLabel(p)');
    expect(src('src/styles/components.css')).toMatch(/\.rl-dir \{[^}]*color: var\(--credit\);/);
  });
});

describe('the films as they stand', () => {
  const films = parseProjects(parseJson(src('public/content/projects.json'), 'projects.json'));
  const by = (slug: string) => films.find((f) => f.slug === slug)!;

  // (PHILIA had nobody on record until the owner named its director, 2026-11-25: "PHILIA: Bá Hương"; a film with
  //  nobody on record is now a made one: no real film is without a name)
  it('SODA COAST by REVACHOL, REMNANTS by BERRY, PHILIA by BÁ HƯƠNG, THE FATHER by two names; a film with nobody on record has no line', () => {
    const rows = listGroups(films).flatMap((g) => g.rows);
    const row = (slug: string) => rows.find((r) => r.slug === slug)!;
    expect(row('soda-coast').directed).toBe('DIRECTED BY REVACHOL');
    expect(row('remnants-of-a-dream').directed).toBe('DIRECTED BY BERRY');
    expect(row('philia').directed).toBe('DIRECTED BY BÁ HƯƠNG');
    expect(row('the-father').directed).toBe('DIRECTED BY MINH QUỐC / MYKE');
    const nobody = { ...by('philia'), slug: 'nobody', director: '' };
    expect(listGroups([nobody]).flatMap((g) => g.rows)[0].directed).toBe('');
    for (const f of films) {
      expect(roleLine(f), f.slug).not.toMatch(/DIRECTOR(\s|$)/);
      expect(captionMeta(f, true), f.slug).not.toMatch(/DIRECTOR(\s|$)/);
      expect(rowMeta(f), f.slug).not.toMatch(/DIRECTOR(\s|$)/);
    }
    expect(roleLine(by('soda-coast'))).toBe('COLORIST / EDITOR / SOUND DESIGNER');
  });
});
