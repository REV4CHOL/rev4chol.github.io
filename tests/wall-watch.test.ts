import { describe, expect, it } from 'vitest';
import type { KeyStore } from '../src/lib/quality';
import {
  SMALL_MIN_FPS, WALL_KEY, WALL_MIN_FPS, WATCH_EVERY_MS, WATCH_GAP_MS, WallWatch, readWallMemory, replayWanted, unjudged,
  writeWallMemory,
} from '../src/works/wall-watch';

// THE WALL'S OWN WATCH (spec 2026-11-24-work-wall-video-design, §4.5): under 18 presented frames a second for 6 s,
// the wall video gives way to its half-size copy; under 12 for 6 s, the copy gives way too.

/** Readings every 2 s from `from`, the video presenting `fps[i]` frames a second in the i-th interval. Returns what
 *  each reading answered. */
function run(watch: WallWatch, from: number, fps: number[], hidden: boolean[] = []): boolean[] {
  let presented = 0;
  const out = [watch.read(from, presented, hidden[0] ?? false)];
  fps.forEach((f, i) => {
    presented += (f * WATCH_EVERY_MS) / 1000;
    out.push(watch.read(from + (i + 1) * WATCH_EVERY_MS, presented, hidden[i + 1] ?? false));
  });
  return out;
}

describe("the wall's own watch", () => {
  it('six seconds under 18 frames a second moves down; five readings at 24 do not', () => {
    expect(run(new WallWatch(WALL_MIN_FPS, 0), 4000, [24, 24, 24, 24, 24])).toEqual([false, false, false, false, false, false]);
    expect(run(new WallWatch(WALL_MIN_FPS, 0), 4000, [10, 10, 10])).toEqual([false, false, false, true]);
    expect(run(new WallWatch(WALL_MIN_FPS, 0), 4000, [17.5, 17.5, 17.5]).at(-1), 'just under the line').toBe(true);
    expect(run(new WallWatch(WALL_MIN_FPS, 0), 4000, [18, 18, 18]).at(-1), 'on the line').toBe(false);
  });

  it('a single bad reading does not, and a good one starts the count again', () => {
    expect(run(new WallWatch(WALL_MIN_FPS, 0), 4000, [24, 5, 24, 24]).includes(true)).toBe(false);
    expect(run(new WallWatch(WALL_MIN_FPS, 0), 4000, [5, 5, 24, 5, 5]).includes(true)).toBe(false);
    expect(run(new WallWatch(WALL_MIN_FPS, 0), 4000, [5, 5, 24, 5, 5, 5]).at(-1)).toBe(true);
  });

  it('the first 4 s after a video starts are not judged', () => {
    // readings at 0, 2, 4, 6, 8, 10 s: the video stalls for its first seconds, then plays
    expect(run(new WallWatch(WALL_MIN_FPS, 0), 0, [0, 0, 24, 24, 24]).includes(true)).toBe(false);
    // it never gets going: the first judged interval is 4 to 6 s, so the verdict comes at 10 s
    expect(run(new WallWatch(WALL_MIN_FPS, 0), 0, [0, 0, 0, 0, 0])).toEqual([false, false, false, false, false, true]);
  });

  it('a hidden page is not judged, and the count starts afresh when it shows again', () => {
    const hidden = [false, false, true, true, false, false, false];
    expect(run(new WallWatch(WALL_MIN_FPS, 0), 4000, [5, 5, 0, 0, 5, 5], hidden).includes(true)).toBe(false);
    expect(run(new WallWatch(WALL_MIN_FPS, 0), 4000, [5, 5, 0, 0, 5, 5, 5, 5], [...hidden, false, false]).at(-1)).toBe(true);
  });

  it('the half-size copy is held to 12 frames a second, and the reading is kept for the readout', () => {
    const w = new WallWatch(SMALL_MIN_FPS, 0);
    expect(run(w, 4000, [14, 14, 14, 14]).includes(true)).toBe(false);
    expect(w.fps).toBeCloseTo(14);
    expect(run(new WallWatch(SMALL_MIN_FPS, 0), 4000, [11, 11, 11]).at(-1)).toBe(true);
    expect(new WallWatch(SMALL_MIN_FPS, 0).fps).toBeNull();
  });
});

// THE FROZEN WALL (owner, on the iPad: "after a while on tablet, the work section got frozen (no panes playing
// stuff)"). The watch took a wall that was not playing for a machine too slow to play it: a wall the browser paused
// (Back from a film page, an app switch) presented no frames, and so did one whose page had its timers stopped. Two
// such moments took the floor to `starved`, where no pane plays, and the session remembered it through a reload.
describe("the wall's watch judges a wall that is playing, and nothing else", () => {
  it('readings far apart start afresh: a page whose timers stopped gets no verdict from the gap', () => {
    const w = new WallWatch(WALL_MIN_FPS, 0);
    expect(w.read(4000, 0, false)).toBe(false);
    expect(w.read(6000, 48, false)).toBe(false);
    // the timers stop for 10 s (an app switch), and the wall presents nothing meanwhile
    expect(w.read(16000, 50, false), 'one reading across the gap').toBe(false);
    expect(w.fps, 'and no rate is made of it').toBe(24);
    // it plays again: still nothing
    expect([w.read(18000, 98, false), w.read(20000, 146, false), w.read(22000, 194, false), w.read(24000, 242, false)])
      .toEqual([false, false, false, false]);
    expect(WATCH_GAP_MS).toBeGreaterThan(WATCH_EVERY_MS);
  });

  it('after a gap the watch still judges: a wall that is truly slow gets its verdict 6 s later', () => {
    const w = new WallWatch(WALL_MIN_FPS, 0);
    w.read(4000, 0, false);
    w.read(16000, 0, false); // the gap
    expect([w.read(18000, 10, false), w.read(20000, 20, false)]).toEqual([false, false]);
    expect(w.read(22000, 30, false), '6 s of readings after the gap').toBe(true);
  });

  it('a paused wall is not judged, whatever stopped it; a playing one on a showing page is', () => {
    expect(unjudged(false, { paused: true })).toBe(true);
    expect(unjudged(true, { paused: false })).toBe(true);
    expect(unjudged(false, { paused: false })).toBe(false);
    const w = new WallWatch(WALL_MIN_FPS, 0);
    let presented = 0;
    const out: boolean[] = [];
    for (let at = 4000; at <= 30000; at += WATCH_EVERY_MS) out.push(w.read(at, presented, unjudged(false, { paused: true })));
    expect(out.includes(true), 'paused for 26 s: no verdict').toBe(false);
    presented = 0;
    expect(w.read(32000, presented, false)).toBe(false);
  });

  it('the page plays its wall again when the wall stands paused on a showing page, never on a hidden one', () => {
    expect(replayWanted(false, { paused: true })).toBe(true);
    expect(replayWanted(true, { paused: true }), 'a hidden page waits until it shows').toBe(false);
    expect(replayWanted(false, { paused: false })).toBe(false);
  });

  it("verdicts written by the old watch are forgotten: the memory moved to a new key", () => {
    expect(WALL_KEY).not.toBe('rvl-wall');
    const m = new Map([['rvl-wall', JSON.stringify({ verdict: 'starved', failed: [] })]]);
    expect(readWallMemory({ getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }))
      .toEqual({ verdict: 'ok', failed: [] });
  });
});

describe("the wall's memory lasts the session", () => {
  const store = (init: Record<string, string> = {}): KeyStore => {
    const m = new Map(Object.entries(init));
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
  };
  const broken: KeyStore = {
    getItem: () => { throw new Error('private mode'); },
    setItem: () => { throw new Error('private mode'); },
  };

  it('nothing remembered: the wall is tried', () => {
    expect(readWallMemory(store())).toEqual({ verdict: 'ok', failed: [] });
    expect(readWallMemory(null)).toEqual({ verdict: 'ok', failed: [] });
  });

  it('a move down and a failed file are written and read back', () => {
    const s = store();
    writeWallMemory(s, { verdict: 'small', failed: ['human.mp4'] });
    expect(readWallMemory(s)).toEqual({ verdict: 'small', failed: ['human.mp4'] });
  });

  it('garbage and a throwing storage read as nothing remembered; writing into one is quiet', () => {
    expect(readWallMemory(store({ [WALL_KEY]: '{oops' }))).toEqual({ verdict: 'ok', failed: [] });
    expect(readWallMemory(store({ [WALL_KEY]: JSON.stringify({ verdict: 'tiny', failed: [] }) }))).toEqual({ verdict: 'ok', failed: [] });
    expect(readWallMemory(store({ [WALL_KEY]: JSON.stringify({ verdict: 'starved', failed: ['a.mp4', 7] }) }))).toEqual({ verdict: 'starved', failed: ['a.mp4'] });
    expect(readWallMemory(broken)).toEqual({ verdict: 'ok', failed: [] });
    expect(() => writeWallMemory(broken, { verdict: 'small', failed: [] })).not.toThrow();
  });
});
