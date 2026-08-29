import { describe, expect, it } from 'vitest';
import { classifySwipe } from '../src/home/swipe';

// dx/dy are net pointer travel in px (screen coords: up is negative dy), dtMs gesture duration.
describe('classifySwipe — the homepage swipe-onward gesture', () => {
  it('commits a deliberate upward swipe', () => {
    expect(classifySwipe(8, -90, 320)).toBe(true);
  });

  it('commits a short fast flick', () => {
    expect(classifySwipe(4, -50, 110)).toBe(true);
  });

  it('rejects a downward swipe (pull-to-refresh territory)', () => {
    expect(classifySwipe(0, 90, 300)).toBe(false);
  });

  it('rejects horizontal intent even with some rise', () => {
    expect(classifySwipe(120, -80, 300)).toBe(false);
  });

  it('rejects a slow drift — resting a thumb is not a swipe', () => {
    expect(classifySwipe(0, -80, 2000)).toBe(false);
  });

  it('rejects tiny movements even when fast', () => {
    expect(classifySwipe(0, -30, 60)).toBe(false);
  });

  it('rejects a zero-time gesture instead of dividing by it', () => {
    expect(classifySwipe(0, -50, 0)).toBe(false);
  });
});
