import { describe, expect, it } from 'vitest';
import { POINTED_RELEASE_MS, PlaybackManager, SLEEP_RELEASE_MS, releaseAfterMs, type PlaybackPolicy } from '../src/works/playback';
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

    // Deterministic: 'flaky' is the sole tile and always sits inside VIEW, so it is the
    // sole play-set member every round. Each round either pushes it (first time) or
    // touch()es the existing entry — never a second push — so exactly one entry survives.
    const occurrences = getLru(manager).filter((s) => s === 'flaky').length;
    expect(occurrences).toBe(1);
  });

  it('adopts an externally-woken tile into the lru and evicts once tracked elements overflow (I2 regression)', () => {
    // (enough tiles for maxElements + 5 rounds: 30 held while the cap was 12, 64 since it is 14, 2026-11-24)
    const fakes = Array.from({ length: 64 }, (_, i) => makeFakeTile(`ext${i}`, FAR + i, FAR + i));
    const manager = new PlaybackManager(makeTiles(fakes));
    const rounds = manager.maxElements + 5;

    for (let i = 0; i < rounds; i++) {
      const f = fakes[i];
      f.wake(); // external wake (e.g. hover), bypassing the manager entirely
      expect(f.hasVideo()).toBe(true);
      manager.update(VIEW, f.project.slug); // hovered guarantees this slug is the sole member of `set`
      // the just-adopted slug is always the sole `set` member this round, so eviction
      // (which only ever removes a victim outside `set`) can never pick it as a target
      expect(getLru(manager)).toContain(f.project.slug);
    }

    const totalReleases = fakes.reduce((n, f) => n + f.releaseCalls, 0);
    expect(totalReleases).toBeGreaterThan(0);
    // the tile that is still hovered as of the last call must never itself be evicted
    expect(fakes[rounds - 1].releaseCalls).toBe(0);
    // eviction settles the lru back at or under the cap, never left to grow past it
    expect(getLru(manager).length).toBeLessThanOrEqual(manager.maxElements);
  });

  it('never adopts a tile whose media permanently fails, and re-checks it cheaply (C1 behavioral)', () => {
    const broken = makeFakeTile('broken', 0, 0, { broken: true });
    const manager = new PlaybackManager(makeTiles([broken]));

    for (let i = 0; i < 50; i++) manager.update(VIEW, null);

    expect(broken.hasVideo()).toBe(false);
    expect(broken.mode).toBe('sleep');
    expect(getLru(manager)).not.toContain('broken');
    // Deterministic: 'broken' never leaves mode 'sleep' (the broken-media branch returns
    // before setting mode = 'live'), so update()'s `if (tile.mode === 'sleep') tile.wake()`
    // fires on every single cycle — exactly one attempt per cycle, 50 cycles.
    expect(broken.wakeCalls).toBe(50);
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

// THE FLOOR'S MODES (spec 2026-11-24-work-wall-video-design, §4.1, §4.7): the world hands the manager a policy. It
// says how many panes may decode their own loop, which panes may at all, whether the floor is paused, and how long a
// sleeping pane keeps its video.
describe('PlaybackManager under a policy', () => {
  /** a cap larger than any floor in these tests: every pane may play (the real number is lib/quality.ts's) */
  const WHOLE = 99;
  const policy = (over: Partial<PlaybackPolicy> = {}): PlaybackPolicy => ({
    cap: () => WHOLE, mayPlay: () => true, paused: () => false, releaseAfter: () => SLEEP_RELEASE_MS, ...over,
  });
  const AWAY: ViewRect = { x: VIEW.x + FAR, y: VIEW.y + FAR, w: VIEW.w, h: VIEW.h };

  it('a pane asleep 20 s gives its video back; one asleep 19 s keeps it', () => {
    const a = makeFakeTile('a', 0, 0);
    const manager = new PlaybackManager(makeTiles([a]), policy());
    manager.update(VIEW, null, 0);
    expect(a.hasVideo()).toBe(true);
    manager.update(AWAY, null, 1000); // the view leaves: the pane sleeps, its video paused
    expect(a.mode).toBe('sleep');
    manager.update(AWAY, null, 20000); // 19 s asleep
    expect(a.hasVideo()).toBe(true);
    expect(a.releaseCalls).toBe(0);
    manager.update(AWAY, null, 21000); // 20 s asleep
    expect(a.hasVideo()).toBe(false);
    expect(a.releaseCalls).toBe(1);
    expect(getLru(manager)).not.toContain('a');
  });

  it('a pane that wakes again before its 20 s starts the count afresh', () => {
    const a = makeFakeTile('a', 0, 0);
    const manager = new PlaybackManager(makeTiles([a]), policy());
    manager.update(VIEW, null, 0);
    manager.update(AWAY, null, 1000);
    manager.update(VIEW, null, 15000); // back in view
    manager.update(AWAY, null, 16000);
    manager.update(AWAY, null, 30000); // 14 s asleep this time
    expect(a.releaseCalls).toBe(0);
    manager.update(AWAY, null, 36000);
    expect(a.releaseCalls).toBe(1);
  });

  it('the wait is the mode\'s: 20 s on a floor of own loops, 5 s for a loop beside the wall', () => {
    expect(releaseAfterMs('own')).toBe(SLEEP_RELEASE_MS);
    expect(releaseAfterMs('posters')).toBe(SLEEP_RELEASE_MS);
    expect(releaseAfterMs('wall')).toBe(POINTED_RELEASE_MS);
    expect(releaseAfterMs('wall-small')).toBe(POINTED_RELEASE_MS);
    expect(releaseAfterMs('starved')).toBe(POINTED_RELEASE_MS);
    expect([SLEEP_RELEASE_MS, POINTED_RELEASE_MS]).toEqual([20000, 5000]);
    const a = makeFakeTile('a', 0, 0);
    const manager = new PlaybackManager(makeTiles([a]), policy({ releaseAfter: () => POINTED_RELEASE_MS }));
    manager.update(VIEW, 'a', 0); // pointed
    manager.update(VIEW, null, 1000); // (in view still, and playing: nothing to release)
    manager.update(AWAY, null, 2000);
    manager.update(AWAY, null, 6900);
    expect(a.releaseCalls).toBe(0);
    manager.update(AWAY, null, 7000);
    expect(a.releaseCalls).toBe(1);
  });

  it('no pane wakes while the floor is paused, however often it is asked', () => {
    let paused = true;
    const fakes = Array.from({ length: 6 }, (_, i) => makeFakeTile(`p${i}`, i * 10, 0));
    const manager = new PlaybackManager(makeTiles(fakes), policy({ paused: () => paused }));
    for (let i = 0; i < 5; i++) manager.update(HUGE_VIEW, 'p0', i * 1000); // a tier change, a pointer, a tick
    expect(fakes.reduce((n, f) => n + f.wakeCalls, 0)).toBe(0);
    paused = false;
    manager.update(HUGE_VIEW, null, 6000);
    expect(fakes.every((f) => f.mode === 'live')).toBe(true);
  });

  it('beside a wall only the pointed pane and the panes with no tile play their own loop, and they share the cap', () => {
    const fakes = Array.from({ length: 8 }, (_, i) => makeFakeTile(`w${i}`, i * 10, 0));
    const noTile = new Set(['w1', 'w2', 'w3', 'w4']);
    const manager = new PlaybackManager(makeTiles(fakes), policy({ cap: () => 3, mayPlay: (slug) => noTile.has(slug) }));
    manager.update(HUGE_VIEW, null, 0);
    expect(fakes.filter((f) => f.mode === 'live').map((f) => f.project.slug)).toEqual(['w1', 'w2', 'w3']);
    manager.update(HUGE_VIEW, 'w7', 1000); // the pointer comes over a pane that has a tile: its own loop plays too
    expect(fakes.filter((f) => f.mode === 'live').map((f) => f.project.slug)).toEqual(['w1', 'w2', 'w7']);
    expect(getLastSet(manager).size).toBe(3);
  });

  it('starved: only the pointed pane plays', () => {
    const fakes = Array.from({ length: 5 }, (_, i) => makeFakeTile(`s${i}`, i * 10, 0));
    const manager = new PlaybackManager(makeTiles(fakes), policy({ cap: () => 1, mayPlay: () => false }));
    manager.update(HUGE_VIEW, null, 0);
    expect(fakes.filter((f) => f.mode === 'live')).toHaveLength(0);
    manager.update(HUGE_VIEW, 's3', 1000);
    expect(fakes.filter((f) => f.mode === 'live').map((f) => f.project.slug)).toEqual(['s3']);
  });

  it('giving everything back: every video released, the pointed pane kept when asked', () => {
    const fakes = Array.from({ length: 4 }, (_, i) => makeFakeTile(`r${i}`, i * 10, 0));
    const manager = new PlaybackManager(makeTiles(fakes), policy());
    manager.update(HUGE_VIEW, 'r2', 0);
    manager.releaseAll('r2');
    expect(fakes.map((f) => f.hasVideo())).toEqual([false, false, true, false]);
    expect(getLru(manager)).toEqual(['r2']);
    manager.releaseAll();
    expect(fakes.some((f) => f.hasVideo())).toBe(false);
    expect(getLru(manager)).toEqual([]);
    expect(getLastSet(manager).size).toBe(0);
  });

  it('a change of mode gives back at once every video that is not playing', () => {
    let cap = WHOLE;
    const fakes = Array.from({ length: 6 }, (_, i) => makeFakeTile(`m${i}`, i * 10, 0));
    const manager = new PlaybackManager(makeTiles(fakes), policy({ cap: () => cap, mayPlay: (slug) => cap === WHOLE || slug === 'none' }));
    manager.update(HUGE_VIEW, 'm4', 0); // own loops: all six play
    expect(fakes.every((f) => f.hasVideo())).toBe(true);
    cap = 3; // the wall takes over: no pane but the pointed one may play
    manager.update(HUGE_VIEW, 'm4', 1000);
    manager.releaseIdle();
    expect(fakes.map((f) => f.hasVideo())).toEqual([false, false, false, false, true, false]);
    expect(fakes[4].mode, 'the pointed pane keeps its loop').toBe('live');
  });

  it('without a policy the manager is as it was: the tier\'s cap, every pane, never paused', () => {
    const fakes = Array.from({ length: 3 }, (_, i) => makeFakeTile(`d${i}`, i * 10, 0));
    const manager = new PlaybackManager(makeTiles(fakes));
    manager.update(HUGE_VIEW, null);
    expect(fakes.every((f) => f.mode === 'live')).toBe(true);
  });
});
