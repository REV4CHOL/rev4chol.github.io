/** THE PLAN OF REVACHOL — pure geometry, no DOM, no renderer, so the city
 *  can be reasoned about in tests: every solid the camera must respect, the
 *  story route the city is BUILT AROUND (towers under the flight are capped,
 *  so the tour can never clip — owner decree: buildings are barriers), the
 *  endless randomised auto-flight that validates each new leg against the
 *  solids before flying it, and a star dome with no hole at the zenith. */
import { CatmullRomCurve3, Vector3 } from 'three';
import { mulberry32 } from '../lib/rng';

export const LOT = 13;
export const STREET = 7;
export const G = LOT + STREET; // block pitch: street centres sit at (i + ½)·G
export const HALF = 11; // the core: blocks −11..11
export const EXT = HALF * G;
export const FAR = 47; // the far ring runs to ±47 blocks (~±950) — fog owns the rest
export const BOUND = 500; // the free-flight fence
export const CAM_R = 1.2; // the camera's body
const ROUTE_PAD = 3.2; // clearance the city keeps around the story route
const FLY_PAD = 2.4; // clearance the auto-flight demands of a new leg
const GRID_PAD = 4; // cell registration pad — every query radius stays under it
const LANDMARK_BLOCK = { bx: 1, bz: 1 };

export interface Box { x: number; y: number; z: number; w: number; h: number; d: number }
export type Kind = 'facade' | 'dark' | 'cyl' | 'pyr' | 'spire' | 'dome';
export type Arch =
  | 'tower' | 'slab' | 'cyl' | 'ziggurat' | 'twin' | 'cross' | 'needle' | 'podium'
  | 'oldtown' | 'landmark' | 'far' | 'bits';
export interface Solid extends Box { kind: Kind; tex: number; arch: Arch }
export interface Strip extends Box { color: string }
export interface Sign {
  x: number; y: number; z: number; rotY: number; w: number; h: number; color: string;
  kind: 'wall' | 'roof' | 'screen';
}
export type WinStyle = 'grid' | 'ribbon' | 'strip' | 'tiny' | 'wide' | 'curtain';
export interface FacadeStyle {
  tint: string; win: WinStyle; crown: boolean; density: number; warm: number; dim: number; core: boolean;
}
export interface Plan {
  core: Solid[];
  far: Solid[];
  strips: Strip[];
  leds: Strip[];
  signs: Sign[];
  lamps: number[];
  farLamps: number[];
  neon: { pos: number[]; col: string[] };
  beacons: { x: number; y: number; z: number }[];
  styles: FacadeStyle[];
  farTex: [number, number];
  grid: CollisionGrid;
  landmark: { x: number; z: number; top: number };
}

const WARM = ['#ff9a4d', '#ffb36b', '#ff7a35', '#e8722e', '#ffd9a0'];
const COOL = ['#7de8ff', '#ff5e7a', '#b79cff'];
export const NEON = ['#C8FF00', '#FF2E63', '#B79CFF'];
const pick = <T>(rand: () => number, arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Axis-aligned solids hashed into G-sized cells; every solid registers in
 *  each cell its PAD-expanded footprint touches, so a point query reads one
 *  cell for any radius up to the pad. */
export class CollisionGrid {
  private cells = new Map<number, Box[]>();
  private static key(ix: number, iz: number): number { return (ix + 2048) * 4096 + (iz + 2048); }

  add(b: Box): void {
    const x0 = Math.floor((b.x - b.w / 2 - GRID_PAD) / G), x1 = Math.floor((b.x + b.w / 2 + GRID_PAD) / G);
    const z0 = Math.floor((b.z - b.d / 2 - GRID_PAD) / G), z1 = Math.floor((b.z + b.d / 2 + GRID_PAD) / G);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) {
        const k = CollisionGrid.key(ix, iz);
        const list = this.cells.get(k);
        if (list) list.push(b); else this.cells.set(k, [b]);
      }
    }
  }

  /** The first solid whose r-expanded box contains the point (r ≤ pad). */
  hit(x: number, y: number, z: number, r: number): Box | null {
    const list = this.cells.get(CollisionGrid.key(Math.floor(x / G), Math.floor(z / G)));
    if (!list) return null;
    for (const b of list) {
      if (Math.abs(x - b.x) < b.w / 2 + r && Math.abs(y - b.y) < b.h / 2 + r && Math.abs(z - b.z) < b.d / 2 + r) return b;
    }
    return null;
  }

  /** The tallest top registered around (x, z) — the local skyline. */
  ceilingAt(x: number, z: number): number {
    const list = this.cells.get(CollisionGrid.key(Math.floor(x / G), Math.floor(z / G)));
    let top = 0;
    if (list) for (const b of list) if (b.y + b.h / 2 > top) top = b.y + b.h / 2;
    return top;
  }

  /** Push a body of radius r out of whatever it penetrates, along the axis
   *  of least penetration — walls stop you, roofs hold you, and motion along
   *  the untouched axes survives (the slide). */
  resolve(p: { x: number; y: number; z: number }, r: number): boolean {
    let moved = false;
    for (let i = 0; i < 6; i++) {
      const b = this.hit(p.x, p.y, p.z, r);
      if (!b) break;
      const dx = p.x - b.x, dy = p.y - b.y, dz = p.z - b.z;
      const px = b.w / 2 + r - Math.abs(dx);
      const py = b.h / 2 + r - Math.abs(dy);
      const pz = b.d / 2 + r - Math.abs(dz);
      if (px <= py && px <= pz) p.x += (dx >= 0 ? 1 : -1) * px;
      else if (py <= pz) p.y += (dy >= 0 ? 1 : -1) * py;
      else p.z += (dz >= 0 ? 1 : -1) * pz;
      moved = true;
    }
    return moved;
  }
}

/** TOUR — the story flight. Authored on the street grid: the canyon runs
 *  are collinear control points down street centres (x = −10, then z = −30),
 *  corners pinned by near points so the spline cannot bow into a lot; the
 *  approach and the rooftop climb cross lots, and the plan caps whatever
 *  stands beneath them. */
export function tourRoute(): CatmullRomCurve3 {
  return new CatmullRomCurve3([
    new Vector3(-76, 62, 98), // the vista — the whole skyline
    new Vector3(-52, 44, 70),
    new Vector3(-30, 26, 44), // the approach
    new Vector3(-10, 11, 22), // onto the x = −10 street
    new Vector3(-10, 8, 10), // the canyon, due north
    new Vector3(-10, 9, -22),
    new Vector3(-10, 10, -30), // the corner
    new Vector3(-2, 11, -30), // east along z = −30
    new Vector3(14, 14, -30),
    new Vector3(30, 20, -30),
    new Vector3(44, 44, -8), // skimming the (capped) rooftops
    new Vector3(40, 74, 20),
    new Vector3(24, 118, 44), // the terminus, rising toward the moon
  ]);
}

export function facadeStyles(rand: () => number): FacadeStyle[] {
  const wins: WinStyle[] = ['grid', 'ribbon', 'strip', 'tiny', 'wide', 'curtain'];
  const tints = ['#0a0a16', '#0c0d1d', '#170f15', '#111119', '#0a1220', '#100c1e', '#0d1416', '#14100f'];
  const out: FacadeStyle[] = [];
  for (let i = 0; i < 18; i++) {
    out.push({
      tint: pick(rand, tints),
      win: wins[i % wins.length],
      crown: rand() < 0.28,
      density: 0.55 + rand() * 0.9,
      warm: 0.62 + rand() * 0.34,
      dim: 0.5 + rand() * 0.5,
      core: rand() < 0.35,
    });
  }
  // the far ring: two sparser, dimmer faces — lit enough to read as a living
  // sprawl from the fence, dim enough for the fog to eat
  out.push({ tint: '#0a0a16', win: 'tiny', crown: false, density: 0.55, warm: 0.85, dim: 0.7, core: false });
  out.push({ tint: '#0c0d1d', win: 'grid', crown: false, density: 0.48, warm: 0.8, dim: 0.65, core: false });
  return out;
}

export function planCity(seed: number): Plan {
  const rand = mulberry32(seed);
  const styles = facadeStyles(rand);
  const farTex: [number, number] = [18, 19];
  const routePts = tourRoute().getPoints(1400);
  const grid = new CollisionGrid();
  const core: Solid[] = [];
  const far: Solid[] = [];
  const strips: Strip[] = [];
  const leds: Strip[] = [];
  const signs: Sign[] = [];
  const tall: { x: number; z: number; top: number; w: number; d: number }[] = [];

  const solid = (
    list: Solid[], kind: Kind, arch: Arch, tex: number,
    x: number, y: number, z: number, w: number, h: number, d: number,
  ): Solid => {
    const s: Solid = { kind, arch, tex, x, y, z, w, h, d };
    list.push(s);
    grid.add(s);
    return s;
  };
  const texOf = (pred: (s: FacadeStyle) => boolean): number => {
    const ok: number[] = [];
    for (let i = 0; i < 18; i++) if (pred(styles[i])) ok.push(i);
    return ok.length ? pick(rand, ok) : Math.floor(rand() * 18);
  };
  const anyTex = () => Math.floor(rand() * 18);

  /** The highest top the story route allows over a footprint — and the
   *  opening's foreground stays low-rise, so the vista looks OVER it to the
   *  skyline instead of standing among towers. */
  const vista = routePts[0];
  const allowedTop = (x: number, z: number, w: number, d: number): number => {
    let top = Infinity;
    const hx = w / 2 + ROUTE_PAD, hz = d / 2 + ROUTE_PAD;
    for (const p of routePts) {
      if (Math.abs(p.x - x) < hx && Math.abs(p.z - z) < hz && p.y - ROUTE_PAD < top) top = p.y - ROUTE_PAD;
    }
    const dv = Math.hypot(x - vista.x, z - vista.z);
    if (dv < 80) top = Math.min(top, 28 + dv * 0.28);
    return top;
  };
  /** Scale a building so its planned top (h·factor + extra) clears the route;
   *  returns 0 when nothing worth standing fits. */
  const fitH = (h: number, factor: number, extra: number, allowed: number): number => {
    if (h * factor + extra <= allowed) return h;
    const fit = (allowed - extra) / factor;
    return fit >= 4 ? fit : 0;
  };

  // -- archetypes -----------------------------------------------------------
  const roofBits = (x: number, z: number, w: number, d: number, top: number, capped: boolean) => {
    if (capped) return;
    const bits = 1 + Math.floor(rand() * 2);
    for (let i = 0; i < bits; i++) {
      solid(core, 'dark', 'bits', 0,
        x + (rand() - 0.5) * w * 0.5, top + 0.7, z + (rand() - 0.5) * d * 0.5,
        0.8 + rand() * 1.4, 1.4, 0.8 + rand() * 1.4);
    }
    if (rand() < 0.16) solid(core, 'dark', 'bits', 0, x + (rand() - 0.5) * w * 0.4, top + 2.4, z + (rand() - 0.5) * d * 0.4, 0.22, 4.8, 0.22);
    if (rand() < 0.08) { // a water tower
      solid(core, 'cyl', 'bits', 0, x + (rand() - 0.5) * w * 0.4, top + 1.9, z + (rand() - 0.5) * d * 0.4, 1.6, 2.2, 1.6);
    }
  };
  /** A crown for a tower's top tier: pyramid, spire or dome. */
  const crown = (x: number, z: number, wTop: number, top: number, allowed: number): number => {
    const a = rand();
    if (a < 0.2 && top + wTop * 0.7 <= allowed) {
      solid(core, 'pyr', 'tower', 0, x, top + wTop * 0.35, z, wTop, wTop * 0.7, wTop);
      return top + wTop * 0.7;
    }
    if (a < 0.32 && top + 12 <= allowed) {
      solid(core, 'spire', 'tower', 0, x, top + 6, z, 0.9, 12, 0.9);
      return top + 12;
    }
    if (a < 0.42 && top + wTop * 0.42 <= allowed) {
      solid(core, 'dome', 'tower', 0, x, top + wTop * 0.21, z, wTop * 0.84, wTop * 0.42, wTop * 0.84);
      return top + wTop * 0.42;
    }
    return top;
  };
  const noteTall = (x: number, z: number, top: number, w: number, d: number) => {
    if (top > 40) tall.push({ x, z, top, w, d });
  };

  type Foot = { x: number; z: number; w: number; d: number } | null;
  const tower = (x: number, z: number, w: number, d: number, h0: number, tex: number): Foot => {
    const allowed = allowedTop(x, z, w, d);
    const factor = h0 > 44 ? 1.44 : h0 > 30 ? 1.28 : 1;
    const h = fitH(h0, factor, 0, allowed);
    if (!h) return null;
    const capped = allowed < Infinity;
    solid(core, 'facade', 'tower', tex, x, h / 2, z, w, h, d);
    let top = h, wTop = w;
    if (h > 30) {
      solid(core, 'facade', 'tower', anyTex(), x, h + (h * 0.28) / 2, z, w * 0.66, h * 0.28, d * 0.66);
      top = h * 1.28; wTop = w * 0.66;
      if (h > 44) {
        solid(core, 'facade', 'tower', anyTex(), x, h * 1.28 + (h * 0.16) / 2, z, w * 0.38, h * 0.16, d * 0.38);
        top = h * 1.44; wTop = w * 0.38;
      }
    }
    if (h > 26) top = crown(x, z, Math.min(wTop, d * (wTop / w)), top, allowed);
    else roofBits(x, z, w, d, top, capped);
    noteTall(x, z, top, w, d);
    if (h > 18 && h < 50 && !capped && rand() < 0.14) {
      signs.push({ x, y: top + 1.7, z, rotY: rand() < 0.5 ? 0 : Math.PI / 2, w: Math.min(w, d) * 0.8, h: 2.2, color: pick(rand, NEON), kind: 'roof' });
    }
    return { x, z, w, d };
  };
  // every footprint stays inside its lot — the streets are the flight's
  // guaranteed-clear corridors, so nothing may lean into them
  const inLot = (c: number, size: number) => c + (rand() - 0.5) * Math.max(0, LOT - size);
  const slab = (cx: number, cz: number, h0: number): Foot => {
    const w = 9 + rand() * 3.5, d = 3.2 + rand() * 1.6;
    const x = inLot(cx, w), z = inLot(cz, d);
    const allowed = allowedTop(x, z, w, d);
    const h = fitH(h0, 1, 0, allowed);
    if (!h) return null;
    solid(core, 'facade', 'slab', texOf((s) => s.win === 'ribbon' || s.win === 'curtain'), x, h / 2, z, w, h, d);
    roofBits(x, z, w, d, h, allowed < Infinity);
    noteTall(x, z, h, w, d);
    return { x, z, w, d };
  };
  const cylinder = (cx: number, cz: number, h0: number): Foot => {
    const r = 2.2 + rand() * 2.4;
    const x = inLot(cx, r * 2), z = inLot(cz, r * 2);
    const allowed = allowedTop(x, z, r * 2, r * 2);
    const h = fitH(h0, 1, r * 0.5, allowed);
    if (!h) return null;
    solid(core, 'cyl', 'cyl', texOf((s) => s.win === 'strip' || s.win === 'grid' || s.win === 'wide'), x, h / 2, z, r * 2, h, r * 2);
    let top = h;
    if (rand() < 0.45) { solid(core, 'dome', 'cyl', 0, x, h + r / 2, z, r * 2, r, r * 2); top = h + r; }
    noteTall(x, z, top, r * 2, r * 2);
    return { x, z, w: r * 2, d: r * 2 };
  };
  const ziggurat = (x: number, z: number, w: number, d: number, h0: number): Foot => {
    const allowed = allowedTop(x, z, w, d);
    const h = fitH(h0, 1, 0, allowed);
    if (!h) return null;
    const tex = anyTex();
    const tiers = 3 + (rand() < 0.5 ? 1 : 0);
    const shares = tiers === 3 ? [0.5, 0.3, 0.2] : [0.42, 0.26, 0.19, 0.13];
    let y = 0, sw = w, sd = d;
    for (let t = 0; t < tiers; t++) {
      const th = h * shares[t];
      solid(core, 'facade', 'ziggurat', t ? anyTex() : tex, x, y + th / 2, z, sw, th, sd);
      y += th; sw *= 0.72; sd *= 0.72;
    }
    noteTall(x, z, y, w, d);
    return { x, z, w, d };
  };
  const twin = (x: number, z: number, w: number, d: number, h0: number): Foot => {
    const allowed = allowedTop(x, z, w, d);
    const h = fitH(h0, 1, 0, allowed);
    if (!h) return null;
    const tex = anyTex();
    const tw = w * 0.42, gap = w * 0.58;
    solid(core, 'facade', 'twin', tex, x - gap / 2, h / 2, z, tw, h, d);
    solid(core, 'facade', 'twin', tex, x + gap / 2, h / 2, z, tw, h, d);
    solid(core, 'facade', 'twin', tex, x, h * 0.64, z, gap, 2.2, d * 0.6); // the sky bridge
    roofBits(x - gap / 2, z, tw, d, h, allowed < Infinity);
    noteTall(x, z, h, w, d);
    return { x, z, w, d };
  };
  const cross = (x: number, z: number, w: number, d: number, h0: number): Foot => {
    const allowed = allowedTop(x, z, w, d);
    const h = fitH(h0, 1, 0, allowed);
    if (!h) return null;
    const tex = anyTex();
    solid(core, 'facade', 'cross', tex, x, h / 2, z, w, h, d * 0.5);
    solid(core, 'facade', 'cross', tex, x, h / 2, z, w * 0.5, h, d);
    roofBits(x, z, w * 0.5, d * 0.5, h, allowed < Infinity);
    noteTall(x, z, h, w, d);
    return { x, z, w, d };
  };
  const needle = (x: number, z: number, h0: number): Foot => {
    const w = 2.6 + rand() * 1.1;
    const allowed = allowedTop(x, z, w, w);
    const h = fitH(Math.max(h0, 36), 1, 10, allowed);
    if (!h) return null;
    solid(core, 'facade', 'needle', texOf((s) => s.win === 'strip' || s.win === 'tiny'), x, h / 2, z, w, h, w);
    solid(core, 'spire', 'needle', 0, x, h + 5, z, 0.7, 10, 0.7);
    const color = pick(rand, NEON);
    const sx = rand() < 0.5 ? -1 : 1, sz = rand() < 0.5 ? -1 : 1;
    leds.push({ x: x + sx * w / 2, y: h / 2, z: z + sz * w / 2, w: 0.2, h: h * 0.94, d: 0.2, color });
    leds.push({ x: x - sx * w / 2, y: h / 2, z: z - sz * w / 2, w: 0.2, h: h * 0.94, d: 0.2, color });
    noteTall(x, z, h + 10, w, w);
    return { x, z, w, d: w };
  };
  const podium = (x: number, z: number, w: number, d: number, h0: number): Foot => {
    const allowed = allowedTop(x, z, w, d);
    const h = fitH(h0, 1, 0, allowed);
    if (!h) return null;
    const ph = Math.min(5 + rand() * 4, h * 0.4);
    solid(core, 'facade', 'podium', texOf((s) => s.win === 'curtain' || s.win === 'wide'), x, ph / 2, z, w, ph, d);
    const tex = anyTex();
    solid(core, 'facade', 'podium', tex, x, ph + (h - ph) / 2, z, w * 0.52, h - ph, d * 0.52);
    const top = crown(x, z, Math.min(w, d) * 0.52, h, allowed);
    noteTall(x, z, top, w, d);
    return { x, z, w, d };
  };
  const oldtown = (cx: number, cz: number) => {
    const n = 4 + Math.floor(rand() * 3);
    const tex = texOf((s) => s.win === 'tiny' || s.win === 'grid');
    for (let i = 0; i < n; i++) {
      const w = 2.6 + rand() * 2.6, d = 2.6 + rand() * 2.6;
      const x = cx + (rand() - 0.5) * (LOT - w), z = cz + (rand() - 0.5) * (LOT - d);
      const allowed = allowedTop(x, z, w, d);
      const h = fitH(4 + rand() * 6, 1, 2.4, allowed);
      if (!h) continue;
      solid(core, 'facade', 'oldtown', tex, x, h / 2, z, w, h, d);
      if (rand() < 0.55) solid(core, 'pyr', 'oldtown', 0, x, h + 1.1, z, w, 2.2, d);
    }
  };

  // -- the core -------------------------------------------------------------
  for (let bx = -HALF; bx <= HALF; bx++) {
    for (let bz = -HALF; bz <= HALF; bz++) {
      if (bx === 0 && bz === 0) continue; // the plaza
      if (bx === LANDMARK_BLOCK.bx && bz === LANDMARK_BLOCK.bz) continue; // the landmark's lot
      const cx = bx * G, cz = bz * G;
      // two downtowns: the heart, and a second cluster beyond it from the
      // vista (south-east), so the opening reads in layers — never a wall
      const pull = Math.max(0, 1 - (Math.abs(bx) + Math.abs(bz)) / (HALF * 1.5))
        + 0.75 * Math.exp(-(((bx - 5) ** 2 + (bz + 6) ** 2) / 9));
      if (pull < 0.3 && rand() < 0.32) { oldtown(cx, cz); continue; }
      const n = 2 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++) {
        const w = 4 + rand() * 6;
        const d = 4 + rand() * 6;
        const x = cx + (rand() - 0.5) * (LOT - w);
        const z = cz + (rand() - 0.5) * (LOT - d);
        const h = 6 + rand() * 26 + pull * rand() * 46;
        const a = rand();
        const fp =
          h > 30 && a < 0.07 ? needle(x, z, h)
          : h > 24 && a < 0.15 ? ziggurat(x, z, w, d, h)
          : h > 22 && w > 7.5 && a < 0.21 ? twin(x, z, w, d, h)
          : h > 20 && a < 0.28 ? cross(x, z, w, d, h)
          : a < 0.37 ? slab(cx, cz, h)
          : a < 0.46 ? cylinder(cx, cz, h)
          : a < 0.56 ? podium(x, z, w, d, h)
          : tower(x, z, w, d, h, anyTex());
        // LIVELY STREETS: storefront light spilling onto the pavement
        if (fp && Math.abs(bx) <= 5 && Math.abs(bz) <= 5 && rand() < 0.75) {
          const side = Math.floor(rand() * 4);
          const sx = side < 2 ? fp.x : fp.x + (side === 2 ? fp.w / 2 + 0.08 : -fp.w / 2 - 0.08);
          const sz = side === 0 ? fp.z + fp.d / 2 + 0.08 : side === 1 ? fp.z - fp.d / 2 - 0.08 : fp.z;
          strips.push({
            x: sx, y: 0.85, z: sz, w: side < 2 ? fp.w * 0.82 : 0.14, h: 1.5, d: side < 2 ? 0.14 : fp.d * 0.82,
            color: rand() < 0.72 ? pick(rand, WARM) : pick(rand, [...COOL, '#C8FF00']),
          });
        }
      }
    }
  }

  // -- the landmark: its own reserved lot at the heart (the vista's gaze) -----
  const lmx = LANDMARK_BLOCK.bx * G, lmz = LANDMARK_BLOCK.bz * G;
  solid(core, 'facade', 'landmark', 17, lmx, 30, lmz, 11, 60, 11);
  solid(core, 'facade', 'landmark', 17, lmx, 71, lmz, 7.5, 22, 7.5);
  solid(core, 'facade', 'landmark', 17, lmx, 88, lmz, 4.6, 12, 4.6);
  grid.add({ x: lmx, y: 95.6, z: lmz, w: 5.2, h: 3.2, d: 5.2 }); // the crown (drawn by the renderer)
  grid.add({ x: lmx, y: 104, z: lmz, w: 0.5, h: 14, d: 0.5 }); // the spire
  const landmark = { x: lmx, z: lmz, top: 111 };

  // -- wall signs and the giant screens ---------------------------------------
  for (let i = 0; i < 150; i++) {
    const bx = Math.floor(rand() * 7) - 3;
    const bz = Math.floor(rand() * 7) - 3;
    signs.push({
      x: bx * G + (rand() < 0.5 ? -1 : 1) * (LOT / 2 + 0.4),
      y: 6 + rand() * 26,
      z: bz * G + (rand() - 0.5) * LOT,
      rotY: rand() < 0.5 ? Math.PI / 2 : 0,
      w: 2.2, h: 9, color: pick(rand, NEON), kind: 'wall',
    });
  }
  tall.sort((a, b) => b.top - a.top);
  for (const t of tall.slice(0, 6)) {
    if (rand() < 0.6) {
      const w = Math.min(8, t.w * 0.9);
      signs.push({ x: t.x, y: t.top * 0.42, z: t.z + t.d / 2 + 0.25, rotY: 0, w, h: w * 0.6, color: pick(rand, NEON), kind: 'screen' });
    }
  }
  const beacons = [{ x: lmx, y: landmark.top + 1.6, z: lmz }, ...tall.slice(0, 26).map((t) => ({ x: t.x, y: t.top + 1.8, z: t.z }))];

  // -- street lamps ------------------------------------------------------------
  const lamps: number[] = [];
  for (let i = 0; i < 460; i++) {
    const along = (rand() - 0.5) * 2 * EXT;
    const lane = (Math.floor(rand() * 7) - 3) * G + (LOT / 2 + STREET / 2) * (rand() < 0.5 ? 1 : -1);
    if (rand() < 0.5) lamps.push(along, 0.4, lane); else lamps.push(lane, 0.4, along);
  }

  // -- the far ring: the city goes on past the fence, out into the fog ---------
  const clusters = [0, 1, 2].map(() => {
    const a = rand() * Math.PI * 2, r = 330 + rand() * 420;
    return { x: Math.cos(a) * r, z: Math.sin(a) * r, s: 40 + rand() * 60 };
  });
  for (let bx = -FAR; bx <= FAR; bx++) {
    for (let bz = -FAR; bz <= FAR; bz++) {
      if (Math.max(Math.abs(bx), Math.abs(bz)) <= HALF) continue;
      if (rand() < 0.28) continue;
      const cx = bx * G, cz = bz * G;
      let boost = 0;
      for (const c of clusters) boost += Math.exp(-((cx - c.x) ** 2 + (cz - c.z) ** 2) / (2 * c.s * c.s));
      const n = 1 + (rand() < 0.5 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const w = 4 + rand() * 8, d = 4 + rand() * 8;
        const h = 4 + rand() * 14 + boost * (20 + rand() * 45) + (rand() < 0.03 ? 20 + rand() * 40 : 0);
        solid(far, 'facade', 'far', rand() < 0.5 ? farTex[0] : farTex[1],
          cx + (rand() - 0.5) * (LOT - w), h / 2, cz + (rand() - 0.5) * (LOT - d), w, h, d);
      }
    }
  }
  const farLamps: number[] = [];
  for (let i = 0; i < 2400; i++) {
    const along = (rand() - 0.5) * 2 * FAR * G;
    const lane = (Math.floor(rand() * 2 * FAR) - FAR) * G + (LOT / 2 + STREET / 2) * (rand() < 0.5 ? 1 : -1);
    if (rand() < 0.5) farLamps.push(along, 0.4, lane); else farLamps.push(lane, 0.4, along);
  }
  const neon = { pos: [] as number[], col: [] as string[] };
  for (let i = 0; i < 700; i++) {
    const s = pick(rand, far);
    const side = Math.floor(rand() * 4);
    neon.pos.push(
      s.x + (side === 0 ? s.w / 2 + 0.2 : side === 1 ? -s.w / 2 - 0.2 : (rand() - 0.5) * s.w * 0.8),
      s.h * (0.25 + rand() * 0.65),
      s.z + (side === 2 ? s.d / 2 + 0.2 : side === 3 ? -s.d / 2 - 0.2 : (rand() - 0.5) * s.d * 0.8),
    );
    neon.col.push(rand() < 0.55 ? pick(rand, NEON) : pick(rand, WARM));
  }

  return { core, far, strips, leds, signs, lamps, farLamps, neon, beacons, styles, farTex, grid, landmark };
}

/** AUTO — an endless, never-repeating drift. A cubic Hermite chain grows
 *  ahead of the camera one knot at a time; every knot carries its own
 *  tangent, so a leg is FINAL the moment its far knot is proposed and can be
 *  sampled against the solids (and the fence) right then — rejected knots are
 *  re-proposed, never flown. (A Catmull-Rom chain can't do this: a leg's
 *  shape keeps changing until the knot after its end exists, so validation
 *  lands one step too late to fix the real culprit.) The flight alternates
 *  rooftop cruises with dives that arrive aligned to a real street, canyon
 *  runs down its centre, and climbs back out. */
type Phase = 'cruise' | 'dive' | 'canyon' | 'climb';
interface FlightState { phase: Phase; left: number; heading: number; axis: 'x' | 'z'; dir: 1 | -1; street: number }
interface Knot { p: Vector3; t: Vector3 }
interface Proposal { p: Vector3; dir: Vector3; dive: boolean }

export class AutoFlight {
  readonly knots: Knot[] = [];
  dives = 0;
  fallbacks = 0;
  private seg = 0;
  private u = 0;
  private segLen = 1;
  private st: FlightState;
  private readonly tmp = new Vector3();

  constructor(private grid: CollisionGrid, private rand: () => number, start: Vector3, heading: number) {
    this.st = { phase: 'cruise', left: 1 + Math.floor(rand() * 3), heading, axis: 'x', dir: 1, street: G / 2 };
    this.knots.push({ p: start.clone(), t: new Vector3(Math.sin(heading), 0, Math.cos(heading)).multiplyScalar(30) });
    this.ensure();
    this.measure();
  }

  /** Advance `dist` world units; writes the camera position and its look point. */
  step(dist: number, pos: Vector3, look: Vector3): void {
    this.u += dist / this.segLen;
    while (this.u >= 1) {
      this.u -= 1;
      this.seg += 1;
      this.trim();
      this.ensure();
      this.measure();
    }
    this.point(this.seg, this.u, pos);
    let li = this.seg, lu = this.u + 0.4;
    if (lu > 1) { li += 1; lu -= 1; }
    this.point(li, lu, look);
  }

  /** Hermite leg i at local u. */
  private point(i: number, u: number, out: Vector3): Vector3 {
    const a = this.knots[i], b = this.knots[i + 1];
    const u2 = u * u, u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
    return out.set(
      h00 * a.p.x + h10 * a.t.x + h01 * b.p.x + h11 * b.t.x,
      h00 * a.p.y + h10 * a.t.y + h01 * b.p.y + h11 * b.t.y,
      h00 * a.p.z + h10 * a.t.z + h01 * b.p.z + h11 * b.t.z,
    );
  }

  private trim(): void {
    while (this.seg > 1) { this.knots.shift(); this.seg -= 1; }
  }

  /** Legs `seg` and `seg + 1` (the look-ahead) must both exist. */
  private ensure(): void {
    while (this.knots.length < this.seg + 3) this.append();
  }

  private measure(): void {
    this.segLen = Math.max(1, this.legLength(this.seg, 16));
  }

  private legLength(i: number, n: number): number {
    let len = 0;
    let prev = this.point(i, 0, new Vector3());
    for (let k = 1; k <= n; k++) {
      const p = this.point(i, k / n, new Vector3());
      len += p.distanceTo(prev);
      prev = p;
    }
    return len;
  }

  /** Propose knots until one gives a clear leg; past 40 tries the flight
   *  abandons its phase and climbs for open sky, and as a last resort keeps
   *  its heading and rises over the local skyline (validated too; the
   *  renderer's collision solve guards whatever slips). */
  private append(): void {
    const last = this.knots[this.knots.length - 1];
    for (let tries = 0; tries < 64; tries++) {
      const snap = { ...this.st };
      if (tries >= 40) {
        // abandon the phase: low in a street, climb out along it; otherwise cruise high
        const low = this.st.phase === 'canyon' || this.st.phase === 'dive';
        this.st.phase = low ? 'climb' : 'cruise'; this.st.left = 2;
      }
      const c = this.propose(last.p, tries >= 40 ? 40 + this.rand() * 60 : undefined);
      if (this.push(last, c)) { if (c.dive) this.dives += 1; return; }
      this.st = snap;
      if (this.rand() < 0.5) this.st.heading += (this.rand() - 0.5) * 2.4;
    }
    // last resort: home is the way out — toward the plaza, over the skyline
    this.fallbacks += 1;
    const home = new Vector3(-last.p.x, 0, -last.p.z);
    if (home.lengthSq() < 1) home.set(0, 0, 1);
    home.normalize();
    const p = last.p.clone().addScaledVector(home, 40);
    p.y = clamp(Math.max(last.p.y, this.ceilingAlong(last.p, p)) + 24, 30, 210);
    if (!this.push(last, { p, dir: new Vector3(home.x, 0.6, home.z), dive: false })) {
      this.knots.push({ p, t: home.clone().multiplyScalar(20) }); // accepted regardless
    }
    this.st.phase = 'cruise'; this.st.left = 2; this.st.heading = Math.atan2(home.x, home.z);
  }

  private push(last: Knot, c: Proposal): boolean {
    const chord = c.p.distanceTo(last.p);
    this.knots.push({ p: c.p, t: c.dir.normalize().multiplyScalar(chord * 0.55) });
    if (this.legClear(this.knots.length - 2)) return true;
    this.knots.pop();
    return false;
  }

  /** The skyline under a chord: the tallest top sampled along it. */
  private ceilingAlong(a: Vector3, b: Vector3): number {
    let top = 0;
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      top = Math.max(top, this.grid.ceilingAt(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t));
    }
    return top;
  }

  private legClear(i: number): boolean {
    const samples = Math.min(220, Math.ceil(this.legLength(i, 8) / 1.2) + 4);
    for (let k = 0; k <= samples; k++) {
      const p = this.point(i, k / samples, this.tmp);
      if (Math.abs(p.x) > BOUND - 20 || Math.abs(p.z) > BOUND - 20 || p.y < 3 || p.y > 230) return false;
      if (this.grid.hit(p.x, p.y, p.z, FLY_PAD)) return false;
    }
    return true;
  }

  private propose(last: Vector3, forceY?: number): Proposal {
    const s = this.st;
    const r = this.rand;
    const streetDir = () => (s.axis === 'x' ? new Vector3(s.dir, 0, 0) : new Vector3(0, 0, s.dir));
    if (s.phase === 'cruise') {
      s.heading += (r() - 0.5) * 1.3;
      if (Math.abs(last.x) > EXT + 30 || Math.abs(last.z) > EXT + 30) s.heading = Math.atan2(-last.x, -last.z) + (r() - 0.5) * 0.8;
      const dist = 55 + r() * 65;
      const dir = new Vector3(Math.sin(s.heading), 0, Math.cos(s.heading));
      const p = new Vector3(last.x + dir.x * dist, 0, last.z + dir.z * dist);
      // ride the skyline: sometimes skimming the roofs, sometimes well above
      const ceil = this.ceilingAlong(last, p);
      p.y = clamp(Math.max(ceil + 9 + (forceY ?? r() * 34), last.y + (r() - 0.5) * 50), 30, 210);
      if (--s.left <= 0) s.phase = 'dive';
      return { p, dir, dive: false };
    }
    if (s.phase === 'dive') {
      const alongX = Math.abs(Math.sin(s.heading)) > Math.abs(Math.cos(s.heading));
      s.axis = alongX ? 'x' : 'z';
      s.dir = (alongX ? Math.sin(s.heading) : Math.cos(s.heading)) >= 0 ? 1 : -1;
      const perp = alongX ? last.z : last.x;
      s.street = clamp(Math.round((perp - G / 2) / G) * G + G / 2, -EXT + G / 2, EXT - G / 2);
      const along = (alongX ? last.x : last.z) + s.dir * (60 + r() * 30);
      const p = alongX ? new Vector3(along, 0, s.street) : new Vector3(s.street, 0, along);
      const ceil = this.ceilingAlong(last, p);
      // the streets are only dived inside the core, and only where the
      // skyline is low enough to drop through — otherwise cruise on and try elsewhere
      if (ceil > 54 || Math.abs(along) > EXT - 10 || Math.abs(perp) > EXT) {
        s.phase = 'cruise'; s.left = 1;
        return this.propose(last, forceY);
      }
      p.y = Math.max(34 + r() * 12, ceil + 7);
      s.phase = 'canyon'; s.left = 2 + Math.floor(r() * 3);
      const dir = streetDir(); dir.y = -0.45; // nosing down, already aligned with the street
      return { p, dir, dive: true };
    }
    if (s.phase === 'canyon') {
      const along = (s.axis === 'x' ? last.x : last.z) + s.dir * (45 + r() * 25);
      if (Math.abs(along) > EXT - 10) { s.phase = 'climb'; return this.propose(last, forceY); } // the core ends: climb out
      const y = 8 + r() * 8;
      const lat = s.street + (r() - 0.5) * 1.4;
      if (--s.left <= 0) s.phase = 'climb';
      return { p: s.axis === 'x' ? new Vector3(along, y, lat) : new Vector3(lat, y, along), dir: streetDir(), dive: false };
    }
    // climb: out of the canyon, back to the rooftops, still heading along the street
    const along = (s.axis === 'x' ? last.x : last.z) + s.dir * (60 + r() * 30);
    const y = forceY ?? 60 + r() * 50;
    s.phase = 'cruise'; s.left = 2 + Math.floor(r() * 4);
    s.heading = s.axis === 'x' ? (s.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (s.dir > 0 ? 0 : Math.PI);
    const dir = streetDir(); dir.y = 0.35;
    return { p: s.axis === 'x' ? new Vector3(along, y, s.street) : new Vector3(s.street, y, along), dir, dive: false };
  }
}

/** Stars uniform over the dome (cos-elevation uniform), down to just below
 *  the horizon so the band never thins — and straight through the zenith. */
export function starPositions(rand: () => number, n: number, rMin: number, rMax: number, yMin = -0.08): Float32Array {
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const y = yMin + rand() * (1 - yMin);
    const a = rand() * Math.PI * 2;
    const rr = Math.sqrt(Math.max(0, 1 - y * y));
    const r = rMin + rand() * (rMax - rMin);
    out[i * 3] = Math.cos(a) * rr * r;
    out[i * 3 + 1] = y * r;
    out[i * 3 + 2] = Math.sin(a) * rr * r;
  }
  return out;
}

/** The galactic band's great circle: tilted so it arcs over the skyline. */
const BAND_N = new Vector3(0.62, 0.5, 0.6).normalize();
const BAND_U = new Vector3(0, 1, 0).cross(BAND_N).normalize();
const BAND_V = BAND_N.clone().cross(BAND_U).normalize();
export function bandPoint(theta: number, r: number, off = 0): Vector3 {
  return new Vector3().copy(BAND_U).multiplyScalar(Math.cos(theta))
    .addScaledVector(BAND_V, Math.sin(theta)).addScaledVector(BAND_N, off).normalize().multiplyScalar(r);
}

/** The galactic band: stars scattered about the great circle with a gaussian
 *  spread, kept above the horizon. */
export function bandPositions(rand: () => number, n: number, r: number, spread: number): Float32Array {
  const out = new Float32Array(n * 3);
  let i = 0;
  while (i < n) {
    const p = bandPoint(rand() * Math.PI * 2, r, (rand() + rand() + rand() - 1.5) * spread);
    if (p.y < -0.05 * r) continue;
    out[i * 3] = p.x; out[i * 3 + 1] = p.y; out[i * 3 + 2] = p.z;
    i += 1;
  }
  return out;
}
