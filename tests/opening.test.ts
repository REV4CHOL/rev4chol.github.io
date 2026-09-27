import { describe, expect, it } from 'vitest';
import { openingFrame } from '../src/works/opening';

const pane = (x: number, y: number, featured = true, halfW = 460) => ({ x, y, halfW, featured });

describe("the phone's first frame (the floor used to open on the seam between two featured panes)", () => {
  it('centres the featured pane nearest the origin, whole, fitted to the width', () => {
    const f = openingFrame([pane(-420, -230), pane(420, -230), pane(-420, 230), pane(300, 200)], 375, 0.2)!;
    // nearest featured is (300, 200); its drawn width 2 · 460 = 920 fits 375 − 2 · 18 = 339
    expect(f.scale).toBeCloseTo(339 / 920, 5);
    expect(f.x).toBeCloseTo(-300 * f.scale, 5);
    expect(f.y).toBeCloseTo(-200 * f.scale, 5);
  });

  it('a tie goes to the first in json order; a floor with no featured pane frames any pane', () => {
    const f = openingFrame([pane(200, 0), pane(-200, 0)], 375, 0.2)!;
    expect(f.x).toBeCloseTo(-200 * f.scale, 5);
    const g = openingFrame([pane(50, 50, false, 230), pane(0, 0, false, 230)], 375, 0.2)!;
    expect(g.x).toBeCloseTo(0, 9);
    expect(g.y).toBeCloseTo(0, 9);
  });

  it('the scale never leaves the pinch range', () => {
    expect(openingFrame([pane(0, 0, true, 5000)], 375, 0.2)!.scale).toBe(0.2);
    expect(openingFrame([pane(0, 0, true, 100)], 375, 0.2)!.scale).toBe(1);
    expect(openingFrame([pane(0, 0, true, 100)], 375, 0.2, 2)!.scale).toBeCloseTo(339 / 200, 5);
  });

  it('an empty floor has no frame', () => {
    expect(openingFrame([], 375, 0.2)).toBeNull();
  });
});
