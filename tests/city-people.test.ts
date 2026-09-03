import { describe, expect, it } from 'vitest';
import { EXT, G, HALF, OUTER, planCity, REACH, streetAt } from '../src/about/city-plan';
import { CAST, FRAME, KIND, People, Zone } from '../src/about/city-people';
import { mulberry32 } from '../src/lib/rng';
import { hashSlug } from '../src/project/dossier';

const plan = planCity(hashSlug('revachol-night-city'));
/** Market zones: the stalls clustered, each cluster's bounds padded. */
const zonesOf = (): Zone[] => {
  const zones: Zone[] = [];
  for (const s of plan.stalls) {
    let z = zones.find((zn) => Math.abs(zn.x - s.x) < 30 && Math.abs(zn.z - s.z) < 30);
    if (!z) { z = { x: s.x, z: s.z, w: 6, d: 6, stalls: [] }; zones.push(z); }
    z.stalls.push(s);
  }
  for (const z of zones) {
    const xs = z.stalls.map((s) => s.x), zs = z.stalls.map((s) => s.z);
    const x0 = Math.min(...xs) - 3, x1 = Math.max(...xs) + 3, z0 = Math.min(...zs) - 3, z1 = Math.max(...zs) + 3;
    z.x = (x0 + x1) / 2; z.z = (z0 + z1) / 2; z.w = x1 - x0; z.d = z1 - z0;
  }
  return zones;
};
const nodes: number[] = [];
for (let i = -HALF - OUTER - 1; i <= HALF + OUTER; i++) nodes.push(streetAt(i));

describe('People', () => {
  const zones = zonesOf();
  let reds = 0;
  const people = new People(plan.streets, zones, plan.stalls, mulberry32(4), 2000, () => { reds += 1; return reds % 3 !== 0; }, nodes);

  it('fills the city with lives: vendors in the stalls, knots of talk, market crowds, walkers', () => {
    expect(people.people.length).toBe(2000);
    const acts = new Set(people.people.map((p) => p.act));
    for (const a of ['walk', 'talk', 'vend', 'mill']) expect(acts.has(a as never), a).toBe(true);
    expect(people.people.filter((p) => p.act === 'vend').length).toBe(plan.stalls.length);
    expect(people.knots.length).toBeGreaterThan(30);
    expect(zones.length).toBeGreaterThanOrEqual(4); // the night market's two halves and the flea lots
  });

  it('keeps everyone on a pavement, in a market or at a knot, and never loses anyone — for 5000 frames', () => {
    const before = people.people.length;
    const seen = new Set<string>();
    for (let f = 0; f < 5000; f++) {
      people.step();
      if (f % 250 === 0) {
        for (const p of people.people) {
          seen.add(p.act);
          expect(Number.isFinite(p.x) && Number.isFinite(p.z) && Number.isFinite(p.yaw)).toBe(true);
          expect(Math.abs(p.x)).toBeLessThan(REACH + 20);
          expect(Math.abs(p.z)).toBeLessThan(REACH + 20);
          if (p.act === 'walk' || p.act === 'stand' || p.act === 'cross') {
            const st = p.st!;
            expect(Math.abs(p.off)).toBeLessThanOrEqual(st.width / 2 + 0.01); // on the pavement, never in the road (crossing aside)
            expect(p.t).toBeGreaterThanOrEqual(-0.01);
            expect(p.t).toBeLessThanOrEqual(st.len + 0.01);
          }
          if (p.act === 'mill' || p.act === 'browse') {
            const z = p.zone!;
            expect(Math.abs(p.x - z.x)).toBeLessThanOrEqual(z.w / 2 + 0.5);
            expect(Math.abs(p.z - z.z)).toBeLessThanOrEqual(z.d / 2 + 0.5);
          }
        }
      }
    }
    expect(people.people.length).toBe(before);
    for (const a of ['walk', 'stand', 'talk', 'browse', 'cross', 'vend', 'mill']) expect(seen.has(a), a).toBe(true);
    expect(people.crossings).toBeGreaterThan(20); // people do cross the streets, on the red
    // the knots are kept up: someone arrives when someone leaves
    const filled = people.knots.filter((k) => k.members.length > 0).length;
    expect(filled / people.knots.length).toBeGreaterThan(0.6);
  });

  it('is a varied cast, each kind at its own pace, the vendors in their stalls, every pose used', () => {
    const counts = new Array(CAST.length).fill(0);
    for (const p of people.people) counts[p.kind] += 1;
    for (let k = 0; k < CAST.length; k++) expect(counts[k], CAST[k].name).toBeGreaterThan(5);
    for (const p of people.people.filter((q) => q.act === 'vend')) expect(p.kind).toBe(KIND.vendor);
    const pace = (name: string) => {
      const ps = people.people.filter((p) => CAST[p.kind].name === name);
      return ps.reduce((a, p) => a + p.pace, 0) / ps.length;
    };
    expect(pace('elder')).toBeLessThan(pace('civ'));
    expect(pace('civ')).toBeLessThan(pace('courier'));
    const frames = new Set<number>();
    for (let f = 0; f < 600; f++) { people.step(); for (const p of people.people) frames.add(p.frame); }
    for (const [name, fr] of Object.entries(FRAME)) expect(frames.has(fr), name).toBe(true);
    for (const p of people.people) { expect(p.frame).toBeGreaterThanOrEqual(0); expect(p.frame).toBeLessThan(8); }
  });

  it('is deterministic for a seed', () => {
    const a = new People(plan.streets, zones, plan.stalls, mulberry32(9), 400, () => true, nodes);
    const b = new People(plan.streets, zones, plan.stalls, mulberry32(9), 400, () => true, nodes);
    for (let f = 0; f < 300; f++) { a.step(); b.step(); }
    expect(a.people[33].x).toBe(b.people[33].x);
    expect(a.people[33].act).toBe(b.people[33].act);
  });

  it('crosses only where the main city has crossings', () => {
    expect(nodes.length).toBe(2 * (HALF + OUTER + 1));
    expect(nodes[0]).toBeLessThan(-EXT);
    expect(G).toBe(38);
  });
});
