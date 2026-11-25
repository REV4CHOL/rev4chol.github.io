import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HOLD_MS, placeIn, restoreStep, shouldRestore, targetY, withPlace } from '../src/lib/keep-place';

// The review's walkthroughs, 2026-11-25: a film page scrolled to 2600 and reloaded came back at 961 (the synopsis and the
// top of the player), and ABOUT scrolled to 1600 came back at 1180 and stayed there. These pages build themselves from
// JSON after the load, so the browser puts the scroll back while the page is still short and clamps it. The page now
// keeps the visitor's place in its own history entry and puts it back itself once the page is tall enough.

describe("the visitor's place, kept in the history entry", () => {
  it('is written in plate px beside whatever the entry already holds, and read back', () => {
    const s = withPlace({ other: 1 }, 2600, 1);
    expect(s).toEqual({ other: 1, rvlPlace: { y: 2600 } });
    expect(placeIn(s)).toEqual({ y: 2600 });
  });

  it('under the poster lock the place is the plate place (the scroll divided by the zoom)', () => {
    expect(placeIn(withPlace(null, 1176, 0.98))).toEqual({ y: 1200 });
  });

  it('an entry with nothing usable holds no place', () => {
    for (const s of [null, undefined, 'x', 3, {}, { rvlPlace: null }, { rvlPlace: { y: 'a' } }, { rvlPlace: { y: -4 } }, { rvlPlace: { y: NaN } }]) {
      expect(placeIn(s)).toBeNull();
    }
  });

  it('the top of the page is no place to put back', () => {
    expect(placeIn(withPlace(null, 0, 1))).toBeNull();
  });
});

describe('when the place is put back', () => {
  const at = { y: 2600 };
  it('after a reload, and after Back or Forward to the page', () => {
    expect(shouldRestore('reload', '', at)).toBe(true);
    expect(shouldRestore('back_forward', '', at)).toBe(true);
  });

  it('never on a fresh visit (a link, the address typed), even to the same film', () => {
    expect(shouldRestore('navigate', '', at)).toBe(false);
    expect(shouldRestore('prerender', '', at)).toBe(false);
    expect(shouldRestore(undefined, '', at)).toBe(false);
  });

  it('never for an address with a #hash: the hash decides where the page stands', () => {
    expect(shouldRestore('reload', '#p-player', at)).toBe(false);
  });

  it('never without a place', () => {
    expect(shouldRestore('reload', '', null)).toBe(false);
  });

  it('the plate place is scrolled to at the zoom the page has now', () => {
    expect(targetY({ y: 1200 }, 1)).toBe(1200);
    expect(targetY({ y: 1200 }, 0.9486)).toBe(1138);
  });
});

describe('putting it back, step by step', () => {
  const base = { target: 2600, y: 961, reachedAt: null as number | null, now: 1000, deadline: 9000 };

  it('waits while the page is too short to stand there', () => {
    expect(restoreStep({ ...base, max: 1500 })).toEqual({ to: null, reachedAt: null, done: false });
  });

  it('goes there as soon as the page is tall enough', () => {
    expect(restoreStep({ ...base, max: 10658 })).toEqual({ to: 2600, reachedAt: 1000, done: false });
  });

  it('holds the place a moment once there: anything late that moves the page is put right', () => {
    expect(restoreStep({ ...base, max: 10658, y: 2600, reachedAt: 1000, now: 1200 })).toEqual({ to: null, reachedAt: 1000, done: false });
    expect(restoreStep({ ...base, max: 10658, y: 2400, reachedAt: 1000, now: 1300 })).toEqual({ to: 2600, reachedAt: 1000, done: false });
    expect(restoreStep({ ...base, max: 10658, y: 2600, reachedAt: 1000, now: 1000 + HOLD_MS })).toEqual({ to: null, reachedAt: 1000, done: true });
  });

  it('a page a pixel short still counts as tall enough (the browser rounds)', () => {
    expect(restoreStep({ ...base, max: 2599.5 }).to).toBe(2600);
  });

  it('gives up at its deadline, wherever the page stands', () => {
    expect(restoreStep({ ...base, max: 1500, now: 9001 })).toEqual({ to: null, reachedAt: null, done: true });
  });
});

describe('armed where a page builds late and scrolls', () => {
  it('the film page and ABOUT arm it before their boot', () => {
    for (const f of ['src/pages/project.ts', 'src/pages/about.ts']) {
      const src = readFileSync(f, 'utf8');
      expect(src).toContain("import { keepPlace } from '../lib/keep-place'");
      expect(src.indexOf('keepPlace()')).toBeGreaterThan(-1);
      expect(src.indexOf('keepPlace()')).toBeLessThan(src.indexOf('startPage('));
    }
  });
});
