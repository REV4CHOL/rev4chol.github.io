import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  AutoFlight, BOUND, CAM_R, CollisionGrid, EXT, G, MEDIAN, planCity, ROAD, starPositions, STREET, streetAt, tourRoute,
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

  it('builds a dense main city, a finished outer ring and a sprawl, with a real spread of building kinds', () => {
    expect(plan.core.length).toBeGreaterThan(900);
    expect(plan.outer.length).toBeGreaterThan(400);
    expect(plan.sprawl.length).toBeGreaterThan(1500);
    const kinds = new Set<string>(plan.core.map((s) => s.kind));
    for (const k of ['facade', 'dark', 'cyl', 'pyr', 'spire', 'dome', 'tree']) expect(kinds.has(k), k).toBe(true);
    const archetypes = new Set(plan.core.map((s) => s.arch));
    expect(archetypes.size).toBeGreaterThanOrEqual(10);
    expect(plan.styles.length).toBeGreaterThanOrEqual(18);
    expect(new Set(plan.styles.map((s) => s.win)).size).toBe(6);
  });

  it('dresses the streets: thousands of signs in every shape, lamp posts on every kerb, 44 drivable streets', () => {
    expect(plan.signs.length).toBeGreaterThan(2500);
    const kinds = new Set(plan.signs.map((s) => s.kind));
    for (const k of ['hang', 'wall', 'board', 'tag', 'roof', 'gantry', 'screen']) expect(kinds.has(k as never), k).toBe(true);
    expect(plan.posts.length).toBeGreaterThan(2000);
    expect(plan.streets.length).toBe(44);
    expect(plan.pois.length).toBeGreaterThan(10);
  });

  it('keeps every street clear: nothing solid stands on a road or a pavement', () => {
    // sample the core's street centre lines and kerbs at pedestrian height
    for (let i = -7; i <= 6; i++) {
      const at = streetAt(i);
      for (let t = -EXT; t <= EXT; t += 3) {
        for (const off of [0, ROAD / 2 + 1, -(ROAD / 2 + 1)]) {
          expect(plan.grid.hit(t, 2, at + off, 0.3), `x-street ${at} at t=${t} off=${off}`).toBeNull();
          expect(plan.grid.hit(at + off, 2, t, 0.3), `z-street ${at} at t=${t} off=${off}`).toBeNull();
        }
      }
    }
  });

  it('keeps the avenues open down the middle (trees and lamps aside)', () => {
    for (let t = -EXT; t <= EXT; t += 5) {
      const a = plan.grid.hit(3, 12, t, 1);
      const b = plan.grid.hit(t, 12, 3, 1);
      expect(a, `north-south avenue at z=${t}`).toBeNull();
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

describe('AutoFlight', () => {
  const plan = planCity(SEED);

  it('never enters a building, stays inside the fence, dives but not too low, and does not repeat itself', () => {
    const visited = new Set<string>();
    const firstPaths: string[] = [];
    for (const s of [1, 2, 3]) {
      const flight = new AutoFlight(plan.grid, mulberry32(s), new Vector3(-130, 80, 160), 2.5);
      const pos = new Vector3();
      const look = new Vector3();
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
      }
      expect(flight.dives).toBeGreaterThan(0); // it goes down into the streets, not just rooftops
      expect(lowest).toBeGreaterThan(14); // but never down among the traffic (owner: raise the dives)
      expect(flight.fallbacks).toBe(0); // every leg it flew was validated, none forced
    }
    expect(visited.size).toBeGreaterThan(100);
    expect(new Set(firstPaths).size).toBe(3); // three seeds, three flights
  });

  it('moves at the asked pace and reports its leg and phase', () => {
    const flight = new AutoFlight(plan.grid, mulberry32(9), new Vector3(0, 90, 0), 0);
    const a = new Vector3(); const b = new Vector3(); const l = new Vector3();
    flight.step(0.5, a, l);
    let travelled = 0;
    const leg0 = flight.legId;
    for (let i = 0; i < 400; i++) { flight.step(0.5, b, l); travelled += b.distanceTo(a); a.copy(b); }
    expect(travelled / 400).toBeGreaterThan(0.35);
    expect(travelled / 400).toBeLessThan(0.7);
    expect(flight.legId).toBeGreaterThanOrEqual(leg0);
    expect(['cruise', 'dive', 'canyon', 'climb']).toContain(flight.phase);
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
