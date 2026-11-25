import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// THE SYNOPSIS LEFT EVERY FILM PAGE AND THE THREAD STANDS IN ITS PLACE (owner, 2026-11-25: "Completely remove the
// synopsis from all film's pages. AFter removing the synopsis there sure will be a black blank space left empty, so
// make sure it get fill with artwork designs that align with our art direction for that blank space"; of the first
// mock-ups: "the designs need to be muted, subtle"; and, as the build began: "no deleting anything old"). Only the
// synopsis line and its SYN: tag left; the arc, the plus marks and REC: stand as they did.
const read = (f: string) => readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const html = read('project.html');
const css = read('src/styles/project.css');
const page = read('src/pages/project.ts');
const rule = (sel: string) => {
  const i = css.indexOf(`\n${sel} {`);
  if (i < 0) throw new Error(`no rule for ${sel}`);
  return css.slice(i, css.indexOf('}', i));
};

describe('the synopsis is gone', () => {
  it('from the content file, its parser and the editing guide', () => {
    expect(read('public/content/projects.json')).not.toMatch(/"synopsis"/);
    expect(read('src/lib/content.ts')).not.toMatch(/synopsis/i);
    expect(read('HOW-TO-EDIT.md')).not.toMatch(/synopsis/i);
  });

  it('from the page: no line, no SYN: tag', () => {
    expect(html).not.toMatch(/synopsis/i);
    expect(html).not.toContain('SYN:');
    expect(page).not.toMatch(/p-synopsis|p\.synopsis|mountSynopsis/);
    expect(css).not.toContain('.p-synopsis');
    expect(css).not.toContain('.p-syn-sec');
  });

  it('a film page no longer waits for the running text\'s face: nothing on it is set in that face', () => {
    expect(css).not.toContain('var(--f-text)');
    expect(read('src/shell/page.ts')).toMatch(/TEXT_FACE_PAGES[^=]*=\s*\[\s*'about',\s*'contact'\s*\]/);
  });
});

describe('nothing else of the section left', () => {
  it('the arc, the plus marks and REC: stand as they did', () => {
    expect(html).toContain('<div class="p-arc-clip" aria-hidden="true"><div class="p-arc"></div></div>');
    expect(css).toContain('\n.p-arc-clip { position: absolute; inset: -96px 0 -72px; overflow: hidden; pointer-events: none; }');
    expect(rule('.p-arc')).toContain('border: 12px solid rgba(183, 156, 255, 0.38);');
    expect(rule('.p-plus')).toContain('font-size: 26px;');
    expect(css).toContain('\n.p-plus-sig { color: rgba(200, 255, 0, 0.8); }');
    expect(css).toContain('\n.p-plus-alr { color: rgba(255, 46, 99, 0.8); }');
    expect(page).toContain('s.className = `p-plus p-plus-${tone}`;');
    expect(page).toContain("s.style.left = `${52 + Math.floor(rand() * 40)}%`;");
    expect(page).toContain("s.style.top = `${8 + Math.floor(rand() * 70)}%`;");
    expect(html).toContain('<span class="p-rail-tag" aria-hidden="true">REC:</span>');
    expect(css).toContain('\n.p-rail-tag {');
  });
});

describe('the thread stands where the synopsis stood', () => {
  it('a band before the player and a box beside it, both hidden from a screen reader', () => {
    const band = html.indexOf('<div class="p-thread" id="p-thread" aria-hidden="true"></div>');
    const player = html.indexOf('id="p-player"');
    const side = html.indexOf('<div class="p-thread-side" id="p-thread-side" aria-hidden="true" hidden></div>');
    expect(band).toBeGreaterThan(0);
    expect(band).toBeLessThan(player);
    expect(side).toBeGreaterThan(player);
    expect(html).toContain('<section class="p-sec p-film-sec">');
  });

  it('the band keeps its 120 px in the styles, so the player never moves when the script draws', () => {
    expect(rule('.p-thread')).toContain('height: 120px;');
    expect(css).toContain('.p-film-sec .p-thread { grid-column: 1 / -1; grid-row: 1; }');
  });

  it('it takes no pointer, stands under the player, and never moves', () => {
    for (const sel of ['.p-thread', '.p-thread-side']) {
      expect(rule(sel), sel).toContain('pointer-events: none;');
      expect(rule(sel), sel).toContain('z-index: 1;');
    }
    const mine = css.split('\n').filter((l) => l.includes('.p-thread')).join('\n');
    expect(mine).not.toMatch(/animation|transition|filter|sticky/);
  });
});
