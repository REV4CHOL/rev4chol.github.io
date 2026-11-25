import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { altPullEm, heroLockupSize, inkShiftEm, LOCKUP, lockupInkEm, runningTitle, splitTitle } from '../src/lib/title';

// The owner, 2026-11-24, of "Temptation / Xiêu Lòng" and "Ever Faraway / Miên Viễn": 'can we design something special
// to replace the "/" to make it more appealing? Right now it looks rough'; shown four mock-ups: "go for A. But I want
// the two texts to be organise neatly in the same column, and it need to sit a bit closer to each other via their line
// spacing. It needs to be organise nicely and aesthetically".

const src = (f: string) => readFileSync(f, 'utf8');
const css = (f: string) => src(`src/styles/${f}.css`);

describe('a two-language title is split at its " / " (and nothing else)', () => {
  it('two parts: the English name, then the Vietnamese one', () => {
    expect(splitTitle('Temptation / Xiêu Lòng')).toEqual({ main: 'Temptation', alt: 'Xiêu Lòng' });
    expect(splitTitle('Ever Faraway / Miên Viễn')).toEqual({ main: 'Ever Faraway', alt: 'Miên Viễn' });
  });

  it('one part: the title whole, no second line', () => {
    expect(splitTitle('Soda Coast')).toEqual({ main: 'Soda Coast', alt: null });
    expect(splitTitle('The Betrothal')).toEqual({ main: 'The Betrothal', alt: null });
  });

  it('a bar, a dash, a colon or a slash without its spaces is not a second language', () => {
    expect(splitTitle('GALAXY Z FOLD 8 ULTRA | DIGITAL AD').alt).toBeNull();
    expect(splitTitle('Mission - Impassible').alt).toBeNull();
    expect(splitTitle('Chapter: One').alt).toBeNull();
    expect(splitTitle('AC/DC').alt).toBeNull();
  });

  it('only the first " / " splits; the parts are trimmed; an empty side is no lockup', () => {
    expect(splitTitle('  A  /  B / C ')).toEqual({ main: 'A', alt: 'B / C' });
    expect(splitTitle('A / ')).toEqual({ main: 'A /', alt: null });
    expect(splitTitle(' / B').alt).toBeNull();
  });

  it('keeps the letters as written (NFC stays NFC: Ễ is one code point, never re-composed)', () => {
    const t = 'Ever Faraway / Miên Viễn';
    expect(splitTitle(t).alt).toBe('Miên Viễn');
    expect([...splitTitle(t).alt!].length).toBe(9);
  });

  // (2026-11-25: REMNANTS OF A DREAM is the third, by the owner's word; see content-files.test.ts)
  it('the three films that carry two languages today split; every other film stands as one name', () => {
    const films = JSON.parse(src('public/content/projects.json')) as { slug: string; title: string }[];
    const two = films.filter((f) => splitTitle(f.title).alt !== null).map((f) => f.slug).sort();
    expect(two).toEqual(['mien-vien', 'remnants-of-a-dream', 'xieu-long']);
  });
});

describe('the lockup: one constants block, mirrored in the styles', () => {
  it('line 2 is 0.58 of line 1; the leading clears the tallest mark (Ễ, 0.30 em over the cap) by 0.07 em', () => {
    expect(LOCKUP.ratio).toBe(0.58);
    expect(LOCKUP.markEm).toBe(0.3);
    expect(LOCKUP.clearEm).toBe(0.07);
  });

  it('the styles hold the same numbers as custom properties (a "bit more / less" is one edit)', () => {
    const c = css('components');
    expect(c).toMatch(/:root \{[^}]*--tt-ratio: 0\.58;/);
    expect(c).toMatch(/:root \{[^}]*--tt-mark: 0\.3;/);
    expect(c).toMatch(/:root \{[^}]*--tt-clear: 0\.07;/);
    expect(c).toMatch(/\.tt-two > \.tt-alt \{[^}]*font-size: calc\(var\(--tt-ratio\) \* 1em\);/);
    expect(c).toMatch(/\.tt-two > \.tt-alt \{[^}]*margin-top: calc\(var\(--tt-pull, 0em\) \+ max\(0px, 1px - var\(--tt-clear\) \* 1em\)\);/); // (never under 1 px)
    expect(c).toMatch(/\.tt-two > \.tt-alt \{[^}]*margin-left: var\(--tt-shift, 0em\);/);
  });

  it("line 2's baseline stands where its cap top is (mark + clear) of its own em under line 1's baseline", () => {
    // line 1 baseline at 100, line 2 at 150 as laid out, line 2 20 px, cap 0.7: want 100 + (0.37 + 0.7) * 20 = 121.4
    expect(altPullEm(100, 150, 20, 0.7)).toBeCloseTo((121.4 - 150) / 20, 6);
    expect(altPullEm(100, 100, 20, 0.7)).toBeCloseTo(1.07, 6);
  });

  it('the ink edges meet: line 2 moves by the difference of the two lines\' ink starts, in its own em', () => {
    // line 1 ink 0 px from its origin, line 2 ink 1.6 px LEFT of its origin (X overhangs), line 2 80 px: +0.02 em
    expect(inkShiftEm(0, -1.6, 80)).toBeCloseTo(0.02, 6);
    expect(inkShiftEm(2.7, 1.6, 80)).toBeCloseTo(1.1 / 80, 6);
  });

  it("the lockup's ink height, in line 1's em: line 1's cap + line 2's mark, clearance and cap", () => {
    expect(lockupInkEm(0.67)).toBeCloseTo(0.67 + 0.58 * (0.3 + 0.07 + 0.67), 6);
  });
});

describe("the film page's lockup fits by width AND by a height share of the hero (the mock crossed the viewfinder)", () => {
  const ink = lockupInkEm(0.67);
  it('a short name keeps the full size when it fits both', () => {
    expect(heroLockupSize(136, 1384, 900, 500, 2000, 0.67)).toBe(136);
  });
  it('a name wider than the stack shrinks to the width (as a one-line title does: 98%)', () => {
    expect(heroLockupSize(136, 1000, 2000, 500, 5000, 0.67)).toBe(Math.floor(136 * (1000 / 2000) * 98) / 100);
  });
  it('a second line wider than the stack shrinks it too', () => {
    expect(heroLockupSize(136, 1000, 900, 2000, 5000, 0.67)).toBe(Math.floor(136 * (1000 / 2000) * 98) / 100);
  });
  it(`the lockup never takes more than ${LOCKUP.heroShare * 100}% of the hero's height`, () => {
    const s = heroLockupSize(136, 1384, 900, 500, 700, 0.67);
    expect(s).toBeLessThan(136);
    expect(s * ink).toBeLessThanOrEqual(LOCKUP.heroShare * 700 + 0.01);
  });
  it('never under 12 px', () => {
    expect(heroLockupSize(136, 10, 900, 500, 700, 0.67)).toBe(12);
  });
});

describe('the surfaces that draw a film\'s name as a headline use the lockup', () => {
  const project = src('src/pages/project.ts');
  const works = src('src/pages/works.ts');
  const reel = src('src/works/reel-view.ts');
  const world = src('src/works/world.ts');

  it('the film page: the title and its outlined ghost, each line scrambled in its own span', () => {
    expect(project).toContain("fillTitle(ghost, p.title, shout)");
    expect(project).toContain("fillTitle(titleEl, p.title, shout)");
    expect(project).toMatch(/scrambleEl\(titleEl\.querySelector<HTMLElement>\('\.tt-main'\)!/);
    expect(project).toMatch(/scrambleEl\(titleEl\.querySelector<HTMLElement>\('\.tt-alt'\)!/);
    expect(project).toContain('heroLockupSize(');
  });

  it("the film page's viewfinder yields to a two-line title (its bottom edge a custom property)", () => {
    const p = css('project');
    expect(p).toMatch(/\.p-scanframe \{[^}]*inset: 108px 210px var\(--p-frame-b, 120px\) 92px;/);
    expect(p).toMatch(/\.p-scanframe \{ inset: 96px 16px var\(--p-frame-b, 130px\) 16px; \}/);
    expect(project).toContain("heroSec.style.setProperty('--p-frame-b'");
  });

  it("the next film's link stands its name as the lockup", () => {
    expect(project).toContain('lockupHtml(next.title.toUpperCase()');
  });

  it("THE LIST's row, the phone strip's pane and the floor's caption", () => {
    expect(works).toContain("titleSpan('fl-title', r.title, softBreaks)");
    expect(reel).toContain("fillTitle(el('span', 'rl-title'), p.title, softBreaks)");
    expect(world).toContain('fillTitle(title, p.short || p.title, shout)');
    expect(world).toMatch(/scrambleEl\(title\.querySelector<HTMLElement>\('\.tt-main'\)!/);
  });

  it("the phone's fit counts and measures the English name only; line 2 rides at 0.58 of the shown size", () => {
    expect(reel).toContain("const main = t.querySelector<HTMLElement>('.tt-main')");
    expect(reel).toMatch(/wrapStart\(\[\.\.\.\(main \?\? t\)\.textContent/);
  });

  it('the arrow ends line 1 on a two-line name (the phone strip and the phone LIST)', () => {
    const c = css('components');
    expect(c).toMatch(/\.rl-title\.tt-two::after \{ content: none; \}/);
    expect(c).toMatch(/\.rl-title\.tt-two > \.tt-main::after \{ content: '\\00a0▸'; color: var\(--acc\); \}/);
    expect(c).toMatch(/\.fl-title\.tt-two::after \{ content: none; \}/);
  });
});

// The owner, 2026-11-24, asked what the film page's ticker should show for a two-language name (it still ran the
// slash, TEMPTATION / XIÊU LÒNG): "A dot instead".
describe("the film page's ticker sets a dot between a two-language title's names", () => {
  it('a two-part title runs as English · Vietnamese; a one-part title as it is', () => {
    expect(runningTitle('Temptation / Xiêu Lòng')).toBe('Temptation · Xiêu Lòng');
    expect(runningTitle('Ever Faraway / Miên Viễn')).toBe('Ever Faraway · Miên Viễn');
    expect(runningTitle('Remnants of a Dream / Tàn Tích Của Một Giấc Mơ')).toBe('Remnants of a Dream · Tàn Tích Của Một Giấc Mơ');
    expect(runningTitle('Soda Coast')).toBe('Soda Coast');
    expect(runningTitle('Galaxy Z Fold 8 Ultra | Digital Ad')).toBe('Galaxy Z Fold 8 Ultra | Digital Ad');
  });
  it('the ticker is built from it', () => {
    expect(src('src/pages/project.ts')).toContain("const items = [runningTitle(p.title), ...p.tags, 'REVACHOL', stamp];");
  });
  // The owner, the same day, told the tab still showed the slash: "Use the dot in the browser tab title too".
  it('the browser tab title is built from it too', () => {
    const project = src('src/pages/project.ts');
    expect(project).toContain('document.title = `${runningTitle(p.title).toUpperCase()} — REVACHOL`;');
    expect(project).not.toContain('document.title = `${p.title.toUpperCase()}');
  });
});

describe('the unseen keep the plain string with its slash', () => {
  it('aria labels and the screen-reader list', () => {
    expect(src('src/works/reel-view.ts')).toContain("a.setAttribute('aria-label', `${p.title}. ${p.role}. Open this film.`);");
    expect(src('src/pages/works.ts')).toContain("a.textContent = `${p.title} (${p.year})${isPlaceholder(p) ? ' — placeholder' : ''}`;");
  });
});

// components.css ends on the reveal (`body { visibility: visible; }`): every page hides its body inline until the whole
// stylesheet is parsed, and that rule's comment says it must stay the last one. The lockup's block was first appended
// after it, and nothing failed. This holds the law for whatever is added next.
describe("the stylesheet's reveal stays its last rule", () => {
  it('components.css ends on body { visibility: visible; }, the lockup block standing before it', () => {
    const css = src('src/styles/components.css').replace(/\r\n/g, '\n');
    expect(css.trimEnd().endsWith('body { visibility: visible; }')).toBe(true);
    expect(css.indexOf('--tt-ratio: 0.58;')).toBeGreaterThan(-1);
    expect(css.indexOf('--tt-ratio: 0.58;')).toBeLessThan(css.lastIndexOf('body { visibility: visible; }'));
  });
});
