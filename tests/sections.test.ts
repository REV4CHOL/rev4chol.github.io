import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** THE SECTIONS (owner, 2026-09-16): ABOUT is the original full-fledged page again; the city —
 *  untouched — is the STORY section after CONTACT, the line's end. (Menu order, owner 2026-09-26:
 *  HOMEPAGE, WORK, ABOUT, CONTACT — then STORY; content-files pins the chain.)
 *  The archive trio (about-old.*) is the frozen source the restored ABOUT was copied from.
 *  Same day, later: the tour left STORY entirely — the section is the windshield alone and
 *  opens in AUTO on every platform, FREE the only other seat. */
describe('the sections', () => {
  it('story.html is the windshield alone: the canvas and the dial, no tour', () => {
    const s = readFileSync('story.html', 'utf8');
    expect(s).toContain('<title>STORY — REVACHOL</title>');
    expect(s).toContain('id="a3c"');
    expect(s).toContain('id="a3-fly"');
    expect(s).not.toContain('a3-stations'); // the tour left with its stations…
    expect(s).not.toContain('a3-track'); // …its runway…
    expect(s).not.toContain('a3-rail'); // …and its journey rail
    expect(s).toContain('src="/src/pages/story.ts"');
    expect(s).not.toContain('/src/pages/about.ts');
  });

  it('about.html carries the original: the hero grid, no canvas, its own entry and title', () => {
    const a = readFileSync('about.html', 'utf8');
    expect(a).toContain('<title>ABOUT — REVACHOL</title>');
    expect(a).toContain('class="a-hero-grid"');
    expect(a).toContain('src="/src/pages/about.ts"');
    expect(a).not.toContain('id="a3c"');
    expect(a).not.toContain('about-old.ts');
  });

  it('the archive is its own page still: about-old entry, no music boot', () => {
    const o = readFileSync('about-old.html', 'utf8');
    expect(o).toContain('<title>ABOUT_OLD — REVACHOL</title>');
    expect(o).toContain('src="/src/pages/about-old.ts"');
  });

  it('the build and the shell know the story page', () => {
    expect(readFileSync('vite.config.ts', 'utf8')).toContain("story: p('story.html')");
    const shell = readFileSync('src/shell/shell.ts', 'utf8');
    expect(shell).toContain("story: '/story.html'");
    expect(shell).toMatch(/PageKey = [^;]*'story'/);
  });

  it('the entries wear their own pages: story mounts the flight, about the dossier', () => {
    const story = readFileSync('src/pages/story.ts', 'utf8');
    expect(story).toContain("startPage('story'");
    expect(story).toContain("import '../styles/story.css'");
    expect(story).toContain('mountCity3D');
    expect(story).not.toContain("'tour'"); // AUTO opens the section on every platform
    expect(story).toContain("['auto', 'free']");
    const about = readFileSync('src/pages/about.ts', 'utf8');
    expect(about).toContain("startPage(\n  'about',");
    expect(about).toContain("import '../styles/about.css'");
    expect(about).not.toContain('mountCity3D');
  });
});
