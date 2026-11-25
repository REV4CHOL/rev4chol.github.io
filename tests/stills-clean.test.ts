import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// THE STILLS WEAR NO VIEWFINDER (owner, 2026-11-25: "Website-wide: Remove all camera frame viewfinders from the stills
// in film's pages in all platforms."). The corner ticks inset on every still are gone, on every wall (landscape, vertical,
// stills in pillars) and every screen. The hero's scan frame and the player's corner ticks are not stills: they stay.
const sheets = readdirSync('src/styles').filter((f) => f.endsWith('.css') && !f.startsWith('about-old'));
const all = sheets.map((f) => readFileSync(`src/styles/${f}`, 'utf8')).join('\n');
const project = readFileSync('src/styles/project.css', 'utf8');

describe("a film page's stills", () => {
  it('draw nothing over or around a still: no pseudo-element on a still, in any sheet or screen', () => {
    // (.p-still itself, not .p-stillcol: a pillar's end mark and the seam between pillars are not on a still)
    expect(all).not.toMatch(/\.p-still(?![-\w])[^{,]*::?(after|before)/);
    expect(project).not.toContain('corner ticks inset on every frame');
  });

  it('keep their number, caption, hover push-in and reveal', () => {
    expect(project).toContain('\n.p-still-num {');
    expect(project).toContain('\n.p-still figcaption {');
    expect(project).toContain('.p-still:hover img { transform: scale(1.02); }');
    expect(project).toContain('.p-still.revealed canvas { opacity: 0; }');
  });

  it("the hero's scan frame and the player's corner ticks are not stills, and stay", () => {
    expect(project).toContain('\n.p-scanframe {');
    expect(project).toContain('\n.p-player::after, .p-parts::after {');
  });
});
