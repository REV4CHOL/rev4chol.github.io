import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The review's walkthroughs, 2026-11-25: on a phone the film page's top words (ALL FILMS, the PROCEDURE line, the index)
// stand straight on the hero's loop, and their halo alone lost them over EVER FARAWAY's film-strip band, GALAXY's
// burned-in captions and KATARA's magenta. Each carries a soft pool of the page's own black: no plate, no edge.

const css = readFileSync('src/styles/project.css', 'utf8');
const phone = css.slice(css.indexOf('@media (max-width: 760px) and (pointer: coarse) {'));
const block = phone.slice(0, phone.indexOf('\n}\n'));

describe("the film page's top words on a phone", () => {
  it('each wears a pool under its words, inside the phone block only', () => {
    expect(block).toContain('.p-up::before, .p-status::before, .p-index::before {');
    expect(css.indexOf('.p-up::before, .p-status::before')).toBeGreaterThan(css.indexOf('@media (max-width: 760px) and (pointer: coarse) {'));
  });
  it('the pool has no edge: the black fades out on all four sides', () => {
    const rule = /\.p-up::before, \.p-status::before, \.p-index::before \{([^}]*)\}/.exec(block)?.[1] ?? '';
    expect(rule).toContain('z-index: -1');
    expect(rule).toContain('pointer-events: none');
    expect(rule).toMatch(/mask-image: linear-gradient\(90deg, transparent/);
    expect(rule).toMatch(/linear-gradient\(180deg, transparent/);
    expect(rule).toContain('mask-composite: intersect');
    expect(rule).not.toMatch(/border|box-shadow/);
  });
  it("the header's switch row is not this page's to change", () => {
    expect(block).not.toContain('.hud-tr');
  });
});
