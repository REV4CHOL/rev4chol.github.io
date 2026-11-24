import { describe, expect, it } from 'vitest';
import type { KeyStore } from '../src/lib/quality';
import {
  SMALL_MIN_FPS, WALL_KEY, WALL_MIN_FPS, WATCH_EVERY_MS, WallWatch, readWallMemory, writeWallMemory,
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
