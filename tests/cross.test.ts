import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CROSS, crossedHtml } from '../src/lib/cross';

// (owner, 2026-11-25, of DIRECTOR / EDITOR / COLORIST / SOUND DESIGNER: 'can we replace the "/" with a better, custom
//  designed symbol? This is a website-wide change'. Shown four drawn marks, they chose the cross: "I want a bold, fat
//  red cross (same kind of red we have on website). Make it looks aesthetic".)
describe('the cross between the things a line lists', () => {
  it('each slash that parts a list is drawn as the cross, held to the word before it', () => {
    expect(crossedHtml('DIRECTOR / EDITOR')).toBe(`<span class="rvl-xp">DIRECTOR${CROSS}</span><wbr>EDITOR`);
    expect(crossedHtml('DIRECTOR / EDITOR / COLORIST / SOUND DESIGNER')).toBe(
      `<span class="rvl-xp">DIRECTOR${CROSS}</span><wbr><span class="rvl-xp">EDITOR${CROSS}</span><wbr><span class="rvl-xp">COLORIST${CROSS}</span><wbr>SOUND DESIGNER`,
    );
  });

  it("the phone strip's no-break spaces are understood: a role stays whole, and no line opens on a cross", () => {
    expect(crossedHtml('SOUND\u00a0DESIGNER\u00a0/ COLORIST')).toBe(`SOUND\u00a0<span class="rvl-xp">DESIGNER${CROSS}</span><wbr>COLORIST`);
  });

  it('a line without such a slash is its own text, escaped', () => {
    expect(crossedHtml('COLORIST')).toBe('COLORIST');
    expect(crossedHtml('')).toBe('');
    expect(crossedHtml('<b> & "CO"')).toBe('&#60;b&#62; &#38; &#34;CO&#34;');
    expect(crossedHtml('<I> / <B>')).toBe(`<span class="rvl-xp">&#60;I&#62;${CROSS}</span><wbr>&#60;B&#62;`);
  });

  it('a slash inside a word is part of the word', () => {
    expect(crossedHtml('24/7 EDITOR')).toBe('24/7 EDITOR');
    expect(crossedHtml('AC/DC / EDIT')).toBe(`<span class="rvl-xp">AC/DC${CROSS}</span><wbr>EDIT`);
    expect(crossedHtml('PROCEDURE :: DEATHMAN // ONLINE')).toBe('PROCEDURE :: DEATHMAN // ONLINE');
  });

  it("a line's other marks stay as they are", () => {
    expect(crossedHtml('2026 · DIRECTOR / EDITOR ▪ CLICK TO OPEN')).toBe(
      `2026 · <span class="rvl-xp">DIRECTOR${CROSS}</span><wbr>EDITOR ▪ CLICK TO OPEN`,
    );
  });

  it('the slash stays in the page: read aloud and copied as before, the cross is paint over it', () => {
    expect(CROSS).toBe('<span class="rvl-x"> / </span>');
    expect(CROSS).not.toContain('aria-hidden');
  });
});

describe('where the cross stands', () => {
  const src = (f: string) => readFileSync(f, 'utf8');

  it("a film page: the hero's ROLE readout and the sheet's rows", () => {
    const page = src('src/pages/project.ts');
    expect(page).toContain('${k} :: ${crossedHtml(v.toUpperCase())}');
    for (const field of ['client', 'artist', 'productionHouse'])
      expect(page, field).toContain(`<span>\${crossedHtml(p.${field}.toUpperCase())}</span>`);
    // (who directed and the roles come from the one rule, lib/roles.ts: two directors, or two roles, are parted by the cross)
    expect(page).toContain('<span>${crossedHtml(director.toUpperCase())}</span>');
    expect(page).toContain('<span>${crossedHtml(roles.toUpperCase())}</span>');
  });

  it('WORK: the phone strip, THE LIST and the card of the lifted pane', () => {
    expect(src('src/works/reel-view.ts')).toContain("fillCrossed(el('span', 'rl-role micro'), roleLine(p))");
    // (and the DIRECTED BY line above the roles on all three: a slash between two directors is crossed too)
    expect(src('src/works/reel-view.ts')).toContain("fillCrossed(el('span', 'rl-dir'), dir)");
    expect(src('src/pages/works.ts')).toContain("fillCrossed(span('fl-dir', ''), r.directed)");
    expect(src('src/works/world.ts')).toContain('fillCrossed(dir, directed)');
    expect(src('src/pages/works.ts')).toContain("fillCrossed(span('fl-meta micro', ''), r.meta)");
    expect(src('src/works/world.ts')).toContain('fillCrossed(meta, captionMeta(p, finePointer()))');
  });

  it("ABOUT: the CLASS readout and the sheet's facts", () => {
    const about = src('src/pages/about.ts');
    expect(about).toContain('${k} :: ${crossedHtml(v)}');
    expect(about).toContain('<dd><span>${crossedHtml(f.v.toUpperCase())}</span></dd>');
  });

  it("not the player's time (0:07 / 4:20), not a film's two-language name, not the old about page", () => {
    for (const f of ['src/project/player-bar.ts', 'src/lib/title.ts', 'src/pages/about-old.ts']) expect(src(f), f).not.toContain('crossedHtml');
  });
});

describe('how the cross is drawn', () => {
  const css = readFileSync('src/styles/base.css', 'utf8');
  const rule = (sel: string) => css.slice(css.indexOf(`${sel} {`), css.indexOf('}', css.indexOf(`${sel} {`)));

  it("in the site's red, as a fat plus of twelve corners", () => {
    expect(rule('.rvl-x::before')).toContain('background: var(--alert)');
    const shape = /clip-path: polygon\(([^)]*)\)/.exec(rule('.rvl-x::before'));
    expect(shape?.[1].split(',').length).toBe(12);
  });

  it('its slash is there but unseen, with no shadow of its own; the word before it holds it', () => {
    expect(rule('.rvl-x')).toContain('color: transparent');
    expect(rule('.rvl-x')).toContain('text-shadow: none');
    expect(rule('.rvl-xp')).toContain('white-space: nowrap');
  });

  it('sized by the line it stands in, so it follows every readout from 10 px to 16', () => {
    expect(rule('.rvl-x')).toMatch(/width: [\d.]+em; height: [\d.]+em/);
  });
});
