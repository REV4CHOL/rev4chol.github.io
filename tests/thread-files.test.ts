import { describe, expect, it } from 'vitest';
import { THREAD_FRAMES, stillCode, threadPicks, wallCodes, wallOrder } from '../src/lib/thread-files';

describe("a film's thread shows six of its stills, spread through its wall", () => {
  it('the wall order reads numbers as numbers', () => {
    expect(wallOrder(['10.jpg', '2.jpg', '01.jpg'])).toEqual(['01.jpg', '2.jpg', '10.jpg']);
    expect(wallOrder(['2-01.jpg', '1-02.jpg', '1-01.jpg'])).toEqual(['1-01.jpg', '1-02.jpg', '2-01.jpg']);
  });
  it('six places, evenly, the first and the last still included', () => {
    expect(THREAD_FRAMES).toBe(6);
    expect(threadPicks(43)).toEqual([0, 8, 17, 25, 34, 42]);
    expect(threadPicks(10)).toEqual([0, 2, 4, 5, 7, 9]);
    expect(threadPicks(6)).toEqual([0, 1, 2, 3, 4, 5]);
  });
  it('a film with fewer stills gives them all; none gives none', () => {
    expect(threadPicks(4)).toEqual([0, 1, 2, 3]);
    expect(threadPicks(0)).toEqual([]);
  });
  it('the picks never repeat and stay in the wall', () => {
    for (let n = 1; n <= 80; n++) {
      const p = threadPicks(n);
      expect(new Set(p).size, String(n)).toBe(p.length);
      expect(p.every((i) => i >= 0 && i < n), String(n)).toBe(true);
      expect([...p].sort((a, b) => a - b)).toEqual(p);
    }
  });
  it('a still is called by its place in its wall, led by its part in pillars', () => {
    expect(stillCode(0, 7)).toBe('07');
    expect(stillCode(2, 11)).toBe('2-11');
    expect(wallCodes(['01.jpg', '02.jpg', '05.jpg'], false)).toEqual(['01', '02', '03']); // a place, not a file's own number
    expect(wallCodes(['1-01.jpg', '1-02.jpg', '2-01.jpg'], true)).toEqual(['1-01', '1-02', '2-01']);
    expect(wallCodes(['1-01.jpg', '1-02.jpg', '2-01.jpg'], false)).toEqual(['01', '02', '03']); // pillars are a vertical film's
    expect(wallCodes(['1-01.jpg', '1-02.jpg'], true)).toEqual(['01', '02']); // one part is one wall
    expect(wallCodes(['1-01.jpg', '07.jpg'], true)).toEqual(['01', '02']); // every file named by part, or none
  });
});
