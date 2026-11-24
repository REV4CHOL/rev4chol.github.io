import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DESKTOP_VIEW_W, openingFor, openingFrame } from '../src/works/opening';
import { reelMode } from '../src/works/reel';

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

describe('a tablet opens on what a desktop shows (owner, on an iPad: "it got zoomed WAY TOO CLOSE to the panes")', () => {
  const floor = [pane(-420, -230), pane(420, -230), pane(300, 200)];
  const min = (w: number) => Math.max(0.16, Math.min(0.5, w / 1920)); // world.ts minZoom

  it('a fine pointer keeps its own opening: no frame, the cluster at scale 1', () => {
    expect(openingFor(floor, { w: 1440, h: 900 }, true, min(1440))).toBeNull();
    expect(openingFor(floor, { w: 1920, h: 1080 }, true, min(1920))).toBeNull();
    expect(openingFor(floor, { w: 1366, h: 939 }, true, min(1366))).toBeNull();
  });

  it('a touch screen the floor reaches opens on the cluster, showing the width of world a full-HD desktop shows', () => {
    for (const [w, h] of [[1366, 939], [1180, 735], [1024, 1281], [1280, 672], [800, 1152], [2732, 2048]]) {
      const f = openingFor(floor, { w, h }, false, min(w))!;
      expect(f.x).toBe(0);
      expect(f.y).toBe(0);
      expect(f.scale).toBeCloseTo(Math.min(1, Math.max(min(w), w / DESKTOP_VIEW_W)), 9);
    }
    // the iPad 13-inch in landscape: 1366 / 1920 of the full-HD view, every pane at the size it has on that desktop
    expect(openingFor(floor, { w: 1366, h: 939 }, false, 0.5)!.scale).toBeCloseTo(1366 / 1920, 9);
    // never closer than a desktop's scale 1, never further out than the pinch allows
    expect(openingFor(floor, { w: 2732, h: 2048 }, false, 0.5)!.scale).toBe(1);
    expect(openingFor(floor, { w: 700, h: 1000 }, false, 0.5)!.scale).toBe(0.5);
  });

  it("the phone's cut is the strip's own (reelMode): a phone-shaped screen on the floor still opens on one pane", () => {
    // (the strip is decided once, as the page loads: a tablet that narrows later, split view, builds its next chapter's
    // floor at the narrow size)
    for (const [w, h] of [[390, 844], [640, 900], [900, 500], [844, 390]]) {
      expect(reelMode({ coarse: true, width: w, height: h })).toBe(true);
      expect(openingFor(floor, { w, h }, false, min(w))).toEqual(openingFrame(floor, w, min(w)));
    }
    for (const [w, h] of [[641, 900], [900, 501]]) {
      expect(reelMode({ coarse: true, width: w, height: h })).toBe(false);
      expect(openingFor(floor, { w, h }, false, min(w))!.x).toBe(0);
    }
  });

  it("the full-HD width is the one the pinch's floor already names", () => {
    expect(DESKTOP_VIEW_W).toBe(1920);
    const world = readFileSync('src/works/world.ts', 'utf8');
    expect(world).toContain('app.screen.width / 1920');
    expect(world).toContain('openingFor(');
  });
});
