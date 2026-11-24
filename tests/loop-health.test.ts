import { describe, expect, it } from 'vitest';
import { LoopHealth, type HealthReading, type LoopSample } from '../src/works/loop-health';

// THE LOOPS' HEALTH READING, on made-up readings (spec 2026-11-24-work-wall-video-design, §4.5). Ship A shows it on
// the readout and lets it decide nothing; these are the rules ship B will act on.

interface Loop { slug: string; fps: number; rate: number; from?: number; buffered?: boolean }

/** One reading a second for `seconds`, from `start`. Each loop was told to play at `from` (default: the start) and
 *  presents `rate` frames a second. Returns every reading. */
function run(h: LoopHealth, loops: Loop[], seconds: number, start = 0, quiet: (t: number) => boolean = () => false): HealthReading[] {
  const out: HealthReading[] = [];
  for (let i = 0; i <= seconds; i++) {
    const now = start + i * 1000;
    const samples: LoopSample[] = loops.map((l) => ({
      slug: l.slug,
      playingFor: now - (l.from ?? start),
      presented: Math.max(0, ((now - (l.from ?? start)) / 1000) * l.rate),
      buffered: l.buffered ?? true,
      fps: l.fps,
    }));
    out.push(h.read(now, samples, quiet(now)));
  }
  return out;
}

const loop = (slug: string, rate: number, over: Partial<Loop> = {}): Loop => ({ slug, fps: 24, rate, ...over });

describe("the loops' health reading: the videos' own frames against the frames due", () => {
  it('healthy loops present their frames: judged, and not failed', () => {
    const last = run(new LoopHealth(), [loop('a', 24), loop('b', 24), loop('c', 24)], 10).at(-1)!;
    expect(last).toMatchObject({ counted: 3, judged: true, failed: false });
    expect(last.presented).toBeCloseTo(360);
    expect(last.due).toBeCloseTo(360);
  });

  it('under half of the frames due over 5 s fails; exactly half does not', () => {
    expect(run(new LoopHealth(), [loop('a', 11), loop('b', 11)], 10).at(-1)).toMatchObject({ judged: true, failed: true });
    expect(run(new LoopHealth(), [loop('a', 12), loop('b', 12)], 10).at(-1)).toMatchObject({ judged: true, failed: false });
  });

  it("a loop's frame rate is its own: a 29.97 loop owes more frames than a 24", () => {
    const last = run(new LoopHealth(), [loop('a', 24), loop('b', 14, { fps: 29.97 })], 10).at(-1)!;
    expect(last.due).toBeCloseTo((24 + 29.97) * 5);
    expect(last.presented).toBeCloseTo((24 + 14) * 5);
  });

  it('a counted loop that presents nothing counts as none of its frames: the frozen pane', () => {
    // one healthy loop and two frozen: 24 of 72 frames a second
    expect(run(new LoopHealth(), [loop('a', 24), loop('b', 0), loop('c', 0)], 10).at(-1)).toMatchObject({ counted: 3, judged: true, failed: true });
  });

  it('a loop still downloading is not counted: a slow line is not a slow machine', () => {
    const last = run(new LoopHealth(), [loop('a', 24), loop('b', 24), loop('c', 0, { buffered: false })], 10).at(-1)!;
    expect(last).toMatchObject({ counted: 2, judged: true, failed: false });
  });

  it("a loop's first 3 s are not counted, and nothing is judged before 5 s of counted readings", () => {
    const all = run(new LoopHealth(), [loop('a', 0), loop('b', 0)], 9);
    // counted from 3 s, so the first 5 s window ends at 8 s
    expect(all.slice(0, 8).some((r) => r.judged)).toBe(false);
    expect(all[8]).toMatchObject({ counted: 2, judged: true, failed: true });
  });

  it('a single counted loop is not judged', () => {
    expect(run(new LoopHealth(), [loop('a', 0)], 12).at(-1)).toMatchObject({ counted: 1, judged: false, failed: false });
  });

  it('a hidden page or a paused floor is not judged, and the count starts afresh after it', () => {
    const h = new LoopHealth();
    const all = run(h, [loop('a', 0), loop('b', 0)], 20, 0, (t) => t >= 9000 && t <= 12000);
    expect(all[8].failed).toBe(true);
    for (const r of all.slice(9, 13)) expect(r).toMatchObject({ counted: 0, presented: null, judged: false, failed: false });
    // the first reading after the quiet is at 13 s: the 5 s window starts there
    expect(all.slice(13, 18).some((r) => r.judged), 'the 5 s window starts again').toBe(false);
    expect(all[18]).toMatchObject({ judged: true, failed: true });
  });

  it('a gap between readings (the tab was hidden: the ticker stood still) starts the count afresh too', () => {
    const h = new LoopHealth();
    run(h, [loop('a', 0), loop('b', 0)], 9);
    // (the same two loops, told to play at 0 and still playing a minute later)
    const after = run(h, [loop('a', 0, { from: 0 }), loop('b', 0, { from: 0 })], 6, 60000);
    expect(after.slice(0, 5).some((r) => r.judged)).toBe(false);
    expect(after[5]).toMatchObject({ judged: true, failed: true });
  });

  it('a pane whose video was made anew (its counter fell) is counted from its next window', () => {
    const h = new LoopHealth();
    run(h, [loop('a', 24), loop('b', 24), loop('c', 24)], 8);
    // c's element is new at 9 s: it has presented 0 frames again, and has played 4 s
    const r = h.read(9000, [
      { slug: 'a', playingFor: 9000, presented: 216, buffered: true, fps: 24 },
      { slug: 'b', playingFor: 9000, presented: 216, buffered: true, fps: 24 },
      { slug: 'c', playingFor: 4000, presented: 10, buffered: true, fps: 24 },
    ], false);
    expect(r).toMatchObject({ counted: 2, judged: true, failed: false });
  });
});
