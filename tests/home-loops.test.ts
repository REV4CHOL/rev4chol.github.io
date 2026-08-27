import { describe, expect, it } from 'vitest';
import { CLIP_MS, LOOP_EXTS, LOOP_SLOTS, coverScale, loopCandidates, nextClip } from '../src/home/loops';

describe('homepage reel contract', () => {
  it('probes every slot with every extension, slot-major, mp4 first', () => {
    const slots = loopCandidates();
    expect(slots).toHaveLength(LOOP_SLOTS);
    for (const [i, slot] of slots.entries()) {
      expect(slot.map((c) => c.ext)).toEqual([...LOOP_EXTS]);
      expect(slot[0].url).toBe(`/content/home/loop-${i + 1}.mp4`);
      for (const c of slot) expect(c.slot).toBe(i + 1);
    }
  });

  it('holds each clip for 3 seconds', () => {
    expect(CLIP_MS).toBe(3000);
  });

  it('cover-fits by the larger deficit, with overscan', () => {
    // wide media on a tall screen: height decides
    expect(coverScale(2000, 1000, 1000, 1000)).toBeCloseTo(1.04, 5);
    // tall media on a wide screen: width decides
    expect(coverScale(1000, 2000, 1000, 1000)).toBeCloseTo(1.04, 5);
    // degenerate media never divides by zero
    expect(coverScale(0, 0, 1920, 1080)).toBe(1);
  });

  it('advances round-robin and never advances a single-clip reel', () => {
    expect(nextClip(0, 5)).toBe(1);
    expect(nextClip(4, 5)).toBe(0);
    expect(nextClip(0, 1)).toBe(0);
    expect(nextClip(0, 0)).toBe(0);
  });
});
