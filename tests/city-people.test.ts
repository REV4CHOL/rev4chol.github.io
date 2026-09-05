import { describe, expect, it } from 'vitest';
import { ARTERIAL, ARTERIAL_ROW, EXT, G, HALF, OUTER, planCity, REACH, streetAt } from '../src/about/city-plan';
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
            expect(Math.abs(p.off)).toBeLessThanOrEqual(st.width / 2 + (st.kind === 'diagonal' ? 0.81 : st.kind === 'arterial' ? 10.21 : 0.01)); // on the pavement, never in the road (crossing aside; the boulevard's and the arterial's pavements lie past their carriageways)
            if (st.kind === 'arterial' && p.act === 'walk') expect(Math.abs(p.off)).toBeGreaterThanOrEqual(ARTERIAL_ROW - ARTERIAL.walk + 0.79);
            if (st.kind === 'road' && st.ends) { // a run ending on the arterial: its walkers stop at the arterial's pavement
              if (st.ends.a !== undefined) expect(p.t).toBeGreaterThanOrEqual(st.ends.a - 0.3);
              if (st.ends.b !== undefined) expect(p.t).toBeLessThanOrEqual(st.len - st.ends.b + 0.3);
            }
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
    for (const a of ['walk', 'stand', 'talk', 'browse', 'cross', 'vend', 'mill', 'enter', 'inside', 'exit']) expect(seen.has(a), a).toBe(true);
    expect(people.crossings).toBeGreaterThan(20); // people do cross the streets, on the red
    // the knots are kept up: someone arrives when someone leaves
    const filled = people.knots.filter((k) => k.members.length > 0).length;
    expect(filled / people.knots.length).toBeGreaterThan(0.5); // (a walker sent to fill a knot now waits at the kerbs on the way)
  });

  it('never moves anyone in a step, keeps them off the water and the bridges, and lets them in at doors', () => {
    // owner: pedestrians vanished spontaneously (they were moved across the city to fill a knot, or to a random
    // street at a pavement's end) and walked the canal's water and bridges
    const p2 = new People(plan.streets, zones, plan.stalls, mulberry32(21), 1500, () => true, nodes);
    const prev = p2.people.map((p) => ({ x: p.x, z: p.z }));
    let maxStep = 0, inside = 0;
    for (let f = 0; f < 4000; f++) {
      p2.step();
      p2.people.forEach((p, i) => {
        const q = prev[i];
        maxStep = Math.max(maxStep, Math.hypot(p.x - q.x, p.z - q.z));
        q.x = p.x; q.z = p.z;
        if (p.act === 'inside') inside += 1;
        if (p.st && p.st.kind === 'road' && p.st.dx === 0 && Math.abs(Math.abs(p.st.x0) - 19) < 0.6 && p.act !== 'cross') {
          expect(p.off * p.st.x0, 'a quay walker on the water side, under the bridges').toBeLessThan(0); // the quay's land side only
        }
      });
    }
    expect(maxStep).toBeLessThan(2.6); // a corner is rounded in place; no one is teleported
    expect(inside).toBeGreaterThan(100); // people do go in at doors, and come out
  }, 60000);

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

  it('walks the catwalks and the platforms at their own height, never off their width, and sits against the wall', () => {
    const cats = plan.streets.filter((s) => s.kind === 'catwalk');
    expect(cats.length).toBeGreaterThan(100);
    const crowd = new People(plan.streets, [], plan.stalls, mulberry32(5), 1600, () => false, nodes);
    for (let i = 0; i < 3000; i++) {
      crowd.step();
      for (const p of crowd.people) {
        if (!p.st) continue;
        if (p.st.kind === 'catwalk') {
          expect(Math.abs(p.y - p.st.y), `a walker on a catwalk at ${p.st.y} is at ${p.y}`).toBeLessThan(0.01);
          expect(Math.abs(p.off)).toBeLessThanOrEqual(p.st.width / 2 - 0.4 + 1e-6);
          expect(p.t).toBeGreaterThanOrEqual(-1e-6); expect(p.t).toBeLessThanOrEqual(p.st.len + 1e-6);
        }
        if (p.act === 'sit' && p.st.kind === 'road') expect(Math.abs(p.off), 'a sitter on the pavement, against the wall').toBeLessThanOrEqual(p.st.width / 2 - 0.2 + 1e-6);
        if (p.act === 'walk' && p.st.kind === 'diagonal') expect(Math.abs(p.off), 'a walker past the boulevard\'s edge lines').toBeGreaterThanOrEqual(p.st.width / 2 + 0.3);
      }
    }
    expect(crowd.people.filter((p) => p.st?.kind === 'catwalk').length).toBeGreaterThan(30);
    expect(crowd.people.filter((p) => p.st?.kind === 'arterial' && (p.act === 'walk' || p.act === 'wait' || p.act === 'stand')).length).toBeGreaterThan(12); // the arterial's pavements are walked
    expect(crowd.people.filter((p) => p.st?.kind === 'catwalk' && p.st.y > 30).length).toBeGreaterThan(0); // the stations' platforms
  }, 60000);

  it('waits at the kerb for the red or a gap, holds the traffic while crossing, and never walks through a solid', () => {
    const solid = (x: number, y: number, z: number) => plan.grid.hit(x, y, z, 0.3) !== null;
    // nothing ever clears: everyone who reaches a cross street waits at its kerb
    const held = new People(plan.streets, [], plan.stalls, mulberry32(3), 1200, () => false, nodes, { solid, roadClear: () => false, doors: plan.doors });
    let waiting = 0, through = 0, inSolid = 0;
    for (let f = 0; f < 2500; f++) {
      held.step();
      if (f % 50 !== 0) continue;
      for (const p of held.people) {
        if (p.act === 'wait') waiting += 1;
        if (p.act === 'walk' && p.cross && ((p.v > 0 && p.t > p.cross.tNear + 0.5) || (p.v < 0 && p.t < p.cross.tNear - 0.5))) through += 1;
        if ((p.act === 'walk' || p.act === 'wait' || p.act === 'stand') && p.st && (p.st.kind === 'road' || p.st.kind === 'arterial' || p.st.kind === 'diagonal') && plan.grid.hit(p.x, 0.9, p.z, 0.12) !== null) inSolid += 1; // (a body's half-width: the sim keeps 0.3 clear)
      }
    }
    expect(waiting).toBeGreaterThan(50);
    expect(through).toBe(0);
    expect(inSolid).toBe(0);
    // every light red for the cars: they cross, and the traffic is told who is in its crosswalks
    const free = new People(plan.streets, [], plan.stalls, mulberry32(3), 1200, () => true, nodes, { solid, doors: plan.doors });
    let crossers = 0, told = 0;
    for (let f = 0; f < 2500; f++) {
      free.step();
      if (f % 50 !== 0) continue;
      for (const p of free.people) if (p.cross && (p.act === 'walk' || p.act === 'cross')) { crossers += 1; if (free.walkersIn(p.cross.nx, p.cross.nz, p.cross.axes[0]) > 0) told += 1; }
    }
    expect(crossers).toBeGreaterThan(50);
    expect(told).toBe(crossers);
    // doors: with the plan's doors people go in only where a door is; with none listed nobody goes in
    const closed = new People(plan.streets, [], plan.stalls, mulberry32(4), 800, () => true, nodes, { doors: [] });
    for (let f = 0; f < 2500; f++) closed.step();
    expect(closed.people.filter((p) => p.act === 'inside' || p.act === 'enter').length).toBe(0);
  }, 90000);

  it('perches people on the balconies and mills the parties at roof height', () => {
    const party = { x: 100, y: 40, z: 100, w: 10, d: 10, stalls: [] };
    const crowd = new People(plan.streets, [party], [], mulberry32(8), 400, () => true, nodes, { perches: plan.perches });
    for (let f = 0; f < 600; f++) crowd.step();
    const up = crowd.people.filter((p) => p.zone === party);
    expect(up.length).toBeGreaterThan(3);
    for (const p of up) { expect(p.y).toBe(40); expect(Math.abs(p.x - 100)).toBeLessThanOrEqual(5.5); }
    const perched = crowd.people.filter((p) => p.act === 'perch');
    expect(perched.length).toBeGreaterThan(100);
    for (const p of perched.slice(0, 40)) { expect(p.y).toBeGreaterThan(3); expect([FRAME.stand, FRAME.sit, FRAME.phone, FRAME.sitPhone, FRAME.talk]).toContain(p.frame); }
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
