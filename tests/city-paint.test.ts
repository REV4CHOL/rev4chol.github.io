import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PAINT } from '../src/about/city-paint';

// The floor, painted in turn: the floor writes the depth, pushed behind; every paint after it tests against that depth,
// pulled in front, writes none, and covers the paints drawn before it. Parallel planes millimetres apart tie in a
// 24-bit depth buffer a few hundred metres out, and polygon-offset rungs did not part long strips with one slope
// factor (measured: the wrong one showed through a tenth to a half of their overlap, eight units apart) — so the draw
// order, not the depth, names the winner among the paints.
describe('the painted floor', () => {
  const city = readFileSync('src/about/city3d.ts', 'utf8');

  it('pushes the floor\'s depth behind, and pulls every paint in front of it', () => {
    expect(PAINT.ground).toBeGreaterThan(0);
    expect(PAINT.pull).toBeLessThan(0);
    expect(PAINT.ground - PAINT.pull, 'a margin past a triangle\'s rounding at a straight-down look').toBeGreaterThanOrEqual(6);
  });

  it('draws the floor first, then the paints in the order they stack, then everything that stands on them (owner: the streets glitched as the camera flew)', () => {
    const o = PAINT.order;
    const stack = [o.floor, o.patch, o.roadX, o.roadZ, o.laneX, o.laneZ, o.boulevard, o.slip, o.junction, o.stop];
    for (let i = 1; i < stack.length; i++) expect(stack[i], `turn ${i}`).toBeGreaterThan(stack[i - 1]);
    expect(o.stop - o.junction, 'a turn for each of a crossing\'s three boxes').toBeGreaterThanOrEqual(3);
    expect(o.stop, 'everything else draws after the paint (order 0)').toBeLessThan(0);
  });

  it('gives every turn to the city, and keeps the retired rungs out of it', () => {
    for (const k of Object.keys(PAINT.order)) expect(city.includes(`PAINT.order.${k}`), `PAINT.order.${k} in city3d`).toBe(true);
    expect(city).not.toMatch(/PAINT\.(decal|zebra|stop|junction|road[XZ]|lane[XZ]|boulevard|arterial|deck|patch)\b/);
    expect(city, 'a paint writes no depth').toMatch(/depthWrite: !paint, polygonOffset: paint, polygonOffsetFactor: -1, polygonOffsetUnits: PAINT\.pull/);
    expect(city.match(/polygonOffsetUnits: PAINT\.pull/g)?.length, 'the strips, the patches, the zebras, the stop lines, the lights on the ground').toBeGreaterThanOrEqual(7);
  });
});
