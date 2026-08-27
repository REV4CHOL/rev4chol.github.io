import { describe, expect, it } from 'vitest';
import { PlaybackManager } from '../src/works/playback';
import type { ViewRect } from '../src/works/priority';
import type { ProjectTile, TileMode } from '../src/works/tile';

/**
 * PlaybackManager only reads/calls this surface on a tile (see update() in
 * ../src/works/playback.ts): project.slug, x, y, extentX(), extentY(), mode,
 * wake(), sleep(), hasVideo(), releaseVideo(). Fakes below implement exactly
 * that, plus call counters for assertions.
 */
interface FakeTile {
  project: { slug: string };
  x: number;
  y: number;
  extentX(): number;
  extentY(): number;
  mode: TileMode;
  wake(): void;
  sleep(): void;
  hasVideo(): boolean;
  releaseVideo(): void;
  wakeCalls: number;
  sleepCalls: number;
  releaseCalls: number;
}

/** wake() creates an element (hasVideo() -> true) unless `broken`, in which case
 *  it simulates a latched, permanent media failure: wake() is called but never
 *  yields a video, exactly like tile.ts's mediaFailed guard once C1 is fixed. */
function makeFakeTile(slug: string, x: number, y: number, opts: { broken?: boolean } = {}): FakeTile {
  let video = false;
  const tile: FakeTile = {
    project: { slug },
    x,
    y,
    extentX: () => 200,
    extentY: () => 100,
    mode: 'sleep',
    wakeCalls: 0,
    sleepCalls: 0,
    releaseCalls: 0,
    wake() {
      tile.wakeCalls++;
      if (tile.mode !== 'sleep') return;
      if (opts.broken) return; // mediaFailed latch: creation never yields a video
      tile.mode = 'live';
      video = true;
    },
    sleep() {
      tile.sleepCalls++;
      tile.mode = 'sleep';
    },
    hasVideo: () => video,
    releaseVideo() {
      tile.releaseCalls++;
      tile.sleep();
      video = false;
    },
  };
  return tile;
}

/** Like makeFakeTile, but exposes failAsync() to simulate the real bug: the
 *  underlying element's async error handler resolving *between* update() ticks
 *  and clearing the video out from under the manager, with no call back into
 *  PlaybackManager — exactly what tile.ts's (pre-fix) 404 handler does. */
function makeFlakyTile(slug: string, x: number, y: number): FakeTile & { failAsync(): void } {
  let video = false;
  const tile = {
    project: { slug },
    x,
    y,
    extentX: () => 200,
    extentY: () => 100,
    mode: 'sleep' as TileMode,
    wakeCalls: 0,
    sleepCalls: 0,
    releaseCalls: 0,
    wake() {
      tile.wakeCalls++;
      if (tile.mode !== 'sleep') return;
      tile.mode = 'live';
      video = true; // synchronous, like createVideo(): hasVideo() is true immediately
    },
    sleep() {
      tile.sleepCalls++;
      tile.mode = 'sleep';
    },
    hasVideo: () => video,
    releaseVideo() {
      tile.releaseCalls++;
      tile.sleep();
      video = false;
    },
    failAsync(): void {
      tile.mode = 'sleep';
      video = false;
    },
  };
  return tile;
}

function makeTiles(fakes: FakeTile[]): Map<string, ProjectTile> {
  const m = new Map<string, ProjectTile>();
  for (const f of fakes) m.set(f.project.slug, f as unknown as ProjectTile);
  return m;
}

// White-box access to PlaybackManager's private bookkeeping. Reading these does
// not touch the class's public contract (constructor + update() stay untouched);
// it only lets the tests observe internal state that the bugs corrupt.
function getLru(manager: PlaybackManager): string[] {
  return (manager as unknown as { lru: string[] }).lru;
}
function getLastSet(manager: PlaybackManager): Set<string> {
  return (manager as unknown as { lastSet: Set<string> }).lastSet;
}

const VIEW: ViewRect = { x: -500, y: -400, w: 1000, h: 800 }; // center (0,0), mirrors tests/priority.test.ts
const HUGE_VIEW: ViewRect = { x: -100000, y: -100000, w: 200000, h: 200000 };
const FAR = 50000; // well outside VIEW's margin (MARGIN = 160 in priority.ts)

describe('PlaybackManager', () => {
  it('wakes tiles that are in view, up to the cap', () => {
    const fakes = Array.from({ length: 20 }, (_, i) => makeFakeTile(`t${i}`, i * 10, 0));
    const manager = new PlaybackManager(makeTiles(fakes));

    manager.update(HUGE_VIEW, null);

    const live = fakes.filter((f) => f.mode === 'live');
    expect(live.length).toBe(Math.min(manager.cap, fakes.length));
    for (const f of live) expect(f.hasVideo()).toBe(true);
  });

  it('sleeps tiles once they leave the set', () => {
    const a = makeFakeTile('a', 0, 0);
    const manager = new PlaybackManager(makeTiles([a]));

    manager.update(VIEW, null);
    expect(a.mode).toBe('live');

    manager.update({ x: VIEW.x + FAR, y: VIEW.y + FAR, w: VIEW.w, h: VIEW.h }, null);
    expect(a.mode).toBe('sleep');
    expect(a.sleepCalls).toBe(1);
  });

  it('never lets a repeatedly-failing tile pile up duplicate lru entries (C1 regression)', () => {
    const flaky = makeFlakyTile('flaky', 0, 0);
    const manager = new PlaybackManager(makeTiles([flaky]));

    for (let i = 0; i < 25; i++) {
      manager.update(VIEW, null);
      flaky.failAsync(); // the "404 arrives" moment, between this tick and the next
    }

    const occurrences = getLru(manager).filter((s) => s === 'flaky').length;
    expect(occurrences).toBeLessThanOrEqual(1);
  });

  it('adopts an externally-woken tile into the lru and evicts once tracked elements overflow (I2 regression)', () => {
    const fakes = Array.from({ length: 30 }, (_, i) => makeFakeTile(`ext${i}`, FAR + i, FAR + i));
    const manager = new PlaybackManager(makeTiles(fakes));
    const rounds = manager.maxElements + 5;

    for (let i = 0; i < rounds; i++) {
      const f = fakes[i];
      f.wake(); // external wake (e.g. hover), bypassing the manager entirely
      expect(f.hasVideo()).toBe(true);
      manager.update(VIEW, f.project.slug); // hovered guarantees this slug is the sole member of `set`
    }

    const totalReleases = fakes.reduce((n, f) => n + f.releaseCalls, 0);
    expect(totalReleases).toBeGreaterThan(0);
    // the tile that is still hovered as of the last call must never itself be evicted
    expect(fakes[rounds - 1].releaseCalls).toBe(0);
  });

  it('never adopts a tile whose media permanently fails, and re-checks it cheaply (C1 behavioral)', () => {
    const broken = makeFakeTile('broken', 0, 0, { broken: true });
    const manager = new PlaybackManager(makeTiles([broken]));

    for (let i = 0; i < 50; i++) manager.update(VIEW, null);

    expect(broken.hasVideo()).toBe(false);
    expect(broken.mode).toBe('sleep');
    expect(getLru(manager)).not.toContain('broken');
    expect(broken.wakeCalls).toBeLessThanOrEqual(50); // bounded — at most one attempt per cycle
    expect(broken.releaseCalls).toBe(0); // never held anything to release
  });

  it('never evicts a tile that is part of the current play set', () => {
    const N = 40;
    const fakes = Array.from({ length: N }, (_, i) => makeFakeTile(`w${i}`, FAR, FAR));
    const manager = new PlaybackManager(makeTiles(fakes));
    const prevReleases = new Map(fakes.map((f) => [f.project.slug, 0]));

    for (let round = 0; round < N; round++) {
      // Rotating window: each round exactly `cap` tiles sit at the view center and
      // the rest sit far away, sliding by one tile per round so lru membership
      // churns continuously and the eviction path runs repeatedly.
      for (let i = 0; i < N; i++) {
        const inWindow = (i - round + N) % N < manager.cap;
        fakes[i].x = inWindow ? 0 : FAR;
        fakes[i].y = inWindow ? 0 : FAR;
      }
      manager.update(VIEW, null);
      const currentSet = getLastSet(manager);
      for (const f of fakes) {
        const prev = prevReleases.get(f.project.slug) ?? 0;
        if (f.releaseCalls > prev) {
          expect(currentSet.has(f.project.slug)).toBe(false);
        }
        prevReleases.set(f.project.slug, f.releaseCalls);
      }
    }

    const totalReleases = fakes.reduce((n, f) => n + f.releaseCalls, 0);
    expect(totalReleases).toBeGreaterThan(0); // sanity: eviction was actually exercised
  });
});
