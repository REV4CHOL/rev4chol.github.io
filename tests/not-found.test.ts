import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The review's walkthroughs (2026-11-25): an address that does not exist (/nope.html) showed GitHub's own white
// "404 File not found" page, 980 px wide and tiny on a phone, with no way back into the site. GitHub Pages serves a
// repository's 404.html for ANY unknown address, at any depth (/a/b/c/nope), so the site's own page stands there.
const html = readFileSync('404.html', 'utf8').replace(/\r\n/g, '\n');
const head = html.split('</head>')[0];
const entry = readFileSync('src/pages/lost.ts', 'utf8');

describe("the site's own not-found page (404.html)", () => {
  it('is built by Vite like the other pages, its entry the shell of the others', () => {
    expect(readFileSync('vite.config.ts', 'utf8')).toContain("lost: p('404.html')");
    expect(html).toContain('<script type="module" src="/src/pages/lost.ts"></script>');
    expect(entry).toContain("startPage('lost',");
    expect(readFileSync('src/shell/shell.ts', 'utf8')).toMatch(/lost: '',/); // (no menu item is lit on it)
  });

  it("carries the other heads' shared lines (first paint in black, the self-heal, the music boot) and noindex", () => {
    const contact = readFileSync('contact.html', 'utf8').replace(/\r\n/g, '\n').split('<title>')[0];
    expect(head.split('<title>')[0]).toBe(contact);
    expect(head).toContain('<meta name="robots" content="noindex" />');
  });

  it("its title follows the others' pattern, in the SIGNAL LOST grammar of a missing film", () => {
    expect(head).toContain('<title>SIGNAL LOST — REVACHOL</title>');
    expect(html).toContain('<h1 class="statement">SIGNAL LOST</h1>');
    expect(html).toContain('THIS PAGE DOES NOT EXIST');
  });

  it('gives two ways on, to the homepage and to all films', () => {
    expect(html).toContain('<a class="btn" href="/index.html" data-internal>BACK TO THE HOMEPAGE ▸</a>');
    expect(html).toContain('<a class="btn" href="/works.html" data-internal>BACK TO ALL FILMS ▸</a>');
  });

  it('names every address from the root, so it works at any depth', () => {
    const refs = [...html.matchAll(/\b(?:src|href)="([^"]*)"/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(4);
    for (const r of refs) expect(r, r).toMatch(/^\//);
    for (const m of html.matchAll(/'(\/[^']*\.(?:mp3|json|png|ico))'/g)) expect(m[1]).toMatch(/^\//);
  });

  it('is no page of the stack: no glide, no cue; and it looks no film up', () => {
    expect(entry).not.toContain('swipe-nav');
    expect(entry).not.toContain('armGlideNav');
    expect(entry).not.toMatch(/loadProjects|getSlugFromSearch|project/);
  });
});
