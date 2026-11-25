import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { meetsAny } from '../src/shell/cursor';
import { meets } from '../src/project/watch';

// The owner, 2026-11-24: "across PC and tablet: The artworks inside the work projects of our website got slapped on top
// of the embed video." The synopsis section's two plus marks (.p-plus, z-index 1, scattered at random per film) were
// painted over the playing film. The cause: on a wide screen (and on every fine pointer) the player's wrapper .p-watch
// is `display: contents`, which makes no box, so its `position: relative; z-index: 2` made no stacking level either; the
// player itself was `position: relative` with z-index auto, which paints UNDER any z-index 1 in the same section. (The
// marks take no pointer, so elementFromPoint still answered the frame.) Phones and portrait tablets kept the wrapper's
// box, which is why the bug showed on PC and tablet only. The player now carries its own level, whatever its wrapper.

const css = readFileSync('src/styles/project.css', 'utf8').replace(/\r\n/g, '\n');
const zOf = (selector: string): number | null => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`\\n${esc} \\{([^}]*)\\}`).exec(css);
  if (!m) throw new Error(`no rule for ${selector}`);
  const z = /z-index:\s*(-?\d+)/.exec(m[1]);
  return z ? Number(z[1]) : null;
};

describe('nothing decorative is painted over the player', () => {
  it('the player stands on its own stacking level (a display: contents wrapper gives it none)', () => {
    expect(zOf('.p-player')).toBeGreaterThanOrEqual(2);
  });

  // (the film's thread, 2026-11-25, is a mark of the section like the others: its band and its side box)
  it("every mark of the film's section stands below the player's level", () => {
    const player = zOf('.p-player')!;
    for (const deco of ['.p-plus', '.p-arc-clip', '.p-rail-tag', '.p-checks-v', '.p-thread', '.p-thread-side']) {
      expect(zOf(deco) ?? 0, deco).toBeLessThan(player);
    }
  });

  it("the film layers' hole follows a player that is there from the first paint: re-measured when the fonts land and on load", () => {
    const src = readFileSync('src/pages/project.ts', 'utf8');
    expect(src).toContain('void document.fonts?.ready?.then(syncHoles);');
    expect(src).toContain("window.addEventListener('load', syncHoles);");
  });

  // (inside a cross-origin frame the page hears no pointer at all, measured headless: no move, no over, no out; the cross
  // stood parked at the frame's edge with its readout over the picture, caught by the flat-colour proof)
  it("the site's cursor steps aside before any part of it would touch a film's frame", () => {
    const frame = { left: 100, top: 100, right: 500, bottom: 400 };
    expect(meetsAny([{ left: 90, top: 200, right: 112, bottom: 222 }], [frame])).toBe(true); // the cross at the edge
    expect(meetsAny([{ left: 60, top: 200, right: 82, bottom: 222 }, { left: 89, top: 206, right: 150, bottom: 216 }], [frame])).toBe(true); // its readout
    expect(meetsAny([{ left: 10, top: 200, right: 32, bottom: 222 }], [frame])).toBe(false);
    expect(meetsAny([{ left: 10, top: 200, right: 32, bottom: 222 }], [])).toBe(false);
    expect(readFileSync('src/styles/base.css', 'utf8')).toContain('#cursor.in-frame { visibility: hidden; }');
    expect(readFileSync('src/shell/cursor.ts', 'utf8')).toContain("c.classList.toggle('in-frame', frames.length > 0 && meetsAny(");
  });
});

// Measured on the Android tablet (1280 x 672): a player centred under the header reaches the screen's foot, and the
// HUD's bottom readouts (the pointer's place, the timecode: fixed, above the page) stood over the picture's corners.
// They step aside while they meet the player's box, and come back when it scrolls away.
describe("the HUD's foot readouts step aside from the player", () => {
  it('two boxes meet only where they overlap', () => {
    const a = { left: 0, top: 0, right: 100, bottom: 50 };
    expect(meets(a, { left: 90, top: 40, right: 140, bottom: 60 })).toBe(true);
    expect(meets(a, { left: 100, top: 0, right: 140, bottom: 50 })).toBe(false);
    expect(meets(a, { left: 0, top: 50, right: 100, bottom: 80 })).toBe(false);
  });

  it('the page yields them while they meet, and the style hides a yielding readout', () => {
    expect(readFileSync('src/pages/project.ts', 'utf8')).toContain("h.classList.toggle('hud-yield', meets(");
    expect(css).toMatch(/\.hud\.hud-yield \{[^}]*opacity: 0;/);
  });
});
