import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PAINT } from '../src/about/city-paint';

// The floor, painted in turn: the floor writes the depth; every paint after it neither tests the depth nor writes any,
// and covers the floor and the paints drawn before it. Parallel planes millimetres apart tie in a 24-bit depth buffer a
// few hundred metres out, and polygon-offset rungs did not part long strips with one slope factor (measured: the wrong
// one showed through a tenth to a half of their overlap, eight units apart) — so the draw order, not the depth, names
// the winner among the paints; and a paint testing the floor's depth lost to it where a GPU's rounding ate the margin,
// or where it lies millimetres under a bridge deck it runs over (owner: "it's the road literally flickering").
describe('the painted floor', () => {
  const city = readFileSync('src/about/city3d.ts', 'utf8');

  it('pushes the floor\'s depth behind, and pulls the see-through decals laid on it in front of it', () => {
    expect(PAINT.ground).toBeGreaterThan(0);
    expect(PAINT.pull).toBeLessThan(0);
    expect(PAINT.ground - PAINT.pull, 'a margin past a triangle\'s rounding at a straight-down look').toBeGreaterThanOrEqual(6);
  });

  it('draws the sky, then the floor, then the paints in the order they stack, then everything that stands on them (owner: the streets glitched as the camera flew)', () => {
    const o = PAINT.order;
    const stack = [o.sky, o.floor, o.patch, o.roadX, o.roadZ, o.laneX, o.laneZ, o.boulevard, o.slip, o.junction, o.stop];
    for (let i = 1; i < stack.length; i++) expect(stack[i], `turn ${i}`).toBeGreaterThan(stack[i - 1]);
    expect(o.stop - o.junction, 'a turn for each of a crossing\'s three boxes').toBeGreaterThanOrEqual(3);
    expect(o.stop, 'everything else draws after the paint (order 0)').toBeLessThan(0);
  });

  it('gives every turn to the city, and keeps the retired rungs out of it', () => {
    for (const k of Object.keys(PAINT.order)) expect(city.includes(`PAINT.order.${k}`), `PAINT.order.${k} in city3d`).toBe(true);
    expect(city).not.toMatch(/PAINT\.(decal|zebra|stop|junction|road[XZ]|lane[XZ]|boulevard|arterial|deck|patch)\b/);
    expect(city, 'a strip, a box: no depth test, no depth').toMatch(/depthWrite: !paint, depthTest: !paint \}\);/);
    expect(city, 'the patches: no depth test, no depth').toMatch(/const patchMat = new MeshLambertMaterial\(\{[^}]*depthWrite: false, depthTest: false \}\)/);
    expect(city, 'the stop lines: no depth test, no depth').toMatch(/const lineMat = new MeshLambertMaterial\(\{[^}]*depthWrite: false, depthTest: false \}\)/);
    expect(city.match(/polygonOffsetUnits: PAINT\.pull/g)?.length, 'the see-through decals: the zebras, the shops\' spill, the headlights\' throws, the lamps\' pools').toBe(4);
  });

  it('keeps the eye above the floor, where the floor can never stand in front of a paint', () => {
    expect(city, 'free flight: two up at the least').toMatch(/free\.pos\.y = clamp\(free\.pos\.y, 2, \d+\)/);
  });
});
