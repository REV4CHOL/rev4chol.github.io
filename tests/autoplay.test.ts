import { beforeEach, describe, expect, it } from 'vitest';
import {
  autoplayRefused, imageLoopsWork, isRefusal, loopsAsImages, noteImageLoops, noteRefusal, onRefusal, resetAutoplay, SESSION_KEY,
} from '../src/lib/autoplay';

// (owner, 2026-10-20: "i dont care which power mode iphone is on, but I want all the sections in both the homepage and
// work section to play all video right away") — iOS Low Power Mode refuses a video's play() with NotAllowedError; the
// loops then stand as MP4 images (Safari), and the visit remembers it.
const store = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } };
};

describe('a refused play()', () => {
  beforeEach(() => resetAutoplay());

  it('is a NotAllowedError, and nothing else: a bad file or a load cut short is not a refusal', () => {
    expect(isRefusal(new DOMException('no gesture', 'NotAllowedError'))).toBe(true);
    expect(isRefusal({ name: 'NotAllowedError' })).toBe(true);
    expect(isRefusal(new DOMException('interrupted', 'AbortError'))).toBe(false);
    expect(isRefusal(new DOMException('bad file', 'NotSupportedError'))).toBe(false);
    expect(isRefusal(new Error('NotAllowedError'))).toBe(false);
    expect(isRefusal(null)).toBe(false);
    expect(isRefusal('NotAllowedError')).toBe(false);
  });

  it('is heard once, and the visit remembers it: the next page starts on images', () => {
    const s = store();
    let heard = 0;
    onRefusal(() => { heard++; });
    expect(autoplayRefused(s)).toBe(false);
    noteRefusal(s);
    noteRefusal(s);
    expect(heard).toBe(1);
    expect(autoplayRefused(s)).toBe(true);
    expect(s.getItem(SESSION_KEY)).toBe('1');
    resetAutoplay(); // (the next page of the same visit)
    expect(autoplayRefused(s)).toBe(true);
  });

  it('turns the loops to images, unless this browser has shown it cannot show an MP4 in one (a no is final)', () => {
    const s = store();
    s.setItem(SESSION_KEY, '1');
    expect(autoplayRefused(s)).toBe(true);
    expect(imageLoopsWork()).toBeNull();
    expect(loopsAsImages()).toBe(true);
    noteImageLoops(true);
    expect(loopsAsImages()).toBe(true);
    noteImageLoops(false);
    expect(loopsAsImages()).toBe(false);
    noteImageLoops(true);
    expect(imageLoopsWork()).toBe(false);
  });

  it('a visit without storage still turns, for its page', () => {
    let heard = 0;
    onRefusal(() => { heard++; });
    noteRefusal(null);
    expect(heard).toBe(1);
    expect(autoplayRefused(null)).toBe(true);
  });
});
