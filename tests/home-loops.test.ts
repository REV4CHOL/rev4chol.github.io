import { describe, expect, it } from 'vitest';
import { CLIP_MS, LOOP_EXTS, LOOP_SLOTS, colorWord, coverScale, loopCandidates, nextClip, parseHsl } from '../src/home/loops';

describe('homepage reel contract', () => {
  it('probes every slot with every extension in both spellings, mp4 first', () => {
    const slots = loopCandidates();
    expect(slots).toHaveLength(LOOP_SLOTS);
    for (const [i, slot] of slots.entries()) {
      expect(slot.map((c) => c.ext)).toEqual(LOOP_EXTS.flatMap((e) => [e, e]));
      expect(slot[0].url).toBe(`/content/home/loop-${i + 1}.mp4`);
      expect(slot[1].url).toBe(`/content/home/loop_${i + 1}.mp4`);
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

describe('the dream is the color of the footage', () => {
  it('parses the accent strings setAccent writes', () => {
    expect(parseHsl('hsl(286 31% 58%)')).toEqual({ h: 286, s: 31, l: 58 });
    expect(parseHsl('#C8FF00')).toBeNull();
    expect(parseHsl('junk')).toBeNull();
  });

  it('names every hue band', () => {
    expect(colorWord(286, 60)).toBe('PURPLE'); // the fish keep their word
    expect(colorWord(5, 70)).toBe('CRIMSON');
    expect(colorWord(350, 70)).toBe('CRIMSON');
    expect(colorWord(30, 70)).toBe('AMBER');
    expect(colorWord(55, 70)).toBe('GOLDEN');
    expect(colorWord(120, 70)).toBe('VERDANT');
    expect(colorWord(180, 70)).toBe('TEAL');
    expect(colorWord(220, 70)).toBe('COBALT');
    expect(colorWord(320, 70)).toBe('MAGENTA');
  });

  it('washed-out footage dreams in silver, whatever the hue', () => {
    expect(colorWord(220, 8)).toBe('SILVER');
    expect(colorWord(0, 0)).toBe('SILVER');
  });
});
