import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WallEntry } from '../src/lib/wall-files';
import type { WallHooks, WallVideo as WallVideoClass } from '../src/works/wall';

// THE WALL UNIT ON A STAND-IN VIDEO (spec 2026-11-24-work-wall-video-design, §4.5): nothing of the wall exists before
// its video has presented a frame; every pane's tile is a frame over ONE shared source; only the unit destroys it.

type Fn = (...a: unknown[]) => void;

/** A stand-in <video>: what the wall unit and Pixi's VideoSource touch, and no more. */
class FakeVideo {
  videoWidth = 1904;
  videoHeight = 1080;
  width = 0;
  height = 0;
  readyState = 4;
  HAVE_ENOUGH_DATA = 4;
  HAVE_FUTURE_DATA = 3;
  HAVE_CURRENT_DATA = 2;
  paused = true;
  ended = false;
  playbackRate = 1;
  muted = false;
  loop = false;
  playsInline = false;
  preload = '';
  src = '';
  loads = 0;
  total = 0;
  droppedFrames = 0;
  private listeners = new Map<string, Set<Fn>>();
  private frameCbs: Fn[] = [];
  addEventListener(type: string, fn: Fn): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(fn);
  }
  removeEventListener(type: string, fn: Fn): void {
    this.listeners.get(type)?.delete(fn);
  }
  fire(type: string): void {
    for (const fn of [...(this.listeners.get(type) ?? [])]) fn();
  }
  requestVideoFrameCallback(fn: Fn): number {
    this.frameCbs.push(fn);
    return this.frameCbs.length;
  }
  cancelVideoFrameCallback(): void {}
  getVideoPlaybackQuality() {
    return { totalVideoFrames: this.total, droppedVideoFrames: this.droppedFrames };
  }
  play(): Promise<void> {
    this.paused = false;
    this.fire('play');
    return Promise.resolve();
  }
  pause(): void {
    this.paused = true;
    this.fire('pause');
  }
  load(): void {
    this.loads++;
  }
  /** the decoder puts one frame on screen */
  present(): void {
    const due = this.frameCbs;
    this.frameCbs = [];
    for (const fn of due) fn(0, {});
  }
}

const ENTRY: WallEntry = {
  file: 'human.mp4', small: 'human-s.mp4', width: 1904, height: 1080, fps: 24, frames: 515,
  tiles: {
    halide: { x: 4, y: 4, w: 626, h: 262, fps: 24 },
    philia: { x: 952, y: 544, w: 466, h: 262, fps: 29.97 },
  },
};

let WallVideo: typeof WallVideoClass;
let made: FakeVideo[] = [];

beforeAll(async () => {
  // Pixi in node (as tests/video-texture.test.ts): stand-ins before pixi.js loads
  const g = globalThis as Record<string, unknown>;
  g.requestAnimationFrame = () => 1;
  g.cancelAnimationFrame = () => {};
  g.HTMLVideoElement = FakeVideo;
  g.window = globalThis;
  g.document = {
    hidden: false,
    createElement: (tag: string) => {
      if (tag !== 'video') return { getContext: () => null };
      const v = new FakeVideo();
      made.push(v);
      return v;
    },
  };
  ({ WallVideo } = await import('../src/works/wall'));
});

beforeEach(() => {
  made = [];
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

/** A wall unit on a stand-in video, with its hooks counted. */
function wall(which: 'full' | 'small' = 'full', entry: WallEntry = ENTRY) {
  const calls = { ready: 0, fail: 0, verdict: 0 };
  const hooks: WallHooks = { onReady: () => calls.ready++, onFail: () => calls.fail++, onVerdict: () => calls.verdict++ };
  const unit = new WallVideo(entry, which, hooks);
  return { unit, v: made.at(-1)!, calls };
}

/** Let Pixi's VideoSource finish loading (it awaits a probe of the browser's video alpha handling): a source
 *  destroyed before that throws inside Pixi, in a test as in a browser. */
const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

describe('the wall unit: one video, one shared source, a frame gate of its own', () => {
  it('plays the listed file, muted and looping, and owns its play', () => {
    const { unit, v } = wall();
    expect(v.src).toBe('/content/walls/human.mp4');
    expect([v.muted, v.loop, v.playsInline, v.preload, v.paused]).toEqual([true, true, true, 'auto', false]);
    expect(unit.file).toBe('human.mp4');
    expect(wall('small').v.src).toBe('/content/walls/human-s.mp4');
  });

  it('before the video has presented a frame there is no tile at all', () => {
    const { unit, calls } = wall();
    expect(unit.ready).toBe(false);
    expect(unit.textureFor('halide')).toBeNull();
    expect(calls.ready).toBe(0);
  });

  it('the first frame opens the gate: each film gets its tile, half a pixel inside its picture, over the one source', async () => {
    const { unit, v, calls } = wall();
    v.present();
    await settle();
    expect(calls.ready).toBe(1);
    expect(unit.ready).toBe(true);
    const a = unit.textureFor('halide')!;
    const b = unit.textureFor('philia')!;
    expect([a.frame.x, a.frame.y, a.frame.width, a.frame.height]).toEqual([4.5, 4.5, 625, 261]);
    expect([b.frame.x, b.frame.y, b.frame.width, b.frame.height]).toEqual([952.5, 544.5, 465, 261]);
    expect(a.source).toBe(b.source);
    expect([a.source.width, a.source.height]).toEqual([1904, 1080]);
    expect(unit.textureFor('a-film-with-no-tile'), 'its pane plays its own loop').toBeNull();
    unit.destroy();
  });

  it('the half-size copy uses the same map, halved', async () => {
    const { unit, v } = wall('small');
    v.videoWidth = 952;
    v.videoHeight = 540;
    v.present();
    await settle();
    const a = unit.textureFor('halide')!;
    expect([a.frame.x, a.frame.y, a.frame.width, a.frame.height]).toEqual([2.5, 2.5, 312, 130]);
    unit.destroy();
  });

  it('a file that errors, or presents no frame in 8 s, has failed; one that plays has not', async () => {
    const broken = wall();
    broken.v.fire('error');
    expect(broken.calls.fail).toBe(1);
    const silent = wall();
    vi.advanceTimersByTime(7900);
    expect(silent.calls.fail).toBe(0);
    vi.advanceTimersByTime(200);
    expect(silent.calls.fail).toBe(1);
    const fine = wall();
    fine.v.present();
    await settle();
    vi.advanceTimersByTime(9000);
    expect(fine.calls.fail).toBe(0);
    fine.unit.destroy();
  });

  it("its watch reads the video's own frame totals every 2 s: 6 s under 18 a second is a verdict", async () => {
    const { unit, v, calls } = wall();
    v.present();
    await settle();
    // 4 s of grace, then a video presenting 10 frames a second and dropping the rest
    for (let s = 2; s <= 12; s += 2) {
      v.total = s * 24;
      v.droppedFrames = s * 14;
      vi.advanceTimersByTime(2000);
    }
    expect(calls.verdict).toBeGreaterThanOrEqual(1);
    expect(unit.reading()).toMatchObject({ file: 'human.mp4', ready: true, decoded: 288, dropped: 168 });
    expect(unit.reading().fps).toBeCloseTo(10);
    unit.destroy();
  });

  it('a wall that holds its frame rate gets no verdict', async () => {
    const { unit, v, calls } = wall();
    v.present();
    await settle();
    for (let s = 2; s <= 20; s += 2) {
      v.total = s * 24;
      vi.advanceTimersByTime(2000);
    }
    expect(calls.verdict).toBe(0);
    unit.destroy();
  });

  it('destroying the unit gives the decoder back: the tiles go, the video is paused and emptied, and nothing fires after', async () => {
    const { unit, v, calls } = wall();
    v.present();
    await settle();
    const a = unit.textureFor('halide')!;
    const source = a.source;
    unit.destroy();
    expect(a.destroyed).toBe(true);
    expect(source.destroyed).toBe(true);
    expect(v.paused).toBe(true);
    expect(v.src).toBe('');
    expect(v.loads).toBeGreaterThan(0);
    expect(unit.textureFor('halide')).toBeNull();
    v.fire('error'); // an emptied element reports an error: it is not a failure of the wall
    vi.advanceTimersByTime(20000);
    expect(calls).toEqual({ ready: 1, fail: 0, verdict: 0 });
  });

  it('destroyed before its first frame, it empties the video itself and never opens', () => {
    const { unit, v, calls } = wall();
    unit.destroy();
    expect(v.paused).toBe(true);
    expect(v.src).toBe('');
    v.present();
    vi.advanceTimersByTime(20000);
    expect(calls).toEqual({ ready: 0, fail: 0, verdict: 0 });
  });
});
