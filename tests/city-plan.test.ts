import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { ARTERIAL, ARTERIAL_ROW, arterialLat, arterialZ, AutoFlight, BOUND, CAM_R, CANAL, CANAL_END, carriagewayAt, CAT_TAIL, catTailCorners, CITADEL, cityTiles, CollisionGrid, corridorFiller, cutAtCorridor, districtOf, EXT, footprintInCorridor, G, HALF, HIGHWAY, LANE_CAR, LANE_W, HW_FAR, isMass, LANDMARK_ARCH, MEDIAN, OUTER, planCity, PLAZA, PLAZA_LAMP, RAIL, RAMP, RAMP_W, rampY, ROAD, starPositions, STREET, streetAt, TILE_P, tourRoute } from '../src/about/city-plan';
import { mulberry32 } from '../src/lib/rng';
import { streetPoint } from '../src/about/city-traffic';
import { FAMILIES, FLOOR as SKIN_FLOOR, PX as SKIN_PX, SHOP as SKIN_SHOP } from '../src/about/city-skins';
import { hasShop } from '../src/about/city-plan';
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
    for (const k of ['road', 'highway', 'canal', 'alley', 'diagonal', 'arterial']) expect(kinds.has(k as never), k).toBe(true);
    expect(kinds.has('ramp' as never)).toBe(false); // (owner: the ramps are cut)
    expect(plan.streets.filter((s) => s.kind === 'alley').length).toBeGreaterThan(120);
    expect(plan.streets.filter((s) => s.kind === 'road').length).toBeGreaterThan(44); // closed segments split the runs
    expect(plan.wires.length).toBeGreaterThan(1200);
    expect(plan.wires.length % 12).toBe(0); // three segments per wire, two endpoints each
    expect(plan.lanterns.length / 3).toBeGreaterThan(400);
    expect(plan.vents.length).toBeGreaterThan(20);
    expect(plan.holos.length).toBe(15); // (twelve, a ring of glyphs over each of the avenue's gates, the citadel's ring)
    expect(plan.stalls.length).toBeGreaterThan(80); // the night market and three flea markets
    expect(plan.stacks.length).toBeGreaterThanOrEqual(2);
    expect(plan.bridges.length).toBe(15); // fourteen east–west roads' inside the rim and the arterial's skewed one (the arterial took two crossings; the canal ends at the rim)
    expect(plan.stadium.masts.length).toBe(4);
    expect(plan.wheel.r).toBe(11.5);
    expect(plan.mega.top).toBeGreaterThan(100);
  });

  it('lays the air corridors clear of the skyline, and pads on the tallest roofs', () => {
    expect(plan.air.length).toBeGreaterThanOrEqual(16); // the avenues, two rings, two arcs, eight canyon lanes, the patrols
    expect(plan.air.filter((l) => l.kind === 'canyon').length).toBe(8);
    for (const l of plan.air.filter((q) => q.kind === 'canyon')) { // between the buildings, over whatever spans the street: mostly low
      for (const [, y] of l.pts) { expect(y).toBeGreaterThanOrEqual(46); expect(y).toBeLessThan(130); }
      expect(l.pts.filter((p) => p[1] <= 62).length / l.pts.length).toBeGreaterThan(0.6);
    }
    expect(plan.air.length).toBe(16); // the avenues, two rings, two arcs, eight canyon lanes, two patrols
    expect(plan.pads.length).toBe(7); // the six tallest roofs and the citadel's third tier
    for (const lane of plan.air) {
      const n = lane.pts.length;
      for (let i = 0; i < (lane.loop ? n : n - 1); i++) {
        const [ax, ay, az] = lane.pts[i], [bx, by, bz] = lane.pts[(i + 1) % n];
        for (let k = 0; k <= 24; k++) {
          const t = k / 24;
          const x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = az + (bz - az) * t;
          if (Math.abs(x) > EXT + G || Math.abs(z) > EXT + G) continue;
          expect(plan.grid.hit(x, y, z, lane.kind === 'canyon' ? 1.9 : 2.5), `${lane.kind} corridor at ${x.toFixed(0)},${y.toFixed(0)},${z.toFixed(0)}`).toBeNull();
        }
      }
    }
    expect(plan.stadium.gates.length).toBe(4);
  });

  it('dresses the streets: thousands of signs in every shape, lamp posts on every open kerb', () => {
    expect(plan.signs.length).toBeGreaterThan(5000);
    const kinds = new Set(plan.signs.map((s) => s.kind));
    for (const k of ['hang', 'wall', 'board', 'tag', 'roof', 'gantry', 'screen']) expect(kinds.has(k as never), k).toBe(true);
    expect(plan.posts.length).toBeGreaterThan(3800); // (the lanes' mouths take a few)
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
      if (st.kind !== 'road' && st.kind !== 'lane') continue;
      const half = st.kind === 'lane' ? LANE_CAR - 0.5 : ROAD / 2 - 0.5;
      for (let t = 1; t < st.len; t += 3) {
        for (const off of [0, half, -half]) { // the carriageway, to its kerbs (the pavements carry lamps, legs and kit by design)
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
      const a = Math.abs(arterialLat(3, t)) < HIGHWAY.width / 2 + 4 || Math.abs(t) < 9 ? null : plan.grid.hit(3, 12, t, 1); // (the deck bridges the canal; the stallion stands on the plaza)
      const b = Math.abs(t) < 9 ? null : plan.grid.hit(t, 12, 3, 1);
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

  it('hangs every condenser on a spandrel — the blank band between two floors of its wall, never on a window', () => {
    const bodies = [...plan.core, ...plan.outer].filter((s) => s.kind === 'facade' && s.h >= 6);
    const acs = plan.clutter.filter((c) => c.kind === 'ac' && c.w < 0.7); // the wall units (a roof row is 0.9 wide)
    expect(acs.length).toBeGreaterThan(600);
    let checked = 0;
    for (let i = 0; i < acs.length; i += 7) {
      const c = acs[i];
      const walls = bodies.filter((s) => Math.abs(c.y - s.y) < s.h / 2 && ((Math.abs(Math.abs(c.x - s.x) - s.w / 2 - 0.28) < 0.05 && Math.abs(c.z - s.z) <= s.d / 2) || (Math.abs(Math.abs(c.z - s.z) - s.d / 2 - 0.28) < 0.05 && Math.abs(c.x - s.x) <= s.w / 2)));
      if (!walls.length) continue; // (a unit under an annex's wall, or a wall the sample missed: not the wall in question)
      const fits = walls.some((body) => { // one of the bodies sharing that wall plane hung it on its own spandrel
        const fam = FAMILIES.find((f) => f.win === plan.styles[body.tex].win)!;
        const base = hasShop(body) ? SKIN_SHOP / SKIN_PX : 0, pitch = SKIN_FLOOR / SKIN_PX;
        const lo = (fam.wy + fam.wh) / SKIN_PX, hi = pitch + fam.wy / SKIN_PX; // the window's top .. the next sill (the band crosses the floor line)
        let up = (((c.y - base) % pitch) + pitch) % pitch; // up from its floor's bottom
        if (up + c.h / 2 < lo) up += pitch; // (a unit just past the floor line belongs to the band below it)
        return up - c.h / 2 >= lo - 0.02 && up + c.h / 2 <= hi + 0.02;
      });
      expect(fits, `a condenser at ${c.x.toFixed(1)},${c.y.toFixed(2)},${c.z.toFixed(1)} off the spandrel of every wall it hangs on`).toBe(true);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(60);
  });

  it('rails every balcony slab and fire-escape platform on three sides', () => {
    const rails = plan.clutter.filter((c) => c.kind === 'rail');
    const near = (x: number, z: number, r: number) => rails.filter((q) => Math.abs(q.x - x) <= r && Math.abs(q.z - z) <= r);
    const slabs = plan.core.filter((s) => s.kind === 'dark' && s.arch === 'bits' && (s.h === 0.22 || s.h === 0.12) && (s.w === 0.9 || s.d === 0.9) && Math.max(s.w, s.d) >= 2);
    expect(slabs.length).toBeGreaterThan(200);
    let checked = 0;
    for (let i = 0; i < slabs.length; i += 3) {
      const s = slabs[i];
      const here = near(s.x, s.z, Math.max(s.w, s.d) / 2 + 0.6).filter((q) => Math.abs(q.y - s.y) < 0.8);
      const front = here.filter((q) => q.w >= 2), sides = here.filter((q) => q.w < 1);
      expect(front.length, `a front rail on the slab at ${s.x.toFixed(1)},${s.y.toFixed(1)},${s.z.toFixed(1)}`).toBeGreaterThanOrEqual(1);
      expect(sides.length, `two end rails on the slab at ${s.x.toFixed(1)},${s.y.toFixed(1)},${s.z.toFixed(1)}`).toBeGreaterThanOrEqual(2);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(60);
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
    expect(overs.length).toBeGreaterThanOrEqual(8); // (the arterial took a swath of the north's streets; the lanes' tube houses are too low to carry a span)
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
    expect(r.portals.length).toBeGreaterThanOrEqual(28); // (never in a crossing street, never under the arterial's deck; the undercroft moved the kit under the line by one)
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

  it('cuts the ramps (owner): no ramp, no street severed or stubbed for one — every north–south line the slips once met crosses the arterial at grade', () => {
    expect(ramps.length).toBe(0);
    for (const X of [-133, -57, 57, 133]) {
      const zA = arterialZ(X);
      expect(ns.some((s) => Math.abs(s.x0 - X) < 0.5 && s.z0 < zA && s.z0 + s.len > zA), `x=${X} runs through the arterial`).toBe(true);
    }
  });

  it('builds THE UNDERCROFT (owner: dense building under the highway): infill units on both aprons, turned with the deck, the road and the pavement clear; a ceiling of kit above the traffic', () => {
    const units = plan.core.filter((s) => s.arch === 'undercroft');
    expect(units.length).toBeGreaterThan(50);
    let north = 0, south = 0;
    for (const u of units) {
      const lat = arterialLat(u.x, u.z);
      expect(Math.abs(Math.abs(lat) - (ARTERIAL.w / 2 + 1.3 + 3)), `a unit at ${u.x.toFixed(0)},${u.z.toFixed(0)} off its line`).toBeLessThan(0.05);
      expect(Math.abs((u.rotY ?? 0) - Math.atan2(0.1625, 0.98676))).toBeLessThan(0.02); // turned with the axis
      expect(u.h).toBeGreaterThanOrEqual(7); expect(u.h).toBeLessThanOrEqual(10.5); // under the deck's edge
      if (lat > 0) north += 1; else south += 1;
      for (let i = -12; i <= 12; i++) expect(Math.abs(u.x - streetAt(i)), `a unit in the band of the street at x=${streetAt(i)}`).toBeGreaterThan(STREET / 2 + 0.4 + u.w / 2); // past the crossing street's kerb
    }
    expect(north).toBeGreaterThan(20); expect(south).toBeGreaterThan(20);
    const hanging = plan.clutter.filter((c) => (c.kind === 'pipe' || c.kind === 'duct' || c.kind === 'beam') && c.y > 9 && c.y < 10.2 && Math.abs(arterialLat(c.x, c.z)) < 6);
    expect(hanging.length).toBeGreaterThan(20);
    for (const c of hanging) expect(c.y - c.h / 2).toBeGreaterThan(7); // over a bus
    const mezz = plan.core.filter((s) => s.kind === 'dark' && s.arch === 'street' && s.h === 2.6 && Math.abs(s.y - 8.6) < 0.01 && Math.abs(arterialLat(s.x, s.z)) < 6);
    expect(mezz.length).toBeGreaterThan(3);
    for (const m of mezz) expect(m.y - m.h / 2).toBeGreaterThanOrEqual(7.2);
  });

  it('keeps the highway\'s carriageway clear end to end (owner: "rails clipping on the main highways"): nothing solid at deck height across its lanes', () => {
    const hw = plan.streets.find((s) => s.kind === 'highway')!;
    // (the street runs HW_FAR past each end of the square: the continuation crosses the sprawl's boxes, which the fog hides; the deck's own span is what must be clear)
    for (let t = HW_FAR + 2; t < hw.len - HW_FAR; t += 4) {
      for (const off of [-6.5, -3.5, 0, 3.5, 6.5]) {
        const x = hw.x0 + hw.dx * t - hw.dz * off, z = hw.z0 + hw.dz * t + hw.dx * off;
        expect(plan.grid.hit(x, hw.y + 2, z, 0.3), `the deck at ${x.toFixed(0)},${z.toFixed(0)}`).toBeNull();
      }
    }
  });

  it.skip('built four ramps as chains of three pieces (cut: owner) — kept for a plan with ramps', () => {
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

  it.skip('graded the runs like a real ramp and kept the tapers and slips flat (cut: owner)', () => {
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

  it.skip('never passed a ramp lower than a bus over an open street, and closed the stubs it did (cut: owner)', () => {
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
    expect(plan.bridges.filter((b) => b.yaw === 0).length).toBe(14);
    for (const b of plan.bridges) expect(Math.abs(b.z), 'no bridge past the end of the canal').toBeLessThanOrEqual(CANAL_END);
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

  it('throws parties on the roofs, puts people on the balconies, builds the festival and the plaza', () => {
    expect(plan.parties.length).toBe(8);
    for (const p of plan.parties) { expect(p.y).toBeGreaterThan(22); expect(p.y).toBeLessThan(83); expect(Math.min(p.w, p.d)).toBeGreaterThan(4.9); }
    expect(plan.perches.length).toBeGreaterThan(200);
    for (const p of plan.perches.slice(0, 50)) expect(p.y).toBeGreaterThan(3);
    // every perch stands on a balcony's slab, a step clear of its ends (owner: they stood in the air past the slab)
    const slabs = plan.core.filter((s) => s.kind === 'dark' && s.arch === 'bits' && Math.abs(s.h - 0.22) < 0.001);
    const off: string[] = [];
    for (const p of plan.perches) {
      const on = slabs.some((s) => Math.abs(s.y + s.h / 2 - p.y) < 0.01 && Math.abs(p.x - s.x) <= s.w / 2 - 0.3 && Math.abs(p.z - s.z) <= s.d / 2 - 0.3);
      if (!on) off.push(`${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`);
    }
    expect(off, 'perches off their slab').toEqual([]);
    expect(plan.stages.length).toBe(2);
    expect(plan.core.some((s) => s.kind === 'cyl' && s.w === 30), 'the dark disc is gone').toBe(false);
    expect(plan.grid.hit(0, 6, 0, 0.5), 'the statue is solid to the flight').not.toBeNull();
  });

  it('lays the plaza as its block: quay wall to quay wall, bridge deck to bridge deck, nothing of it on a road (owner: the disc spilled over the roads and showed the water at its corners)', () => {
    expect(PLAZA.w).toBe(CANAL.w); // the canal's slot, wall to wall
    expect(PLAZA.d).toBe(G - STREET); // the block between the streets either side
    for (const s of [-1, 1]) { // the bridges either side meet its edges: no water between
      const b = plan.bridges.find((q) => q.yaw === 0 && Math.abs(q.z - s * (PLAZA.d / 2 + STREET / 2)) < 1e-6);
      expect(b, `the bridge at z = ${s * (PLAZA.d / 2 + STREET / 2)}`).toBeDefined();
      expect(b!.span).toBeGreaterThanOrEqual(PLAZA.w);
    }
    for (let x = -PLAZA.w / 2 + 0.25; x < PLAZA.w / 2; x += 0.5) for (let z = -PLAZA.d / 2 + 0.25; z < PLAZA.d / 2; z += 0.5) {
      const road = carriagewayAt(plan.streets, x, z);
      expect(road === null || road.kind === 'canal', `the plaza at ${x}, ${z} on the ${road?.kind}`).toBe(true); // (the canal runs under it)
    }
    const furniture = plan.core.filter((q) => q.arch === 'street' && Math.hypot(q.x, q.z) < 14 && q.y < 4);
    expect(furniture.length).toBe(18); // six planters, six trees in them, six benches
    for (const q of furniture) {
      expect(Math.abs(q.x) + q.w / 2, 'on the deck').toBeLessThan(PLAZA.w / 2);
      expect(Math.abs(q.z) + q.d / 2, 'on the deck').toBeLessThan(PLAZA.d / 2);
    }
    // its ring of lamps (owner: "add a ring of lamps on the plaza deck"): twelve on the deck, between the furniture, off
    // the axes (the bridges' poles stand there), their arms reaching in toward the statue, solid to the crowd
    const lamps = plan.posts.filter((q) => Math.abs(q.x) < PLAZA.w / 2 && Math.abs(q.z) < PLAZA.d / 2);
    expect(lamps.length).toBe(12);
    for (const q of lamps) {
      expect(Math.hypot(q.x, q.z)).toBeCloseTo(PLAZA_LAMP.r, 5);
      expect(q.y, 'standing on the deck').toBe(CANAL.deck);
      expect(q.h).toBe(PLAZA_LAMP.h);
      expect(Math.max(Math.abs(q.x), Math.abs(q.z)) + 0.11, 'on the deck').toBeLessThan(PLAZA.w / 2);
      expect(Math.min(Math.abs(q.x), Math.abs(q.z)), 'off the axes').toBeGreaterThan(2.5);
      expect(q.arm, 'an arm of its own').toBeDefined();
      expect(q.arm![0] * q.x + q.arm![1] * q.z, 'reaching in toward the statue').toBeLessThan(-0.99 * PLAZA_LAMP.r);
      for (const f of furniture) expect(Math.hypot(f.x - q.x, f.z - q.z) - Math.max(f.w, f.d) / 2, 'clear of the planters and benches').toBeGreaterThan(1);
      expect(plan.grid.hit(q.x, 0.9, q.z, 0.3), 'the crowd walks round it').not.toBeNull();
    }
  });

  it('varies the canal and breaks the blocks: five bridge builds, quay stairs, market streets, conduits, rooftop plant', () => {
    expect(new Set(plan.bridges.filter((b) => b.yaw === 0).map((b) => b.kind)).size).toBe(5);
    const markets = plan.streets.filter((s) => s.kind === 'alley' && s.width === STREET - 1);
    expect(markets.length).toBe(3);
    for (const m of markets) expect(plan.stalls.filter((st) => Math.abs(-(st.x - m.x0) * m.dz + (st.z - m.z0) * m.dx) < 3 && (st.x - m.x0) * m.dx + (st.z - m.z0) * m.dz > -1 && (st.x - m.x0) * m.dx + (st.z - m.z0) * m.dz < m.len + 1).length).toBeGreaterThan(6);
    const conduits = plan.core.filter((s) => s.kind === 'dark' && s.arch === 'bits' && Math.abs(s.w - 0.42) < 0.01 && Math.abs(s.h - 0.42) < 0.01 || s.kind === 'dark' && s.arch === 'bits' && Math.abs(s.d - 0.42) < 0.01 && Math.abs(s.h - 0.42) < 0.01);
    expect(conduits.length).toBeGreaterThan(60); // three pipes a bridge
    for (const c of conduits) { expect(c.y).toBeGreaterThan(11.5); expect(c.y).toBeLessThan(18); }
    const towers = plan.core.filter((s) => s.kind === 'cyl' && s.arch === 'industry' && Math.abs(s.w - 3.6) < 0.01).length, glass = plan.core.filter((s) => s.kind === 'facade' && s.arch === 'bits' && Math.abs(s.h - 2.6) < 0.01).length;
    expect(towers + glass, 'rooftop plant: cooling towers and greenhouses').toBeGreaterThan(12);
    const stairs = plan.core.filter((s) => s.arch === 'street' && s.kind === 'dark' && Math.abs(s.w - 1.6) < 0.01 && Math.abs(s.h - 0.3) < 0.01 && s.y < 0);
    expect(stairs.length).toBeGreaterThan(20); // the quay stairs' steps
  });

  it('dresses the aprons: parked vehicles, stalls and shanties, none on the carriageway', () => {
    const aprons = plan.parked.filter((p) => Math.abs(arterialLat(p.x, p.z)) < ARTERIAL_ROW + 1);
    expect(aprons.length).toBeGreaterThan(4); // (the undercroft's units took most of the aprons: the parked stand in its yards)
    for (const p of aprons) {
      const lat = Math.abs(arterialLat(p.x, p.z));
      expect(lat).toBeGreaterThan(ARTERIAL.w / 2 + 2.2);
      expect(lat).toBeLessThan(ARTERIAL_ROW - ARTERIAL.walk);
    }
  });

  it('cuts the boulevard in two at THE CITADEL: the halves end at the six-ways, and a turned stepped citadel stands on the block between', () => {
    const halves = plan.streets.filter((s) => s.kind === 'diagonal');
    expect(halves.length).toBe(2);
    expect(halves.some((s) => Math.abs(s.x0 + s.dx * s.len - streetAt(-5)) < 0.1 && Math.abs(s.z0 + s.dz * s.len - streetAt(-3)) < 0.1)).toBe(true); // the west half ends at (−171, −95)
    expect(halves.some((s) => Math.abs(s.x0 - streetAt(-3)) < 0.1 && Math.abs(s.z0 - streetAt(-5)) < 0.1)).toBe(true); // the east half starts at (−95, −171)
    const citadel = plan.core.filter((s) => s.arch === 'citadel');
    expect(citadel.length).toBeGreaterThanOrEqual(8);
    expect(citadel.filter((s) => s.kind === 'facade' && Math.abs((s.rotY ?? 0) - Math.PI / 4) < 0.01).length).toBe(4); // the tiers, turned
    for (const s of citadel) { expect(Math.abs(s.x - CITADEL.x)).toBeLessThan(32); expect(Math.abs(s.z - CITADEL.z)).toBeLessThan(32); } // within its block
    expect(plan.grid.hit(CITADEL.x, 50, CITADEL.z, 0.5), 'the citadel is solid to the flight').not.toBeNull();
    expect(plan.grid.hit(CITADEL.x, 104, CITADEL.z, 0.5), 'its crown').not.toBeNull();
    expect(plan.grid.hit(CITADEL.x + 24, 5, CITADEL.z - 24, 0.3), 'the forecourt is open').toBeNull();
    expect(plan.plazas.filter((p) => Math.abs(p.x - CITADEL.x) < 30 && Math.abs(p.z - CITADEL.z) < 30).length).toBe(2); // the forecourts
    expect(plan.pois.some((p) => Math.abs(p.x - CITADEL.x) < 1 && Math.abs(p.z - CITADEL.z) < 1)).toBe(true);
    expect(plan.pads.some((p) => Math.abs(p.x - CITADEL.x) < 1 && Math.abs(p.z - CITADEL.z) < 1 && p.y > 69)).toBe(true); // the drone pad
    expect(plan.holos.some((h) => Math.abs(h.x - CITADEL.x) < 1 && h.kind === 'ring' && h.y > 110)).toBe(true);
  });

  it('lists the flat roofs for the runners', () => {
    expect(plan.roofs.length).toBeGreaterThan(400);
    for (const r of plan.roofs.slice(0, 200)) { expect(r.w).toBeGreaterThanOrEqual(6); expect(r.d).toBeGreaterThanOrEqual(6); expect(r.top).toBeGreaterThanOrEqual(8); }
  });

  it('gives the stadium a forecourt and two entrances and the wheel a boarding station, crowds in both, the arterial\'s pavement clear of the base', () => {
    expect(plan.plazas.length).toBe(4); // the stadium's forecourt, the wheel's station, the citadel's two forecourts
    const st = plan.stadium;
    expect(st.d).toBe(36);
    for (let x = st.x - 20; x <= st.x + 20; x += 5) expect(plan.grid.hit(x, 0.9, arterialZ(x) - ARTERIAL_ROW + 1.3, 0.3), 'the arterial pavement by the stadium').toBeNull();
    expect(plan.doors.some((d) => Math.abs(d.x - st.x) < 1 && Math.abs(d.z - (st.z - st.d / 2 - 2.6)) < 1)).toBe(true); // the south forecourt's turnstiles
    expect(plan.doors.some((d) => Math.abs(d.x - st.x) < 1 && Math.abs(d.z - (st.z + st.d / 2 + 0.4)) < 1)).toBe(true); // the north entrance off the arterial
    expect(plan.stalls.filter((q) => Math.abs(q.z - (st.z - st.d / 2 - 4.5)) < 1).length).toBe(2);
    expect(plan.doors.some((d) => Math.abs(d.x - (plan.wheel.x + 11.4)) < 1 && Math.abs(d.z - plan.wheel.z) < 1)).toBe(true);
  });

  it('sits the cat on the megastructure summit, solid to the flight, no party on it, and fires fireworks from nine sites', () => {
    const cat = plan.cat!;
    expect(cat).not.toBeNull();
    expect(cat.y).toBeGreaterThanOrEqual(84); // the megastructure's summit tier
    expect(cat.w).toBeGreaterThanOrEqual(14);
    expect(Math.abs(cat.x)).toBeLessThan(190); expect(Math.abs(cat.z)).toBeLessThan(190);
    expect(plan.grid.hit(cat.x, cat.y + cat.w * 0.6, cat.z, 0.5), 'the cat is solid').not.toBeNull();
    expect(plan.parties.some((p) => Math.abs(p.x - cat.x) < 1 && Math.abs(p.z - cat.z) < 1)).toBe(false);
    expect(plan.fireworks.length).toBeGreaterThanOrEqual(8); // the stadium and a roof in most of eight sectors
    for (const f of plan.fireworks) expect(plan.grid.hit(f.x, f.y + 6, f.z, 1), 'clear sky over a launch site').toBeNull();
  });

  it("hangs the cat's tail over the parapet and down the summit's wall, outside it, through the whole swish (owner: the tail clipped through the building)", () => {
    const cat = plan.cat!;
    let below = 0;
    for (const swing of [-CAT_TAIL.swing, 0, CAT_TAIL.swing]) for (const [x, y, z] of catTailCorners(cat, swing)) {
      if (y >= cat.y - 0.6) continue; // above the roof line the chain lies over the parapet, within the cat's own box
      below += 1;
      expect(plan.grid.hit(x, y, z, 0.05), `a tail corner inside the building at ${x.toFixed(1)},${y.toFixed(1)},${z.toFixed(1)} (swing ${swing})`).toBeNull();
    }
    expect(below, 'the tail hangs down the wall').toBeGreaterThan(20);
    expect(Math.min(...catTailCorners(cat, 0).map((c) => c[1])), 'its tip well below the roof').toBeLessThan(cat.y - 6);
  });

  it("stands every searchlight on something and keeps its lamp clear (owner: a searchlight within the cat's body; 'attach these searchlights in a logical way')", () => {
    expect(plan.searchlights.length).toBeGreaterThanOrEqual(4);
    for (const s of plan.searchlights) {
      expect(plan.grid.hit(s.x, s.y + 0.6, s.z, 0.25), `a searchlight's lamp inside something at ${s.x},${s.y},${s.z}`).toBeNull();
      const deck = s.y - 1.6;
      if (s.mount.kind === 'top') expect(plan.grid.hit(s.x, deck - 0.4, s.z, 0.1), 'a deck on the top of a mast that stands').not.toBeNull();
      if (s.mount.kind === 'mast') {
        expect(s.mount.base).toBeLessThan(deck - 3);
        if (s.mount.base > 0) expect(plan.grid.hit(s.x, s.mount.base - 0.3, s.z, 0.2), 'a lattice mast based on a roof').not.toBeNull();
        expect(plan.grid.hit(s.x, (s.mount.base + deck) / 2, s.z, 0.4), 'the mast stands in the open').toBeNull();
      }
      if (s.mount.kind === 'ring') {
        expect(plan.grid.hit(s.mount.cx, deck, s.mount.cz, 0.3), 'a ring about a solid at its height').not.toBeNull();
        const d = Math.hypot(s.x - s.mount.cx, s.z - s.mount.cz);
        expect(d).toBeGreaterThan(s.mount.r0); expect(d).toBeLessThan(s.mount.r1);
      }
    }
  });

  it('straddles the avenue with two gates: towers either side, a bridge building over the roads and the median, the avenue open beneath and above', () => {
    expect(plan.gates.length).toBe(2);
    for (const g of plan.gates) {
      expect(g.top).toBeGreaterThan(60);
      expect(g.deck - g.under).toBeGreaterThanOrEqual(8);
      for (const z of [-19, 0, 19]) { // the roads and the median pass beneath, a bus high and more
        expect(plan.grid.hit(g.x, 8, z, 1), `under the gate at x=${g.x}, z=${z}`).toBeNull();
        expect(plan.grid.hit(g.x, g.under + 2, z, 0.5), 'the bridge building is really there').not.toBeNull();
      }
      expect(plan.grid.hit(g.x, 36, 0, 2.6), 'the flyovers pass over it').toBeNull();
    }
  });

  it('is cyberpunk Hanoi: superblocks and lanes through the lots (T\'s and gates), tube houses, poles and wires, motorbikes on the kerbs', () => {
    const lanes = plan.streets.filter((st) => st.kind === 'lane');
    expect(lanes.length).toBeGreaterThan(40);
    const onAxis = (v: number) => Math.abs((((v - G / 2) % G) + G) % G) < 0.01 || Math.abs(((((v - G / 2) % G) + G) % G) - G) < 0.01; // a street's axis lies at (i + ½)·G
    let tees = 0, gates = 0, long = 0;
    for (const l of lanes) {
      expect(l.width).toBe(LANE_W);
      expect(Math.abs(arterialLat(l.x0 + l.dx * l.len / 2, l.z0 + l.dz * l.len / 2)), 'a lane in the arterial\'s reach').toBeGreaterThan(ARTERIAL_ROW + 6);
      if (l.len > 50) long += 1;
      for (const [t, pad] of [[0, l.ends?.a], [l.len, l.ends?.b]] as [number, number | undefined][]) {
        const v = l.dx ? l.x0 + l.dx * t : l.z0 + l.dz * t; // the end's coordinate along the lane
        if (onAxis(v)) { tees += 1; expect(pad).toBeCloseTo(ROAD / 2 + 2, 5); } // a T: the walkers stop at the street's building line
        else if (pad !== undefined && Math.abs(pad - 0.5) < 1e-6) { // a gate: three inside a lot's edge
          gates += 1;
          const m = ((v % G) + G) % G, frac = Math.min(m, G - m); // from the nearest block centre
          expect(frac).toBeLessThanOrEqual(12 - 2.9 + 0.01);
        } else expect(pad).toBeCloseTo(LANE_W / 2 + 0.5, 5); // a branch's mouth on its lane
      }
      for (let t = 1.5; t < l.len - 1.5; t += 2) expect(plan.grid.hit(l.x0 + l.dx * t, 1.6, l.z0 + l.dz * t, 2.0), 'something in a lane').toBeNull();
    }
    expect(tees).toBeGreaterThan(40); // most lanes reach a street at least at one end
    expect(gates).toBeGreaterThanOrEqual(6); // some end blind, at a gate
    expect(long).toBeGreaterThanOrEqual(12); // the superblocks' lanes and the merged pairs' long ones
    expect(plan.superblocks.length).toBe(6);
    for (const sb of plan.superblocks) { // two lanes cross inside every superblock, one along each axis
      const inside = lanes.filter((l) => l.len > 50 && Math.abs((l.dx ? l.z0 : l.x0) - (l.dx ? sb.z : sb.x)) <= 18.01 && Math.abs((l.dx ? l.x0 + l.len / 2 : l.z0 + l.len / 2) - (l.dx ? sb.x : sb.z)) < 8); // (12–18 off the swallowed street's axis)
      for (const l of inside) expect(Math.abs((l.dx ? l.z0 : l.x0) - (l.dx ? sb.z : sb.x))).toBeGreaterThanOrEqual(11.99); // never on the swallowed street's axis: its mouth would merge into the crossing where that street ends
      expect(inside.some((l) => l.dx !== 0) && inside.some((l) => l.dz !== 0), `superblock at ${sb.x},${sb.z} lacks a lane`).toBe(true);
    }
    const tubes = plan.core.filter((q) => q.kind === 'facade' && q.arch === 'block' && q.h >= 10 && Math.min(q.w, q.d) < 5.6 && Math.min(q.w, q.d) >= 3.2 && Math.max(q.w, q.d) >= 3.8);
    expect(tubes.length).toBeGreaterThan(300); // tube houses: slim, deep, tall
    expect(plan.poles.length).toBeGreaterThan(500);
    for (const p of plan.poles) expect(carriagewayAt(plan.streets, p.x, p.z), 'a pole in the road').toBeNull();
    expect(plan.wires.length / 12).toBeGreaterThan(3000); // the bundles pole to pole and the spans across
    const motos = plan.parked.filter((p) => p.kind === 'moto' && Math.abs(arterialLat(p.x, p.z)) > ARTERIAL_ROW + 1);
    expect(motos.length).toBeGreaterThan(150);
    for (const p of motos) expect(carriagewayAt(plan.streets, p.x, p.z), 'a motorbike in the road').toBeNull();
    const merged4 = plan.streets.filter((st) => st.kind === 'lane' && st.len > 60).length;
    expect(merged4).toBeGreaterThanOrEqual(6);
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
    expect(orbits).toBeGreaterThanOrEqual(2); // (an orbit is a now-and-then thing: two across three seeds is a flight that orbits — the tally moved when the citadel took a block and the boulevard's middle)
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

describe('Plain borders (owner: no river, boulevard or highway outside the border — fill in buildings; the highway infinite both sides)', () => {
  const plan = planCity(SEED);
  it('ends the canal under the rim bridge and builds the avenues past it as blocks', () => {
    expect(CANAL_END).toBe(streetAt(HALF) + STREET / 2);
    const canal = plan.streets.find((s) => s.kind === 'canal')!;
    expect(canal.z0).toBe(-CANAL_END); expect(canal.len).toBe(2 * CANAL_END);
    expect(plan.posts.filter((p) => Math.abs(Math.abs(p.x) - 13) < 0.01 && p.h === 5.5 && Math.abs(p.z) > CANAL_END).length, 'quay posts past the end').toBe(0);
    for (let i = 0; i < plan.lanterns.length; i += 3) if (Math.abs(Math.abs(plan.lanterns[i]) - 12.4) < 0.01) expect(Math.abs(plan.lanterns[i + 2]), 'a quay lantern past the end').toBeLessThanOrEqual(CANAL_END);
    for (const t of plan.core.filter((s) => s.kind === 'tree' && Math.abs(Math.abs(s.z) - 7.5) < 0.01)) expect(Math.abs(t.x), 'an avenue tree past the rim').toBeLessThanOrEqual(streetAt(HALF));
    const avenueLots = (along: 'x' | 'z') => plan.outer.filter((s) => s.kind === 'facade' && s.h >= 6 && (along === 'z' ? Math.abs(s.x) < 12 && Math.abs(s.z) > CANAL_END : Math.abs(s.z) < 12 && Math.abs(s.x) > CANAL_END));
    expect(avenueLots('z').length, 'blocks on the canal column past the rim').toBeGreaterThan(8);
    expect(avenueLots('x').length, 'blocks on the tree avenue past the rim').toBeGreaterThan(8);
    expect(HW_FAR).toBe(1600);
  });
  it('fills the empty corridors of the copies with plain blocks: inside the square, clear of every counted mass, the plaza, the canal column, the boulevard and the citadel among them', () => {
    expect(plan.filler.length).toBeGreaterThan(150);
    const counted = [...plan.core, ...plan.outer].filter((s) => isMass(s) && !LANDMARK_ARCH.has(s.arch) && s.h >= 4 && s.kind !== 'tree' && s.arch !== 'street');
    let overlaps = 0;
    for (const f of plan.filler) {
      expect(f.kind).toBe('facade'); if (Math.abs(f.y - f.h / 2) < 0.01) expect(f.h, 'a base box').toBeGreaterThan(4); // (a set-back upper box is three-tenths of its base)
      expect(Math.max(Math.abs(f.x) + f.w / 2, Math.abs(f.z) + f.d / 2), 'inside the built square').toBeLessThan(TILE_P / 2 + 0.01);
      for (const m of counted) if (Math.min(f.x + f.w / 2, m.x + m.w / 2) - Math.max(f.x - f.w / 2, m.x - m.w / 2) > 1.5 && Math.min(f.z + f.d / 2, m.z + m.d / 2) - Math.max(f.z - f.d / 2, m.z - m.d / 2) > 1.5) overlaps++;
    }
    expect(overlaps, 'a filler box over a counted mass').toBe(0);
    const near = (x: number, z: number, r: number) => plan.filler.some((f) => Math.abs(f.x - x) < r && Math.abs(f.z - z) < r);
    expect(near(0, 0, 14), 'the plaza').toBe(true);
    for (let b = 1; b <= HALF; b++) { expect(near(0, b * G, 14), `the canal column at bz=${b}`).toBe(true); if (b !== 4) expect(near(b * G, 0, 14), `the tree avenue at bx=${b}`).toBe(true); } // (the gates stand over the avenue at ±4: their bridge building is copied)
    expect(near(CITADEL.x, CITADEL.z, 40), 'the citadel block').toBe(true);
    expect(near((CITADEL.x - 24), (CITADEL.z - 24) - 2 * G, 60) || near(-190, -76, 20) || near(-76, -190, 20), 'along the boulevard').toBe(true);
  });
});

describe('The endless city (owner: beyond the boundaries, the illusion of a city spanning infinite, looking like ours)', () => {
  it('tiles the built square about itself: eight tiles in the first ring, twenty-four in two, none over the square, the period its span', () => {
    expect(TILE_P).toBe((2 * (HALF + OUTER) + 1) * G);
    expect(cityTiles(1).length).toBe(8);
    const tiles = cityTiles(2);
    expect(tiles.length).toBe(24);
    for (const t of tiles) {
      expect(Math.max(Math.abs(t.dx), Math.abs(t.dz)), 'a tile never overlaps the built square').toBeGreaterThanOrEqual(TILE_P);
      expect(Math.abs(t.dx) % TILE_P).toBe(0); expect(Math.abs(t.dz) % TILE_P).toBe(0);
      expect(t.q).toBeGreaterThanOrEqual(0); expect(t.q).toBeLessThanOrEqual(3);
      expect(t.ring).toBe(Math.max(Math.abs(t.dx), Math.abs(t.dz)) / TILE_P);
    }
    expect(new Set(cityTiles(1).map((t) => t.q)).size, 'the first ring turns its tiles more than one way').toBeGreaterThanOrEqual(3);
    expect(2 * TILE_P - TILE_P / 2, "ring 2's near edge lies inside the far plane").toBeLessThan(1500);
    const far = cityTiles(7, 3); // the far LOD's rings
    expect(far.length).toBe(200);
    expect(far.every((t) => t.ring >= 3 && t.ring <= 7)).toBe(true);
    expect(Math.max(...far.map((t) => Math.max(Math.abs(t.dx), Math.abs(t.dz)))) + TILE_P / 2, 'the far edge').toBe(5985);
    expect(cityTiles(2, 2).length).toBe(16);
  });
});

describe('The corridor through the tiles (owner: "that spot outside the border — the road looks too ugly")', () => {
  const hx = HIGHWAY.x1 - HIGHWAY.x0, hz = HIGHWAY.z1 - HIGHWAY.z0, L = Math.hypot(hx, hz);
  const at = (t: number, lat: number): [number, number] => [HIGHWAY.x0 + hx / L * t - hz / L * lat, HIGHWAY.z0 + hz / L * t + hx / L * lat];
  const along = (b: { x: number; z: number }) => ((b.x - HIGHWAY.x0) * hx + (b.z - HIGHWAY.z0) * hz) / L;
  it('culls a copy by its footprint: what reaches inside the right of way goes, what stands clear of it stays', () => {
    const [x, z] = at(1200, 0);
    expect(footprintInCorridor(x, z, 10, 10)).toBe(true);
    const [x2, z2] = at(1200, ARTERIAL_ROW + 5);
    expect(footprintInCorridor(x2, z2, 10, 10), 'a ten-wide box five past the row reaches in').toBe(true);
    const [x3, z3] = at(1200, ARTERIAL_ROW + 8);
    expect(footprintInCorridor(x3, z3, 10, 10), 'eight past the row it clears').toBe(false);
    expect(footprintInCorridor(x3, z3, 10, 40), 'a deep one reaches in').toBe(true);
    const [x4, z4] = at(-1500, -(ARTERIAL_ROW + 8));
    expect(footprintInCorridor(x4, z4, 10, 10), 'the other side, the other way').toBe(false);
  });
  it('cuts a copied street crossing the corridor into two pieces whose whole width clears the building line; leaves one clear of it whole', () => {
    for (const [dx, dz, x0, z0] of [[0, 1, 1200, -450], [1, 0, 800, arterialZ(1200) - 10]] as const) {
      const road = { x0, z0, dx, dz, len: 798, y: 0, kind: 'road' as const, width: STREET };
      const pieces = cutAtCorridor(road);
      expect(pieces.length, `a ${dx ? 'x' : 'z'} road`).toBe(2);
      expect(pieces[0].len + pieces[1].len).toBeLessThan(798);
      for (const [p, t] of [[pieces[0], pieces[0].len], [pieces[1], 0]] as const) for (const off of [-STREET / 2, STREET / 2]) {
        const cx = p.x0 + p.dx * t - p.dz * off, cz = p.z0 + p.dz * t + p.dx * off; // the cut end's corners
        expect(Math.abs(arterialLat(cx, cz)), 'a corner of the cut end').toBeGreaterThanOrEqual(ARTERIAL_ROW + 1 - 0.01);
      }
      expect(Math.abs(arterialLat(pieces[0].x0 + pieces[0].dx * pieces[0].len, pieces[0].z0 + pieces[0].dz * pieces[0].len)), 'no farther than it must').toBeLessThan(ARTERIAL_ROW + 1 + STREET / 2 + 0.01);
    }
    const far = { x0: 800, z0: 600, dx: 1, dz: 0, len: 798, y: 0, kind: 'road' as const, width: STREET };
    expect(cutAtCorridor(far)).toEqual([far]);
    const stub = { x0: 1200, z0: arterialZ(1200) - 3, dx: 0, dz: 1, len: 6, y: 0, kind: 'lane' as const, width: LANE_W };
    expect(cutAtCorridor(stub), 'a stub inside the right of way').toEqual([]);
  });
  it('lines the corridor through the tiles with boxes: both sides, both ways, from the square\'s edge to the tiles\', gap-free, inner faces on the building line, clear of what is kept', () => {
    const boxes = corridorFiller([], 2, mulberry32(7));
    expect(boxes.length).toBeGreaterThan(300);
    for (const b of boxes) {
      expect(b.kind).toBe('facade'); expect(b.h).toBeGreaterThanOrEqual(10); expect(b.h).toBeLessThanOrEqual(40);
      expect(b.w).toBeGreaterThanOrEqual(4); expect(b.w).toBeLessThanOrEqual(20); expect(b.d).toBeGreaterThanOrEqual(8); expect(b.d).toBeLessThanOrEqual(14);
      expect(Math.abs(arterialLat(b.x, b.z)) - b.d / 2, 'the inner face on the building line').toBeCloseTo(ARTERIAL_ROW + 0.8, 5);
      expect(Math.abs(b.x)).toBeGreaterThan(TILE_P / 2 - 5); expect(Math.abs(b.x)).toBeLessThan(TILE_P / 2 + 2 * TILE_P + 5);
      expect(b.rotY).toBeCloseTo(Math.atan2(-hz, hx), 6);
    }
    for (const side of [-1, 1]) for (const way of [-1, 1]) {
      const run = boxes.filter((b) => Math.sign(arterialLat(b.x, b.z)) === side && Math.sign(b.x) === way).sort((a, b) => along(a) - along(b));
      expect(run.length, 'a side, a way').toBeGreaterThan(70);
      for (let i = 1; i < run.length; i++) expect(along(run[i]) - run[i].w / 2 - (along(run[i - 1]) + run[i - 1].w / 2), 'a gap').toBeLessThan(0.01);
    }
    expect(corridorFiller([], 1, mulberry32(7)).every((b) => Math.abs(b.x) < TILE_P / 2 + TILE_P + 5), 'one ring: to the first ring\'s edge').toBe(true);
    const [kx, kz] = at(1400, ARTERIAL_ROW + 8);
    const walled = corridorFiller([{ x: kx, z: kz, w: 12, d: 12 }], 2, mulberry32(7));
    for (const b of walled) {
      const ex = b.w / 2 * Math.abs(Math.cos(b.rotY!)) + b.d / 2 * Math.abs(Math.sin(b.rotY!)), ez = b.w / 2 * Math.abs(Math.sin(b.rotY!)) + b.d / 2 * Math.abs(Math.cos(b.rotY!));
      expect(Math.abs(b.x - kx) < ex + 6 - 0.2 && Math.abs(b.z - kz) < ez + 6 - 0.2, 'over the kept mass').toBe(false);
    }
    expect(walled.some((b) => along(b) > 1400 + 20 && along(b) < 1400 + 60 && arterialLat(b.x, b.z) > 0), 'the wall resumes past it').toBe(true);
    expect(walled.length).toBeLessThan(boxes.length + 40); expect(walled.length).toBeGreaterThan(boxes.length - 40);
  });
});
