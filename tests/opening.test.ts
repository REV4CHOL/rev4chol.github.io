import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DESKTOP_VIEW_W, openingFor, openingFrame, pcOpening } from '../src/works/opening';
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

  // (owner, 2026-11-25: "for PC's work section when first booting up, I want the view to already be maxed zoomed out.
  // Right now its already zoom in a bit, and I dont like it". It stood at scale 1; the wheel's floor is 0.5.)
  it('a PC opens fully zoomed out: the cluster at the middle, at the scale the wheel can go no further out than', () => {
    for (const w of [1366, 1440, 1920, 2560, 3840]) {
      expect(openingFor(floor, { w, h: 900 }, true, min(w)), `${w} px wide`).toEqual({ x: 0, y: 0, scale: 0.5 });
    }
    // a narrow PC window too (it keeps the floor and its mouse): its own floor, whatever its width
    for (const w of [1280, 960, 800, 600, 320]) {
      expect(openingFor(floor, { w, h: 900 }, true, min(w)), `${w} px wide`).toEqual({ x: 0, y: 0, scale: min(w) });
    }
    expect(pcOpening(0.5)).toEqual({ x: 0, y: 0, scale: 0.5 });
  });

  it('never the phone frame for a mouse, however narrow its window', () => {
    expect(openingFor(floor, { w: 390, h: 844 }, true, min(390))).toEqual(pcOpening(min(390)));
  });

  it('world.ts asks the one rule for every screen, a mouse included', () => {
    const world = readFileSync('src/works/world.ts', 'utf8');
    expect(world).toMatch(/const frame = openingFor\(\s*\[\.\.\.w\.tiles\.values\(\)\]/);
    expect(world).toMatch(/\{ w: app\.screen\.width, h: app\.screen\.height \},\s*finePointer\(\),\s*minZoom\(\),/);
    expect(world).not.toMatch(/if \(touchLayout\(\)\) \{\s*const frame/);
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

describe('Back from a film returns the wall as the visitor left it', () => {
  // The burst that opens a film moves the camera onto that film. A page the browser restores on Back kept the
  // burst's camera: with the wall opening fully zoomed out (owner, 2026-11-25) it came back shifted off its middle
  // (measured on a 1920 px PC: the camera 264 px right and 86 px down of where it stood).
  const world = readFileSync('src/works/world.ts', 'utf8');
  it('enter() notes where the camera stood before the burst moves it', () => {
    expect(world).toMatch(/const stood = \{ x: this\.pan\.pos\.x, y: this\.pan\.pos\.y \};/);
  });
  it('the restore (Back, or a navigation that stalled) puts the camera back there', () => {
    expect(world).toMatch(/this\.armRestore\(\(\) => this\.resetBurst\(tile, jitter, stood\)\);/);
    expect(world).toMatch(/armFailsafe\(\(\) => this\.resetBurst\(tile, jitter, stood\)\);/);
    expect(world).toMatch(/gsap\.killTweensOf\(this\.pan\.pos\);\s*this\.pan\.panTo\(stood\.x, stood\.y\);/);
  });
});
