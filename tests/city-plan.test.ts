import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  AutoFlight, BOUND, CAM_R, CollisionGrid, districtOf, EXT, G, MEDIAN, planCity, RAIL, ROAD, starPositions, STREET, streetAt, tourRoute,
} from '../src/about/city-plan';
import { mulberry32 } from '../src/lib/rng';
import { hashSlug } from '../src/project/dossier';

const SEED = hashSlug('revachol-night-city');

describe('CollisionGrid', () => {
  const grid = new CollisionGrid();
  grid.add({ x: 0, y: 20, z: 0, w: 10, h: 40, d: 10 }); // a tower on the origin

  it('leaves free points alone', () => {
    const p = new Vector3(30, 10, 30);
    expect(grid.resolve(p, CAM_R)).toBe(false);
    expect(p.toArray()).toEqual([30, 10, 30]);
    expect(grid.hit(30, 10, 30, CAM_R)).toBeNull();
  });

  it('pushes a penetrating camera out along the least-penetration axis', () => {
    const p = new Vector3(4.5, 10, 0.5); // just inside the +x face, mid-height
    expect(grid.resolve(p, CAM_R)).toBe(true);
    expect(p.x).toBeCloseTo(5 + CAM_R, 5);
    expect(p.y).toBe(10);
    expect(p.z).toBe(0.5);
    expect(grid.hit(p.x, p.y, p.z, CAM_R)).toBeNull();
  });

  it('lifts a camera that sinks onto a roof', () => {
    const p = new Vector3(1, 39.5, -1);
    grid.resolve(p, CAM_R);
    expect(p.y).toBeCloseTo(40 + CAM_R, 5);
    expect(p.x).toBe(1);
  });

  it('honours the camera radius (a wall is solid before the surface)', () => {
    const p = new Vector3(5.6, 10, 0); // 0.6 clear of the face, radius 1.2
    expect(grid.resolve(p, CAM_R)).toBe(true);
    expect(p.x).toBeCloseTo(6.2, 5);
  });
});

describe('planCity', () => {
  const plan = planCity(SEED);

  it('packs a dense main city, a finished outer ring and a sprawl, with a real spread of building kinds', () => {
    expect(plan.core.length).toBeGreaterThan(2500);
    expect(plan.outer.length).toBeGreaterThan(1000);
    expect(plan.sprawl.length).toBeGreaterThan(1800);
    const kinds = new Set<string>(plan.core.map((s) => s.kind));
    for (const k of ['facade', 'dark', 'cyl', 'pyr', 'spire', 'dome', 'tree']) expect(kinds.has(k), k).toBe(true);
    const archetypes = new Set(plan.core.map((s) => s.arch));
    for (const a of ['tower', 'slab', 'low', 'needle', 'bridge', 'temple', 'mega', 'landmark', 'shanty']) expect(archetypes.has(a as never), a).toBe(true);
    // the poor quarters: favelas, rooftop shacks, squats under the deck, stilt huts — hundreds of them
    expect(plan.core.filter((s) => s.arch === 'shanty').length).toBeGreaterThan(300);
    expect(plan.tarps.length).toBeGreaterThan(150);
    expect(archetypes.size).toBeGreaterThanOrEqual(12);
    expect(new Set(plan.outer.map((s) => s.arch)).has('industry')).toBe(true);
    expect(plan.styles.length).toBeGreaterThanOrEqual(22);
    expect(new Set(plan.styles.map((s) => s.win)).size).toBe(6);
  });

  it('is Newport City: alleys, wires, closed segments, a canal, a highway, a diagonal, features', () => {
    const kinds = new Set(plan.streets.map((s) => s.kind));
    for (const k of ['road', 'highway', 'canal', 'alley', 'diagonal']) expect(kinds.has(k as never), k).toBe(true);
    expect(plan.streets.filter((s) => s.kind === 'alley').length).toBeGreaterThan(120);
    expect(plan.streets.filter((s) => s.kind === 'road').length).toBeGreaterThan(44); // closed segments split the runs
    expect(plan.wires.length).toBeGreaterThan(1200);
    expect(plan.wires.length % 12).toBe(0); // three segments per wire, two endpoints each
    expect(plan.lanterns.length / 3).toBeGreaterThan(400);
    expect(plan.vents.length).toBeGreaterThan(20);
    expect(plan.holos.length).toBe(12);
    expect(plan.stalls.length).toBeGreaterThan(80); // the night market and three flea markets
    expect(plan.stacks.length).toBeGreaterThanOrEqual(2);
    expect(plan.bridges.length).toBe(22);
    expect(plan.stadium.masts.length).toBe(4);
    expect(plan.wheel.r).toBe(11.5);
    expect(plan.mega.top).toBeGreaterThan(100);
  });

  it('lays the air corridors clear of the skyline, and pads on the tallest roofs', () => {
    expect(plan.air.length).toBe(5);
    expect(plan.pads.length).toBe(6);
    for (const lane of plan.air) {
      const n = lane.pts.length;
      for (let i = 0; i < (lane.loop ? n : n - 1); i++) {
        const [ax, ay, az] = lane.pts[i], [bx, by, bz] = lane.pts[(i + 1) % n];
        for (let k = 0; k <= 24; k++) {
          const t = k / 24;
          const x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = az + (bz - az) * t;
          if (Math.abs(x) > EXT + G || Math.abs(z) > EXT + G) continue;
          expect(plan.grid.hit(x, y, z, 2.5), `${lane.kind} corridor at ${x.toFixed(0)},${y.toFixed(0)},${z.toFixed(0)}`).toBeNull();
        }
      }
    }
    expect(plan.stadium.gates.length).toBe(4);
  });

  it('dresses the streets: thousands of signs in every shape, lamp posts on every open kerb', () => {
    expect(plan.signs.length).toBeGreaterThan(5000);
    const kinds = new Set(plan.signs.map((s) => s.kind));
    for (const k of ['hang', 'wall', 'board', 'tag', 'roof', 'gantry', 'screen']) expect(kinds.has(k as never), k).toBe(true);
    expect(plan.posts.length).toBeGreaterThan(4000);
    expect(plan.pois.length).toBeGreaterThan(14);
  });

  it('keeps every open road clear: nothing solid stands on a road or a pavement', () => {
    for (const st of plan.streets) {
      if (st.kind !== 'road') continue;
      for (let t = 1; t < st.len; t += 3) {
        for (const off of [0, ROAD / 2 + 1, -(ROAD / 2 + 1)]) {
          const x = st.x0 + st.dx * t - st.dz * off, z = st.z0 + st.dz * t + st.dx * off;
          if (Math.abs(x) > EXT + 10 || Math.abs(z) > EXT + 10) continue;
          expect(plan.grid.hit(x, 2, z, 0.3), `road at ${x.toFixed(1)},${z.toFixed(1)}`).toBeNull();
        }
      }
    }
  });

  it('knows how much open street lies ahead — closed segments end a dive early', () => {
    // the stadium closes the east–west street at row 3 alongside columns −5 and −4
    expect(plan.roomAhead('x', streetAt(3), -5 * G - 30, 1)).toBeCloseTo(11, 5);
    expect(plan.roomAhead('x', streetAt(3), -100, -1)).toBeCloseTo(33, 5);
    // a street runs to the fence, to a closed segment, or to a span roofing it
    const room = plan.roomAhead('z', streetAt(2), 0, 1);
    expect(room).toBeGreaterThan(20);
    expect(room).toBeLessThanOrEqual(EXT - 24);
    // the spans over the streets end the open street for the flight: no dive runs under a roof
    for (const o of plan.core.filter((s) => s.arch === 'over')) {
      const onLine = (v: number) => Math.abs((((v / G) % 1) + 1) % 1 - 0.5) < 0.05; // a street line sits at (i + ½)·G
      const axis = onLine(o.z) ? 'x' : 'z'; // an east–west road (travelled along x) lies on a z street line
      const at = axis === 'x' ? o.z : o.x, t = axis === 'x' ? o.x : o.z, half = (axis === 'x' ? o.w : o.d) / 2;
      expect(plan.roomAhead(axis, at, t - half - 30, 1)).toBeLessThanOrEqual(30.01);
      expect(plan.roomAhead(axis, at, t + half + 30, -1)).toBeLessThanOrEqual(30.01);
    }
  });

  it('keeps the avenues open down the middle (trees, lamps and bridges aside)', () => {
    for (let t = -EXT; t <= EXT; t += 5) {
      const a = plan.grid.hit(3, 12, t, 1);
      const b = plan.grid.hit(t, 12, 3, 1);
      expect(a, `canal avenue at z=${t}`).toBeNull();
      expect(b, `east-west avenue at x=${t}`).toBeNull();
    }
    expect(MEDIAN).toBe(12);
  });

  it('keeps the tour route clear of every solid — the city is built around the story flight', () => {
    const route = tourRoute();
    for (let i = 0; i <= 1500; i++) {
      const p = route.getPointAt(i / 1500);
      const hit = plan.grid.hit(p.x, p.y, p.z, CAM_R + 1.0);
      expect(hit, `route t=${i / 1500} at ${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)}`).toBeNull();
    }
  });

  it('places the rings where they belong', () => {
    for (const s of plan.outer) expect(Math.max(Math.abs(s.x), Math.abs(s.z))).toBeGreaterThan(EXT);
    for (const s of plan.sprawl) expect(Math.max(Math.abs(s.x), Math.abs(s.z))).toBeGreaterThan(EXT + 3 * G);
    for (const s of plan.core) expect(Math.max(Math.abs(s.x), Math.abs(s.z))).toBeLessThan(BOUND + 3 * G + STREET);
    expect(BOUND).toBe(EXT + STREET);
  });

  it('is deterministic for a seed', () => {
    const again = planCity(SEED);
    expect(again.core.length).toBe(plan.core.length);
    expect(again.core[7]).toEqual(plan.core[7]);
    expect(again.signs.length).toBe(plan.signs.length);
  });
});

describe('Newport City, layered (owner: messy, overlapping, Ghost in the Shell)', () => {
  const plan = planCity(SEED);

  it('has districts where the spec puts them', () => {
    expect(districtOf(3, -5)).toBe('walled');
    expect(districtOf(4, -2)).toBe('heights');
    expect(districtOf(-5, 5)).toBe('old');
    expect(districtOf(1, -1)).toBe('strip');
    expect(districtOf(-7, 1)).toBe('strip');
    expect(districtOf(-4, -4)).toBe('strip'); // on the diagonal boulevard
    expect(districtOf(6, 5)).toBe('mid');
  });

  it('crusts the facades and the roofs with the kit of a lived-in city', () => {
    expect(plan.clutter.length).toBeGreaterThan(8000);
    const kinds = new Set(plan.clutter.map((c) => c.kind));
    for (const k of ['ac', 'pipe', 'duct', 'dish', 'rail', 'escape', 'tank', 'beam', 'vend', 'bin', 'plant', 'booth', 'crate']) expect(kinds.has(k as never), k).toBe(true);
    for (const c of plan.clutter) { expect(Number.isFinite(c.x + c.y + c.z + c.w + c.h + c.d + c.rotY)).toBe(true); expect(c.w).toBeGreaterThan(0); }
  });

  it('fuses the lots into masses and stacks additions on the roofs and the walls', () => {
    const fac = plan.core.filter((s) => s.kind === 'facade' && (s.arch === 'block' || s.arch === 'tower' || s.arch === 'slab' || s.arch === 'low') && s.y - s.h / 2 < 0.5);
    let seams = 0;
    for (let i = 0; i < fac.length; i++) {
      const a = fac[i];
      for (let j = i + 1; j < fac.length; j++) {
        const b = fac[j];
        if (Math.abs(a.x - b.x) > 40 || Math.abs(a.z - b.z) > 40) continue;
        const gx = Math.abs(a.x - b.x) - (a.w + b.w) / 2, gz = Math.abs(a.z - b.z) - (a.d + b.d) / 2;
        if ((gx > 0 && gx < 0.2 && gz < 0) || (gz > 0 && gz < 0.2 && gx < 0)) seams += 1;
      }
    }
    expect(seams).toBeGreaterThan(300);
    expect(plan.core.filter((s) => s.arch === 'annex').length).toBeGreaterThan(400);
    expect(plan.core.filter((s) => s.arch === 'block').length).toBeGreaterThan(150);
  });

  it('bridges the streets with overbuilds above the flight band, never over an avenue', () => {
    const overs = plan.core.filter((s) => s.arch === 'over');
    expect(overs.length).toBeGreaterThan(20);
    for (const o of overs) {
      expect(o.y - o.h / 2, 'underside').toBeGreaterThanOrEqual(35); // the canyon band's top plus the flight's pad is 34.6
      expect(Math.abs(o.x) < 26 || Math.abs(o.z) < 26, 'over an avenue').toBe(false);
      expect(Math.max(o.w, o.d)).toBeGreaterThan(8); // it spans a street
    }
  });

  it('signs the street like Hong Kong: stacked hanging signs on brackets, billboards, screens, holograms, neon edges, wires', () => {
    expect(plan.signs.length).toBeGreaterThan(7000);
    const hangs = plan.signs.filter((s) => s.kind === 'hang');
    expect(hangs.length).toBeGreaterThan(2500);
    expect(hangs.filter((s) => s.w >= 2.4 && s.h >= 12).length).toBeGreaterThan(600); // the big ones
    for (const s of hangs) { expect(s.y - s.h / 2).toBeGreaterThanOrEqual(6.4); expect(s.w).toBeLessThanOrEqual(3.2); } // over a bus, never over the lanes
    expect(plan.clutter.filter((c) => c.kind === 'bracket').length).toBe(hangs.length * 2);
    expect(plan.billboards.length).toBeGreaterThan(200);
    for (const b of plan.billboards) { expect(b.w).toBeGreaterThanOrEqual(5); expect(b.art).toBeGreaterThanOrEqual(0); expect(b.art).toBeLessThan(24); expect(Number.isFinite(b.rotY)).toBe(true); }
    expect(plan.billboards.filter((b) => b.w >= 14).length).toBeGreaterThanOrEqual(6); // the giants
    expect(plan.spots.length / 3).toBeGreaterThan(300);
    expect(plan.signs.filter((s) => s.kind === 'screen').length).toBeGreaterThan(30);
    expect(new Set(plan.holos.map((h) => h.kind)).size).toBe(4);
    expect(plan.leds.length).toBeGreaterThan(400);
    expect(plan.wires.length / 12).toBeGreaterThan(2000);
  });

  it('rings the city with an elevated rail: a closed loop at 38 with rounded corners, three stations, portals at the kerbs, streets the flight never dives', () => {
    const r = plan.rail;
    expect(r.pts.length).toBeGreaterThan(60);
    const [x0, , z0] = r.pts[0], [x1, , z1] = r.pts[r.pts.length - 1];
    expect(Math.hypot(x1 - x0, z1 - z0)).toBeLessThan(14); // closed: the last point a step from the first
    for (const [x, y, z] of r.pts) {
      expect(y).toBe(RAIL.y);
      expect(Math.max(Math.abs(x), Math.abs(z))).toBeGreaterThan(RAIL.at - RAIL.r - 1);
      expect(Math.max(Math.abs(x), Math.abs(z))).toBeLessThan(RAIL.at + 1);
      expect(plan.grid.hit(x, y, z, 0.2), 'the deck is solid to the camera').not.toBeNull();
      expect(plan.grid.hit(x, y + 3, z, 1), `the track's air at ${x.toFixed(0)},${z.toFixed(0)}`).toBeNull(); // nothing stands up into it
    }
    expect(r.stations.length).toBe(3);
    expect(plan.streets.filter((s) => s.kind === 'catwalk' && Math.abs(s.y - RAIL.y - 0.6) < 0.01).length).toBe(6); // the platforms
    expect(r.portals.length).toBeGreaterThan(32);
    for (const p of r.portals) expect(Math.min(Math.abs(Math.abs(p.x) - RAIL.at), Math.abs(Math.abs(p.z) - RAIL.at))).toBeLessThan(0.01); // on a ring street's line
    expect(plan.roomAhead('x', RAIL.at, 0, 1)).toBe(0);
    expect(plan.roomAhead('z', -RAIL.at, 0, -1)).toBe(0);
  });

  it('strings catwalks across the alleys and arcades along the facades, every one at its own height', () => {
    const cats = plan.streets.filter((s) => s.kind === 'catwalk');
    expect(cats.length).toBeGreaterThan(150);
    for (const c of cats) { expect(Number.isFinite(c.y)).toBe(true); expect(c.y).toBeGreaterThanOrEqual(4); expect(c.width).toBeGreaterThan(1); }
    expect(cats.filter((c) => c.width === 1.6).length).toBeGreaterThan(30); // the arcades along the facades
    expect(cats.filter((c) => c.width === 1.4).length).toBeGreaterThan(80); // across the alleys
  });
});

describe('AutoFlight', () => {
  const plan = planCity(SEED);

  it('never enters a building, stays inside the fence, dives but not too low, orbits, runs the avenues, and does not repeat itself', () => {
    const visited = new Set<string>();
    const firstPaths: string[] = [];
    let orbits = 0, flyovers = 0, dives = 0;
    let maxTurn = 0, minStep = Infinity, maxStep = 0, kinks = 0, steps = 0;
    for (const s of [1, 2, 3]) {
      const flight = new AutoFlight(plan.grid, mulberry32(s), new Vector3(-130, 80, 160), 2.5, plan.roomAhead, plan.pois);
      const pos = new Vector3();
      const look = new Vector3();
      const prev = new Vector3(-130, 80, 160);
      const prevDir = new Vector3();
      const dir = new Vector3();
      let lowest = Infinity;
      for (let i = 0; i < 24000; i++) {
        flight.step(0.5, pos, look);
        const hit = plan.grid.hit(pos.x, pos.y, pos.z, CAM_R * 0.8);
        expect(hit, `seed ${s} step ${i} at ${pos.x.toFixed(1)},${pos.y.toFixed(1)},${pos.z.toFixed(1)}`).toBeNull();
        expect(Math.abs(pos.x)).toBeLessThanOrEqual(BOUND);
        expect(Math.abs(pos.z)).toBeLessThanOrEqual(BOUND);
        expect(pos.y).toBeGreaterThan(2);
        lowest = Math.min(lowest, pos.y);
        visited.add(`${Math.round(pos.x / 20)}:${Math.round(pos.z / 20)}`);
        if (i === 3000) firstPaths.push(`${pos.x.toFixed(0)},${pos.z.toFixed(0)}`);
        // SMOOTH (owner: no jitter, no sudden movements): a steady pace, and
        // the heading never kinks between one step and the next
        dir.subVectors(pos, prev);
        const step = dir.length();
        if (i > 0) { minStep = Math.min(minStep, step); maxStep = Math.max(maxStep, step); }
        if (i > 1 && step > 0.1 && prevDir.lengthSq() > 0.01) { const a = prevDir.angleTo(dir); maxTurn = Math.max(maxTurn, a); if (a > 0.06) kinks += 1; steps += 1; }
        prevDir.copy(dir); prev.copy(pos);
      }
      dives += flight.dives; // it goes down into the streets, not just rooftops (a seed may cruise long between dives: counted across the three)
      expect(lowest).toBeGreaterThan(14); // but never down among the traffic (owner: raise the dives)
      expect(flight.fallbacks).toBe(0); // every leg it flew was validated, none forced
      orbits += flight.orbits; flyovers += flight.flyovers;
    }
    expect(visited.size).toBeGreaterThan(100);
    expect(new Set(firstPaths).size).toBe(3); // three seeds, three flights
    expect(orbits).toBeGreaterThan(2);
    expect(dives).toBeGreaterThan(2);
    expect(flyovers).toBeGreaterThan(2);
    expect(minStep).toBeGreaterThan(0.44); // arc length: the pace never sags into a knot
    expect(maxStep).toBeLessThan(0.56);
    expect(maxTurn).toBeLessThan(0.15); // never a corner: under 8.6° per half-unit step, even at a knot
    expect(kinks / steps).toBeLessThan(0.004); // and a bend over 3.4° is a rare thing
  });

  it('moves at the asked pace and reports its leg and phase', () => {
    const flight = new AutoFlight(plan.grid, mulberry32(9), new Vector3(0, 90, 0), 0, plan.roomAhead, plan.pois);
    const a = new Vector3(); const b = new Vector3(); const l = new Vector3();
    flight.step(0.5, a, l);
    let travelled = 0;
    const leg0 = flight.legId;
    for (let i = 0; i < 400; i++) { flight.step(0.5, b, l); travelled += b.distanceTo(a); a.copy(b); }
    expect(travelled / 400).toBeGreaterThan(0.47);
    expect(travelled / 400).toBeLessThan(0.53);
    expect(flight.legId).toBeGreaterThanOrEqual(leg0);
    expect(['cruise', 'dive', 'canyon', 'climb', 'orbit', 'flyover']).toContain(flight.phase);
  });
});

describe('starPositions', () => {
  it('covers the whole dome — no hole at the zenith, no empty elevation band', () => {
    const pos = starPositions(mulberry32(3), 4000, 700, 820);
    const bins = new Array(9).fill(0); // 10° elevation bins, 0..90
    let zenith = 0;
    for (let i = 0; i < pos.length; i += 3) {
      const r = Math.hypot(pos[i], pos[i + 1], pos[i + 2]);
      const el = (Math.asin(pos[i + 1] / r) * 180) / Math.PI;
      if (el >= 0) bins[Math.min(8, Math.floor(el / 10))] += 1;
      if (el > 70) zenith += 1;
      expect(r).toBeGreaterThanOrEqual(699);
      expect(r).toBeLessThanOrEqual(821);
    }
    expect(zenith).toBeGreaterThan(150); // the cap above 70° is ~6% of the sphere → ~220 of 4000
    for (const [i, n] of bins.entries()) expect(n, `elevation bin ${i * 10}°`).toBeGreaterThan(40);
  });
});
