import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  ARTERIAL, ARTERIAL_ROW, arterialLat, arterialZ, AutoFlight, BOUND, CAM_R, CANAL, carriagewayAt, CollisionGrid, districtOf, EXT, G, HIGHWAY, MEDIAN, planCity, RAIL, RAMP, RAMP_W, rampY,
  ROAD, starPositions, STREET, streetAt, tourRoute,
} from '../src/about/city-plan';
import { mulberry32 } from '../src/lib/rng';
import { streetPoint } from '../src/about/city-traffic';
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
    for (const k of ['road', 'highway', 'canal', 'alley', 'diagonal', 'arterial', 'ramp']) expect(kinds.has(k as never), k).toBe(true);
    expect(plan.streets.filter((s) => s.kind === 'alley').length).toBeGreaterThan(120);
    expect(plan.streets.filter((s) => s.kind === 'road').length).toBeGreaterThan(44); // closed segments split the runs
    expect(plan.wires.length).toBeGreaterThan(1200);
    expect(plan.wires.length % 12).toBe(0); // three segments per wire, two endpoints each
    expect(plan.lanterns.length / 3).toBeGreaterThan(400);
    expect(plan.vents.length).toBeGreaterThan(20);
    expect(plan.holos.length).toBe(12);
    expect(plan.stalls.length).toBeGreaterThan(80); // the night market and three flea markets
    expect(plan.stacks.length).toBeGreaterThanOrEqual(2);
    expect(plan.bridges.length).toBe(21); // twenty east–west roads' and the arterial's skewed one (the arterial took two crossings)
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

  it('keeps every open road clear: nothing solid stands on a road or a pavement, on the arterial\'s lanes or on a ramp', () => {
    const arterial = plan.streets.find((s) => s.kind === 'arterial')!;
    for (let t = 1; t < arterial.len; t += 3) {
      for (const off of [-5.4, -3, 3, 5.4]) {
        const x = arterial.x0 + arterial.dx * t - arterial.dz * off, z = arterial.z0 + arterial.dz * t + arterial.dx * off;
        if (Math.abs(x) > EXT + 10) continue;
        expect(plan.grid.hit(x, 2, z, 0.3), `arterial at ${x.toFixed(1)},${z.toFixed(1)}`).toBeNull();
      }
    }
    for (const r of plan.streets.filter((s) => s.kind === 'ramp')) {
      for (let t = 1; t < r.len; t += 3) expect(plan.grid.hit(r.x0 + r.dx * t, rampY(r, t) + 2, r.z0 + r.dz * t, 0.3), `ramp at t=${t}`).toBeNull();
    }
    for (const st of plan.streets) {
      if (st.kind !== 'road') continue;
      for (let t = 1; t < st.len; t += 3) {
        for (const off of [0, ROAD / 2 - 0.5, -(ROAD / 2 - 0.5)]) { // the carriageway, to its kerbs (the pavements carry lamps, legs and kit by design)
          const x = st.x0 + st.dx * t - st.dz * off, z = st.z0 + st.dz * t + st.dx * off;
          if (Math.abs(x) > EXT + 10 || Math.abs(z) > EXT + 10) continue;
          const q = { x: 0, y: 0, z: 0 };
          streetPoint(st, t, off, q); // the road's own height
          expect(plan.grid.hit(x, q.y + 2, z, 0.25), `road at ${x.toFixed(1)},${z.toFixed(1)}`).toBeNull();
        }
      }
    }
  });

  it('knows how much open street lies ahead — closed segments end a dive early', () => {
    // the stadium closes the east–west street at row 3 alongside columns −5 and −4
    expect(plan.roomAhead('x', streetAt(3), -5 * G - 30, 1)).toBeCloseTo(11, 5);
    expect(plan.roomAhead('x', streetAt(3), 200, -1)).toBe(0); // the arterial's right of way closed this segment of the same street
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
      const a = Math.abs(arterialLat(3, t)) < HIGHWAY.width / 2 + 4 ? null : plan.grid.hit(3, 12, t, 1); // (the deck bridges the canal)
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
    expect(overs.length).toBeGreaterThan(15); // (the arterial took a swath of the north's streets)
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
    expect(plan.billboards.length).toBeGreaterThan(150);
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
    expect(r.portals.length).toBeGreaterThanOrEqual(30); // (never in a crossing street, never under the arterial's deck)
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

describe('The viaduct over its arterial (owner: roads that exist in real life)', () => {
  const plan = planCity(SEED);
  const ramps = plan.streets.filter((s) => s.kind === 'ramp');
  const roads = plan.streets.filter((s) => s.kind === 'road');
  const ns = roads.filter((s) => s.dx === 0), ew = roads.filter((s) => s.dz === 0);
  const end = (r: typeof ramps[number]) => ({ x: r.x0 + r.dx * r.len, z: r.z0 + r.dz * r.len, y: rampY(r, r.len) });

  it('runs an arterial under the deck, the deck at 11 on piers in its median', () => {
    const a = plan.streets.filter((s) => s.kind === 'arterial');
    expect(a.length).toBe(1);
    expect(a[0].width).toBe(ARTERIAL.w);
    expect(a[0].len).toBeGreaterThan(800);
    expect(HIGHWAY.y).toBe(11);
    expect(plan.piers.length).toBeGreaterThanOrEqual(36);
    const along = plan.piers.map((p) => (p.x - HIGHWAY.x0) / 0.987).sort((p, q) => p - q);
    for (let i = 1; i < along.length; i++) {
      const gap = along[i] - along[i - 1], x = HIGHWAY.x0 + along[i] * 0.987;
      expect(gap, `pier gap before x=${x.toFixed(0)}`).toBeLessThanOrEqual(Math.abs(x) < 40 ? 60 : 20.5); // (none over the water)
    }
    for (const p of plan.piers) { // in the median, never inside a crossing's box
      expect(Math.abs(arterialLat(p.x, p.z))).toBeLessThan(0.3);
      for (let i = -12; i <= 12; i++) expect(Math.abs(p.x - streetAt(i)), `pier near the crossing at x=${streetAt(i)}`).toBeGreaterThan(8.5);
      expect(plan.grid.hit(p.x, 5, p.z, 0.5), 'the pier is solid').not.toBeNull();
    }
  });

  it('builds four ramps as chains of three pieces that meet end to end, from the deck\'s edge lane to the arterial\'s kerb lane', () => {
    expect(ramps.length).toBe(12);
    for (const r of ramps) expect(r.width).toBe(RAMP_W);
    const starts = new Set(ramps.map((r) => r));
    // a chain's loose end is on the deck's edge lane at deck height (an on-ramp's top) or on the arterial's kerb lane at grade (an off-ramp's foot)
    const loose = (x: number, z: number, y: number) => {
      const lat = Math.abs(arterialLat(x, z));
      if (Math.abs(y - HIGHWAY.y - 0.4) < 0.01) { expect(Math.abs(lat - RAMP.mount)).toBeLessThan(0.05); return 'deck'; }
      expect(Math.abs(y - CANAL.deck)).toBeLessThan(0.01); expect(Math.abs(lat - RAMP.foot)).toBeLessThan(0.05); return 'arterial';
    };
    const tails: string[] = [];
    for (const r of ramps) {
      const e = end(r);
      const next = ramps.find((q) => q !== r && Math.hypot(q.x0 - e.x, q.z0 - e.z) < 0.05);
      if (next) { expect(Math.abs(next.y - e.y), 'a joint at one height').toBeLessThan(0.05); starts.delete(next); }
      else tails.push(loose(e.x, e.z, e.y));
    }
    expect(tails.sort()).toEqual(['arterial', 'arterial', 'deck', 'deck']); // two off-ramps end on the arterial, two on-ramps on the deck
    const heads = [...starts].map((r) => loose(r.x0, r.z0, r.y)).sort();
    expect(heads).toEqual(['arterial', 'arterial', 'deck', 'deck']);
    for (const r of ramps) expect(r.oneWay).toBe(true);
  });

  it('grades the runs like a real ramp and keeps the tapers and slips flat', () => {
    let runs = 0;
    for (const r of ramps) {
      if (r.y === r.y1) continue;
      runs += 1;
      let steepest = 0;
      for (let t = 1; t <= r.len; t += 1) steepest = Math.max(steepest, Math.abs(rampY(r, t) - rampY(r, t - 1)));
      expect(steepest).toBeLessThanOrEqual(0.125);
      expect(steepest).toBeGreaterThan(0.08);
      expect(Math.abs(Math.abs(arterialLat(r.x0, r.z0)) - RAMP.lat)).toBeLessThan(0.05); // parallel to the deck, in the apron
      expect(Math.abs(Math.abs(arterialLat(end(r).x, end(r).z)) - RAMP.lat)).toBeLessThan(0.05);
    }
    expect(runs).toBe(4);
  });

  it('never passes a ramp lower than a bus over an open street, and closes the stubs it does', () => {
    for (const s of ns) {
      for (const r of ramps) {
        const x1 = r.x0 + r.dx * r.len;
        if (s.x0 < Math.min(r.x0, x1) || s.x0 > Math.max(r.x0, x1)) continue;
        const t = (s.x0 - r.x0) / r.dx, z = r.z0 + r.dz * t;
        if (z < s.z0 - 0.5 || z > s.z0 + s.len + 0.5) continue;
        expect(rampY(r, t), `a ramp ${rampY(r, t).toFixed(1)} high over the street at x=${s.x0}`).toBeGreaterThanOrEqual(RAMP.clear);
      }
    }
    for (const X of [-133, -57, 57, 133]) { // severed where a slip meets the arterial
      const zA = arterialZ(X);
      expect(ns.some((s) => Math.abs(s.x0 - X) < 0.5 && s.z0 < zA && s.z0 + s.len > zA), `x=${X} runs through the arterial`).toBe(false);
    }
    const tees = ns.filter((s) => Math.abs(s.z0 - arterialZ(s.x0)) < 0.5 || Math.abs(s.z0 + s.len - arterialZ(s.x0)) < 0.5);
    expect(tees.length).toBeGreaterThanOrEqual(5); // the stubs' survivors end on the axis (a spur too short to connect is dropped)
    for (const s of tees) {
      const pad = Math.abs(s.z0 - arterialZ(s.x0)) < 0.5 ? s.ends?.a : s.ends?.b;
      expect(pad, `the T at x=${s.x0} carries its pad`).toBeCloseTo((ARTERIAL_ROW - ARTERIAL.walk / 2) / 0.98708, 1);
      expect(s.len).toBeGreaterThan(20);
    }
  });

  it('closes every east–west segment its pavement would eat, and patches the ghost roads', () => {
    for (const s of ew) {
      for (let t = 0; t <= s.len; t += 4) {
        const x = s.x0 + t;
        if (Math.abs(x) > HIGHWAY.x1) continue;
        expect(Math.abs(arterialZ(x) - s.z0), `an east–west road at ${x.toFixed(0)},${s.z0}`).toBeGreaterThanOrEqual(ARTERIAL_ROW + STREET / 2);
      }
    }
    expect(plan.patches.length).toBeGreaterThan(20);
    for (const p of plan.patches) expect(Math.min(p.w, p.d)).toBeGreaterThan(0.5);
  });

  it('sinks the canal, floors its bridges flush, and keeps the quay lamps out of the water', () => {
    expect(CANAL.water).toBeLessThan(-2);
    expect(plan.bridges.filter((b) => b.yaw === 0).length).toBe(20);
    const skew = plan.bridges.filter((b) => b.yaw !== 0);
    expect(skew.length).toBe(1);
    expect(skew[0].w).toBeCloseTo(2 * ARTERIAL_ROW, 5);
    expect(Math.abs(skew[0].z - arterialZ(0))).toBeLessThan(0.01);
    const wet = plan.posts.filter((p) => Math.abs(p.x) < CANAL.w / 2 && Math.abs(p.x) > 5 && Math.abs(p.z) > 20 && (p.y ?? 0) < 1);
    expect(wet.length).toBe(0);
    expect(plan.streets.find((s) => s.kind === 'canal')!.y).toBeCloseTo(CANAL.water + 0.3, 5);
  });

  it('keeps every lamp post, kiosk, stall and tree out of every carriageway (owner: posts in the middle of the roads)', () => {
    for (const p of plan.posts) expect(carriagewayAt(plan.streets, p.x, p.z, p.y ?? 0), `a post in the road at ${p.x.toFixed(0)},${p.z.toFixed(0)}`).toBeNull();
    for (const s of plan.stalls) expect(carriagewayAt(plan.streets, s.x, s.z), `a stall in the road at ${s.x.toFixed(0)},${s.z.toFixed(0)}`).toBeNull();
    for (const s of plan.core) {
      if (s.kind !== 'tree' && !(s.kind === 'dark' && s.arch === 'street' && s.h <= 2.6 && s.y - s.h / 2 < 0.5)) continue;
      expect(carriagewayAt(plan.streets, s.x, s.z, s.y - s.h / 2), `street furniture in the road at ${s.x.toFixed(0)},${s.z.toFixed(0)}`).toBeNull();
    }
    const deckLamps = plan.posts.filter((p) => Math.abs((p.y ?? 0) - HIGHWAY.y - 1.5) < 0.01);
    expect(deckLamps.length).toBeGreaterThan(20); // on the parapets
    for (const p of deckLamps) expect(Math.abs(Math.abs(arterialLat(p.x, p.z)) - 8.25)).toBeLessThan(0.05);
  });

  it('gives the stations access towers and the city underground entrances, all of them doors', () => {
    expect(plan.doors.length).toBeGreaterThan(300);
    expect(plan.lifts.length).toBe(12); // two ends, two sides, three stations
    for (const l of plan.lifts) expect(l.top).toBeCloseTo(RAIL.y - 0.4, 5);
    const cores = plan.core.filter((s) => s.kind === 'facade' && s.arch === 'bridge' && Math.abs(s.h - (RAIL.y + 1.3)) < 0.01);
    expect(cores.length).toBe(24); // a stair core and a lift shaft at each
    for (const c of cores) expect(carriagewayAt(plan.streets, c.x, c.z), 'a tower in the road').toBeNull();
    expect(plan.subways.length).toBe(8);
    for (const s of plan.subways) {
      expect(carriagewayAt(plan.streets, s.x, s.z), 'an entrance in the road').toBeNull();
      expect(plan.doors.some((d) => Math.hypot(d.x - s.x, d.z - s.z) < 3), 'an entrance without its door').toBe(true);
    }
  });

  it('dresses the aprons: parked vehicles, stalls and shanties, none on the carriageway', () => {
    expect(plan.parked.length).toBeGreaterThan(10);
    for (const p of plan.parked) {
      const lat = Math.abs(arterialLat(p.x, p.z));
      expect(lat).toBeGreaterThan(ARTERIAL.w / 2 + 2.2);
      expect(lat).toBeLessThan(ARTERIAL_ROW - ARTERIAL.walk);
    }
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
