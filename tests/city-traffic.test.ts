import { describe, expect, it } from 'vitest';
import { EXT, G, planCity } from '../src/about/city-plan';
import { DECK_KERB, GREEN, OFFSETS, PHASE, SPEC, Traffic } from '../src/about/city-traffic';
import { mulberry32 } from '../src/lib/rng';
import { hashSlug } from '../src/project/dossier';

const SEED = hashSlug('revachol-night-city');
const plan = planCity(SEED);
const weight = (lane: { len: number; link: { street: { kind: string; x0: number; z0: number } } }) => {
  const st = lane.link.street;
  const core = Math.abs(st.x0) < EXT + G && Math.abs(st.z0) < EXT + G ? 3 : 1;
  return lane.len * core * (st.kind === 'highway' ? 2.2 : 1);
};

describe('Traffic', () => {
  const traffic = new Traffic(plan.streets, mulberry32(11));
  traffic.populate(1400, weight);

  it('keeps every highway lane, with the widest vehicle in it, inside the parapets', () => {
    const widest = Math.max(...Object.values(SPEC).map((v) => v[1]));
    for (const off of OFFSETS.highway) expect(off + widest / 2).toBeLessThanOrEqual(DECK_KERB - 0.1);
    const hw = traffic.lanes.filter((l) => l.link.street.kind === 'highway');
    expect(hw.length).toBeGreaterThan(20);
    for (const lane of hw) expect(Math.abs(lane.offset) + widest / 2).toBeLessThanOrEqual(DECK_KERB - 0.1);
  });

  it('cuts the carriageways into a graph: crossings, ramp merges, lit intersections, no dangling lane', () => {
    expect(traffic.nodes.length).toBeGreaterThan(400);
    expect(traffic.links.length).toBeGreaterThan(800);
    const kinds = new Set(traffic.links.map((l) => l.street.kind));
    for (const k of ['road', 'highway', 'diagonal', 'ramp']) expect(kinds.has(k as never), k).toBe(true);
    expect(traffic.nodes.filter((n) => n.signal).length).toBeGreaterThan(200);
    for (const lane of traffic.lanes) expect(lane.exits.length, `lane on ${lane.link.street.kind}`).toBeGreaterThan(0);
    // every ramp is reachable from the highway's edge lane and lands on a street
    for (const l of traffic.links.filter((l) => l.street.kind === 'ramp')) {
      expect(l.a.ports.length + l.b.ports.length).toBeGreaterThan(4);
    }
    expect(traffic.cars.length).toBeGreaterThan(1300);
  });

  it('keeps the lights honest: opposite groups are never green together, and a cycle is a cycle', () => {
    for (const n of traffic.nodes.filter((n) => n.signal).slice(0, 40)) {
      const cycle = n.streets.length * PHASE;
      const per = new Array(n.streets.length).fill(0);
      for (let t = 0; t < cycle; t++) {
        let lit = 0;
        for (let g = 0; g < n.streets.length; g++) if (traffic.green(n, g, t)) { lit += 1; per[g] += 1; }
        expect(lit).toBeLessThanOrEqual(1);
      }
      for (const g of per) expect(g).toBe(GREEN);
    }
    expect(traffic.nodes.filter((n) => n.signal && n.streets.length === 3).length).toBeGreaterThan(4); // the boulevard's crossings
  });

  it('never lets a vehicle overlap the one ahead, vanish, or jump — for 4000 frames', () => {
    const before = traffic.cars.length;
    const prev = traffic.cars.map((c) => ({ x: c.x, y: c.y, z: c.z }));
    let maxJump = 0;
    let minGap = Infinity;
    for (let f = 0; f < 4000; f++) {
      traffic.step();
      for (let i = 0; i < traffic.cars.length; i++) {
        const c = traffic.cars[i], p = prev[i];
        if (c.warped !== traffic.tick) maxJump = Math.max(maxJump, Math.hypot(c.x - p.x, c.y - p.y, c.z - p.z)); // a portal is a step by design
        p.x = c.x; p.y = c.y; p.z = c.z;
      }
      if (f % 25 === 0) {
        for (const lane of traffic.lanes) {
          for (let i = 1; i < lane.cars.length; i++) {
            const a = lane.cars[i - 1], b = lane.cars[i];
            minGap = Math.min(minGap, b.s - b.len / 2 - a.s - a.len / 2);
          }
        }
      }
    }
    expect(traffic.cars.length).toBe(before);
    expect(maxJump).toBeLessThan(0.6); // a highway truck at full tilt moves ~0.2 a frame; the arcs are short
    expect(minGap).toBeGreaterThan(-0.05); // bumper to bumper at worst
    expect(traffic.violations).toBe(0);
    expect(traffic.hops).toBeGreaterThan(3000); // the graph is driven through, not idled on
  });

  it('keeps every vehicle apart from every other — the intersections included', () => {
    const cars = traffic.cars;
    const cell = new Map<string, number[]>();
    let closest = Infinity;
    cars.forEach((c, i) => {
      const k = `${Math.floor(c.x / 6)}:${Math.floor(c.z / 6)}`;
      const l = cell.get(k); if (l) l.push(i); else cell.set(k, [i]);
    });
    for (let i = 0; i < cars.length; i++) {
      const a = cars[i];
      if (a.kind === 'moto') continue;
      const kx = Math.floor(a.x / 6), kz = Math.floor(a.z / 6);
      for (let ix = kx - 1; ix <= kx + 1; ix++) {
        for (let iz = kz - 1; iz <= kz + 1; iz++) {
          for (const j of cell.get(`${ix}:${iz}`) ?? []) {
            if (j <= i) continue;
            const b = cars[j];
            if (b.kind === 'moto' || Math.abs(a.y - b.y) > 2.5) continue;
            const d = Math.hypot(a.x - b.x, a.z - b.z);
            // two bodies in the same lane sit ≥ (la + lb)/2 apart; side by side in
            // neighbouring lanes 2.5 apart; anything under a car's width is a crash
            if (d < closest) closest = d;
          }
        }
      }
    }
    expect(closest).toBeGreaterThan(1.9);
  });

  it('runs the highway through: whoever reaches its end in the fog is carried to the other end, never turned about', () => {
    const hw = traffic.lanes.filter((l) => l.link.street.kind === 'highway');
    const portals = hw.flatMap((l) => l.exits.filter((e) => e.portal));
    expect(portals.length).toBe(6); // three lanes a side, one portal each
    for (const e of portals) { expect(e.to.link.street.kind).toBe('highway'); expect(e.S).toBe(0); expect(Math.hypot(e.x1 - e.x0, e.z1 - e.z0)).toBeGreaterThan(700); }
    expect(hw.some((l) => l.exits.some((e) => e.to.link === l.link && !e.straight))).toBe(false); // no U-turn on the highway
    let warped = 0;
    for (let f = 0; f < 3000; f++) { traffic.step(); for (const c of traffic.cars) if (c.warped === traffic.tick) warped += 1; }
    expect(warped).toBeGreaterThan(5);
  });

  it('uses the ramps: traffic leaves the highway and joins it', () => {
    let onRamps = 0;
    for (let f = 0; f < 600; f++) {
      traffic.step();
      if (f % 20 === 0) onRamps += traffic.cars.filter((c) => c.lane?.link.street.kind === 'ramp').length;
    }
    expect(onRamps).toBeGreaterThan(20);
  });

  it('is deterministic for a seed', () => {
    const a = new Traffic(plan.streets, mulberry32(5));
    const b = new Traffic(plan.streets, mulberry32(5));
    a.populate(300, weight); b.populate(300, weight);
    for (let f = 0; f < 200; f++) { a.step(); b.step(); }
    expect(a.cars[17].x).toBe(b.cars[17].x);
    expect(a.cars[17].z).toBe(b.cars[17].z);
  });

  it('keeps flowing for 40,000 frames: the boxes stay clear, most of the city moves, nothing meets inside a box', () => {
    // owner: the traffic ground to a halt in jams until nothing moved — vehicles entered the boxes without
    // room to clear them, stalled mid-crossing, and every stalled box held the cross street too
    const t = new Traffic(plan.streets, mulberry32(SEED ^ 0x51f15e));
    t.populate(1500, weight);
    const cars = t.cars;
    let worstStopped = 0, worstInBox = 0, meetings = 0;
    for (let f = 1; f <= 40000; f++) {
      t.step();
      if (f % 2000 !== 0) continue;
      worstStopped = Math.max(worstStopped, cars.filter((c) => c.v < 0.001).length / cars.length);
      let inBox = 0;
      for (const n of t.nodes) {
        for (const c of n.transit) if (c.v < 0.001) inBox += 1;
        for (let i = 0; i < n.transit.length; i++) for (let j = i + 1; j < n.transit.length; j++) {
          const a = n.transit[i], b = n.transit[j];
          if (Math.hypot(a.x - b.x, a.z - b.z) < 1.2) meetings += 1;
        }
      }
      worstInBox = Math.max(worstInBox, inBox);
    }
    expect(worstStopped).toBeLessThan(0.5);
    expect(worstInBox).toBeLessThan(40);
    expect(meetings).toBe(0);
    expect(t.hops).toBeGreaterThan(60000); // a living network: far above the jammed 49k
  }, 120000);
});
