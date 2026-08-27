import { describe, expect, it } from 'vitest';
import { computePlaySet, TileRect, ViewRect } from '../src/works/priority';

const tile = (slug: string, cx: number, cy: number): TileRect => ({ slug, cx, cy, hw: 100, hh: 60 });
const view: ViewRect = { x: -500, y: -400, w: 1000, h: 800 }; // center (0,0)

describe('computePlaySet', () => {
  it('prefers tiles nearest the viewport center', () => {
    const tiles = [tile('far', 400, 300), tile('near', 10, 10), tile('mid', 200, 100)];
    const set = computePlaySet(tiles, view, null, 2);
    expect(set.has('near')).toBe(true);
    expect(set.has('mid')).toBe(true);
    expect(set.has('far')).toBe(false);
  });

  it('respects the cap', () => {
    const tiles = Array.from({ length: 20 }, (_, i) => tile(`t${i}`, i * 30, 0));
    expect(computePlaySet(tiles, view, null, 4).size).toBe(4);
  });

  it('always includes the hovered tile, even off-screen, within the cap', () => {
    const tiles = [tile('a', 0, 0), tile('b', 20, 0), tile('offscreen', 5000, 5000)];
    const set = computePlaySet(tiles, view, 'offscreen', 2);
    expect(set.has('offscreen')).toBe(true);
    expect(set.size).toBe(2);
  });

  it('excludes tiles outside the viewport margin', () => {
    const tiles = [tile('in', 0, 0), tile('out', 5000, 0)];
    const set = computePlaySet(tiles, view, null, 10);
    expect(set.has('in')).toBe(true);
    expect(set.has('out')).toBe(false);
  });

  it('breaks distance ties by slug for determinism', () => {
    const tiles = [tile('b', 100, 0), tile('a', -100, 0), tile('c', 0, 100)];
    const first = computePlaySet(tiles, view, null, 1);
    const second = computePlaySet(tiles, view, null, 1);
    expect([...first]).toEqual([...second]);
  });
});
