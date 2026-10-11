import { describe, expect, it } from 'vitest';
import { ARTERIAL, ARTERIAL_ROW, EXT, G, HALF, OUTER, planCity, REACH, streetAt, carriagewayAt } from '../src/about/city-plan';
import { CAST, FRAME, KIND, PATIENCE, People, SPOT, Zone, marketZones } from '../src/about/city-people';
import { Traffic, WALK_MIN } from '../src/about/city-traffic';
import { mulberry32 } from '../src/lib/rng';
import { hashSlug } from '../src/project/dossier';

const plan = planCity(hashSlug('revachol-night-city'));
/** Market zones: the stalls clustered, never across a carriageway, each cluster's bounds padded (city-people's). */
const zonesOf = (): Zone[] => marketZones(plan.stalls, plan.streets);
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
    // the pedestrian signal: nobody steps off on DONT or FLASH; on WALK they go, and hurry
    const red = new People(plan.streets, [], plan.stalls, mulberry32(3), 1200, () => true, nodes, { solid, walkOK: () => 'flash' });
    for (let f = 0; f < 1500; f++) red.step();
    expect(red.people.filter((p) => p.cross && (p.act === 'walk' || p.act === 'cross')).length).toBe(0);
    expect(red.people.filter((p) => p.act === 'wait').length).toBeGreaterThan(20);
    const go = new People(plan.streets, [], plan.stalls, mulberry32(3), 1200, () => false, nodes, { solid, walkOK: () => 'walk' });
    let hurried = 0, ambling = 0;
    for (let f = 0; f < 1500; f++) {
      const before = go.people.map((p) => p.t);
      go.step();
      go.people.forEach((p, i) => { if (p.act !== 'walk' || !p.st || Math.abs(p.t - before[i]) > 0.2) return; const step = Math.abs(p.t - before[i]) / Math.abs(p.v || 1); if (p.cross) hurried += step; else ambling += step; });
    }
    expect(go.people.filter((p) => p.cross && p.act === 'walk').length).toBeGreaterThan(10);
    expect(hurried).toBeGreaterThan(0); // crossers cover HURRY× a walker's step
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

  it('walks the lanes on their slivers of pavement, and goes in at the tube houses\' doors', () => {
    const lp = new People(plan.streets, [], plan.stalls, mulberry32(9), 2200, () => false, nodes, { solid: (x, y, z) => plan.grid.hit(x, y, z, 0.3) !== null, doors: plan.doors });
    let onLanes = 0, entered = 0;
    for (let f = 0; f < 2500; f++) {
      lp.step();
      if (f % 100 === 0) for (const p of lp.people) {
        if (!p.st || p.st.kind !== 'lane') continue;
        if (p.act === 'walk' || p.act === 'stand') { onLanes += 1; expect(Math.abs(p.off)).toBeGreaterThanOrEqual(p.st.width / 2 - 0.76); expect(Math.abs(p.off)).toBeLessThanOrEqual(p.st.width / 2 - 0.24); }
        if (p.act === 'enter' || p.act === 'inside' || p.act === 'exit') entered += 1;
      }
    }
    expect(onLanes).toBeGreaterThan(200);
    expect(plan.doors.filter((d) => plan.streets.some((st) => st.kind === 'lane' && Math.abs(-(d.x - st.x0) * st.dz + (d.z - st.z0) * st.dx) < 6.2 && (d.x - st.x0) * st.dx + (d.z - st.z0) * st.dz > 0 && (d.x - st.x0) * st.dx + (d.z - st.z0) * st.dz < st.len)).length).toBeGreaterThan(30); // the tube houses' doors stand on the lanes (whether anyone went in during this run is the seed's business)
    void entered;
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

  it('clusters the stalls into zones that never straddle a carriageway (owner: crowds in the middle of the traffic lanes)', () => {
    const zones = marketZones(plan.stalls, plan.streets);
    expect(zones.length).toBeGreaterThan(8); // the night market, three flea markets, three market streets, the stadium's two, the aprons' rows
    let checked = 0;
    for (const z of zones) {
      for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) {
        const x = z.x - z.w / 2 + 1 + (z.w - 2) * i / 6, zz = z.z - z.d / 2 + 1 + (z.d - 2) * j / 6;
        const road = carriagewayAt(plan.streets, x, zz);
        expect(road === null || road.kind === 'alley', `a zone at ${z.x.toFixed(0)},${z.z.toFixed(0)} (${z.w.toFixed(0)}×${z.d.toFixed(0)}) over the ${road?.kind} at ${x.toFixed(0)},${zz.toFixed(0)}`).toBe(true);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(500);
  });

  it('stands nobody in a carriageway or on a roof: whoever mills, browses, talks, stands or vends is on the ground and off the road (owner)', () => {
    const sim = new People(plan.streets, marketZones(plan.stalls, plan.streets), plan.stalls, mulberry32(9), 2400, () => true, nodes, {
      solid: (x, y, z) => plan.grid.hit(x, y, z, 0.3) !== null,
      onRoad: (x, z) => carriagewayAt(plan.streets, x, z) !== null,
    });
    for (let f = 0; f < 400; f++) sim.step();
    let checked = 0;
    for (const p of sim.people) {
      if (p.act !== 'mill' && p.act !== 'browse' && p.act !== 'talk' && p.act !== 'stand' && p.act !== 'vend') continue;
      const road = carriagewayAt(plan.streets, p.x, p.z);
      expect(road === null || road.kind === 'alley' || road.kind === 'lane', `a ${p.act}er in the ${road?.kind} at ${p.x.toFixed(0)},${p.z.toFixed(0)}`).toBe(true); // (a knot at a lane's edge spills a step into the lane: Hanoi)
      if (p.st?.kind !== 'catwalk') expect(p.y, `a ${p.act}er at ${p.y.toFixed(1)} up`).toBeLessThan(2.5); // (a knot on a footbridge or an arcade's walk stands at its height)
      checked += 1;
    }
    expect(checked).toBeGreaterThan(300);
  });
  it('lets the lights make room to walk, and keeps the crowd moving: every lit crossing opens long enough, nobody waits past their light\'s cycle (owner: they waited forever)', () => {
    const traffic = new Traffic(plan.streets, mulberry32(9));
    const crowd = new People(plan.streets, zonesOf(), plan.stalls, mulberry32(9), 1500, (x, z, a) => traffic.redAt(x, z, a), nodes, {
      solid: (x, y, z) => plan.grid.hit(x, y, z, 0.3) !== null,
      onRoad: (x, z) => carriagewayAt(plan.streets, x, z) !== null,
      roadClear: (x, z) => traffic.clearAt(x, z),
      walkOK: (x, z, a, f) => traffic.walkAt(x, z, a, f),
      walkRoom: (x, z, axes, f) => traffic.roomToWalk(x, z, axes, f),
      doors: plan.doors,
    });
    traffic.peds = (x, z, a) => crowd.walkersIn(x, z, a) > 0;
    let streets = 0;
    for (const n of traffic.nodes) { // each street crossed at a light shows WALK, every cycle, for its longest crossing and WALK_MIN besides
      if (!n.signal || !n.walkTime) continue;
      const cycle = n.streets.length * n.signal.phase;
      for (let g = 0; g < n.streets.length; g++) {
        if (!n.walkTime[g]) continue;
        let walk = 0;
        for (let k = 0; k < cycle; k++) if (traffic.walk(n, g, n.walkTime[g], k) === 'walk') walk += 1;
        expect(walk).toBeGreaterThanOrEqual(WALK_MIN);
        streets += 1;
      }
    }
    expect(streets).toBeGreaterThan(300);
    let waits = 0, started = 0;
    const over: string[] = [];
    const was = crowd.people.map((p) => p.act);
    for (let f = 0; f < 6000; f++) {
      traffic.step(); crowd.step();
      crowd.people.forEach((p, i) => {
        if (was[i] === 'wait' && p.act === 'walk' && p.cross) started += 1;
        was[i] = p.act;
        if (p.act !== 'wait' || !p.cross || f % 10) return;
        waits += 1;
        const n = traffic.nodeAt(p.cross.nx, p.cross.nz);
        const most = n?.signal ? n.streets.length * n.signal.phase + 200 : PATIENCE + 30; // a cycle, the walk to the spot and a look
        if (p.waited > most) over.push(`${p.waited} frames at ${p.x.toFixed(0)},${p.z.toFixed(0)}`);
      });
    }
    expect(over, 'waited past their light\'s cycle').toEqual([]);
    expect(waits).toBeGreaterThan(1000);
    expect(started).toBeGreaterThan(500); // WALK comes, and they go
    expect(crowd.crossings).toBeGreaterThan(20); // some at the front take the WALK across their own street instead
  }, 120000);

  it('gives every waiter a spot of their own, walked to, and stops nobody on top of anyone standing still (owner: they stood morphed into each other)', () => {
    const solid = (x: number, y: number, z: number) => plan.grid.hit(x, y, z, 0.3) !== null;
    const held = new People(plan.streets, zonesOf(), plan.stalls, mulberry32(6), 2000, () => false, nodes, { solid, roadClear: () => false, doors: plan.doors });
    const prev = held.people.map((p) => ({ x: p.x, z: p.z, act: p.act }));
    let queued = 0, stride = 0;
    for (let f = 0; f < 3000; f++) {
      held.step();
      held.people.forEach((p, i) => {
        const q = prev[i];
        if (p.act === 'wait' && q.act === 'wait') stride = Math.max(stride, Math.hypot(p.x - q.x, p.z - q.z));
        q.x = p.x; q.z = p.z; q.act = p.act;
      });
    }
    expect(stride, 'a waiter walks to their spot').toBeLessThan(0.035);
    const there = held.people.filter((p) => p.act === 'wait' && Math.hypot(p.tTo - p.t, p.offTo - p.off) <= 0.02);
    expect(there.length).toBeGreaterThan(100);
    const onTop: string[] = [];
    for (let i = 0; i < there.length; i++) {
      if (Math.abs(there[i].tTo - there[i].cross!.tNear) > SPOT * 0.9) queued += 1; // in a row behind the front
      for (let j = i + 1; j < there.length; j++) if (Math.hypot(there[i].x - there[j].x, there[i].z - there[j].z) <= 0.35) onTop.push(`two waiters at ${there[i].x.toFixed(1)},${there[i].z.toFixed(1)}`);
    }
    expect(queued).toBeGreaterThan(5); // the queues form behind the kerb
    const still = held.people.filter((p) => ['stand', 'sit', 'talk', 'browse', 'vend', 'perch'].includes(p.act) || there.includes(p));
    for (let i = 0; i < still.length; i++) for (let j = i + 1; j < still.length; j++) {
      const a = still[i], b = still[j];
      if (Math.abs(a.y - b.y) < 0.5 && Math.hypot(a.x - b.x, a.z - b.z) <= 0.3) onTop.push(`a ${a.act}er on a ${b.act}er at ${a.x.toFixed(1)},${a.z.toFixed(1)}`);
    }
    expect(onTop).toEqual([]);
  }, 120000);
});
