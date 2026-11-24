import { describe, expect, it } from 'vitest';
import { holePad, holeProps, holeRect } from '../src/project/holes';

// The owner, 2026-11-25: "I am using phone. The performance when scrolling the Work section is super laggy". On a
// film's page the grain and the scan lines carry two holes (the player, the stills wall) that follow their regions as
// the page scrolls. Measured on a 390 x 844 phone profile: every scroll event wrote eight mask values into both
// full-screen layers, so both were painted again on every scroll frame, even deep inside the 5,700 px stills wall where
// the hole covers the whole screen. A hole is now its region's box clamped to the screen and a margin: nothing that
// shows changes (the layers are the screen, and a mask beyond them masks nothing), and a region that covers or misses
// the screen gives the same values from one frame to the next, so the page writes nothing and nothing repaints.

const W = 390, H = 844, PAD = holePad(H, 1);
const box = (left: number, top: number, width: number, height: number) => ({ left, top, width, height });

describe("the film layers' holes", () => {
  it('a region inside the screen keeps its exact box', () => {
    expect(holeRect(box(12.5, 300.25, 365, 205.3), 1, W, H, PAD)).toEqual(box(12.5, 300.25, 365, 205.3));
  });

  it('the poster lock divides the box into plate px, as before', () => {
    expect(holeRect(box(100, 200, 400, 300), 2, 1440, 900, holePad(900, 2))).toEqual(box(50, 100, 200, 150));
  });

  it('a region taller than the screen, standing over it, gives the same box wherever the page has scrolled', () => {
    const a = holeRect(box(0, -1200, W, 5700), 1, W, H, PAD);
    const b = holeRect(box(0, -1900, W, 5700), 1, W, H, PAD);
    expect(a).toEqual(b);
    // it still covers the whole screen, and a margin round it
    expect(a.top).toBeLessThan(0);
    expect(a.top + a.height).toBeGreaterThan(H);
  });

  it('a region wholly off the screen gives an empty hole that stays put', () => {
    const below1 = holeRect(box(0, 2400, W, 5700), 1, W, H, PAD);
    const below2 = holeRect(box(0, 1800, W, 5700), 1, W, H, PAD);
    expect(below1).toEqual(below2);
    expect(below1.height).toBe(0);
    const above = holeRect(box(0, -900, W, 220), 1, W, H, PAD);
    expect(above.height).toBe(0);
    expect(above).toEqual(holeRect(box(0, -2000, W, 220), 1, W, H, PAD));
  });

  it('an edge inside the screen stays exact while the edge outside it is clamped', () => {
    const r = holeRect(box(0, 500, W, 5700), 1, W, H, PAD);
    expect(r.top).toBe(500);
    expect(r.top + r.height).toBe(H + PAD);
    const up = holeRect(box(0, -3000, W, 3400), 1, W, H, PAD);
    expect(up.top).toBe(-PAD);
    expect(up.top + up.height).toBe(400);
  });

  it('the margin is a quarter of the screen and never under 64 px, in plate px', () => {
    expect(holePad(844, 1)).toBe(211);
    expect(holePad(200, 1)).toBe(64);
    expect(holePad(900, 2)).toBe(112.5);
  });

  it('the mask values read as the stylesheet takes them, and only the regions there are', () => {
    expect(holeProps([['--hole', box(1, 2, 3, 4)], ['--hole2', null]])).toEqual([
      ['--hole-x', '1px'], ['--hole-y', '2px'], ['--hole-w', '3px'], ['--hole-h', '4px'],
    ]);
  });
});
