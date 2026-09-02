/** THE PLAN OF REVACHOL — pure geometry, no DOM, no renderer, so the city
 *  can be reasoned about in tests: every solid the camera must respect, the
 *  story route the city is BUILT AROUND (towers under the flight are capped,
 *  so the tour can never clip — owner decree: buildings are barriers), the
 *  endless randomised auto-flight that validates each new leg against the
 *  solids before flying it, the street furniture and signage that make the
 *  streets real and the city alive, and a star dome with no hole in it.
 *
 *  Scale (owner: "spacious, wider streets"): 24-unit lots, 14-unit streets
 *  (10 of road, 2 of sidewalk either side), two 52-unit tree-lined avenues
 *  crossing at a central plaza. The MAIN CITY is ±7 blocks and fenced; a
 *  3-block OUTER ring past the fence is built with the same archetypes so
 *  nothing near the edge reads as an unfinished box; the SPRAWL beyond that
 *  is simple massing the fog already owns. */
import { CatmullRomCurve3, Vector3 } from 'three';
import { mulberry32 } from '../lib/rng';

export const LOT = 24;
export const STREET = 14;
export const ROAD = 10; // asphalt inside the street band; 2-unit sidewalks either side
export const G = LOT + STREET; // block pitch: street centres sit at (i + ½)·G
export const HALF = 7; // the main city: blocks −7..7
export const EXT = HALF * G;
export const OUTER = 3; // the finished ring outside the fence
export const FAR = HALF + OUTER + 15; // the sprawl runs to ±25 blocks (~±960) — fog owns the rest
export const BOUND = EXT + STREET; // the free-flight fence hugs the main city
export const MEDIAN = LOT / 2; // the avenues' open middle: ±12 about the axis
export const CAM_R = 1.2; // the camera's body
const ROUTE_PAD = 3.4; // clearance the city keeps around the story route
const FLY_PAD = 2.6; // clearance the auto-flight demands of a new leg
const GRID_PAD = 4; // cell registration pad — every query radius stays under it
const LANDMARK_BLOCK = { bx: 1, bz: 1 };
export const streetAt = (i: number): number => (i + 0.5) * G;

export interface Box { x: number; y: number; z: number; w: number; h: number; d: number }
export type Kind = 'facade' | 'dark' | 'cyl' | 'pyr' | 'spire' | 'dome' | 'tree';
export type Arch =
  | 'tower' | 'slab' | 'cyl' | 'ziggurat' | 'twin' | 'cross' | 'needle' | 'podium'
  | 'oldtown' | 'landmark' | 'sprawl' | 'bits' | 'street';
export interface Solid extends Box { kind: Kind; tex: number; arch: Arch }
export interface Strip extends Box { color: string }
export type SignKind = 'hang' | 'wall' | 'board' | 'tag' | 'roof' | 'gantry' | 'screen';
export interface Sign {
  x: number; y: number; z: number; rotY: number; w: number; h: number; color: string; kind: SignKind;
}
export interface Street { axis: 'x' | 'z'; at: number; from: number; to: number }
export interface Poi { x: number; y: number; z: number; w: number }
export type WinStyle = 'grid' | 'ribbon' | 'strip' | 'tiny' | 'wide' | 'curtain';
export interface FacadeStyle {
  tint: string; win: WinStyle; crown: boolean; density: number; warm: number; dim: number; core: boolean;
}
export interface Plan {
  core: Solid[];
  outer: Solid[];
  sprawl: Solid[];
  strips: Strip[];
  leds: Strip[];
  signs: Sign[];
  posts: { x: number; z: number; h: number }[];
  sprawlLamps: number[];
  neon: { pos: number[]; col: string[] };
  beacons: { x: number; y: number; z: number }[];
  pois: Poi[];
  streets: Street[];
  styles: FacadeStyle[];
  sprawlTex: [number, number];
  grid: CollisionGrid;
  landmark: { x: number; z: number; top: number };
}

const WARM = ['#ff9a4d', '#ffb36b', '#ff7a35', '#e8722e', '#ffd9a0'];
const COOL = ['#7de8ff', '#ff5e7a', '#b79cff'];
export const NEON = ['#C8FF00', '#FF2E63', '#B79CFF'];
/** The reference's signage: red, yellow, cyan and white carry the street,
 *  the house neon keeps its voice among them. */
const SIGN_COLORS: [string, number][] = [
  ['#ff3b3b', 14], ['#ffd23f', 14], ['#5df2ff', 13], ['#f4f1e8', 12], ['#ff4fd8', 8], ['#4fa3ff', 8],
  ['#ff9a4d', 7], ['#C8FF00', 7], ['#3dff8f', 6], ['#FF2E63', 6], ['#B79CFF', 5],
];
const SIGN_TOTAL = SIGN_COLORS.reduce((s, [, w]) => s + w, 0);
export function signColor(rand: () => number): string {
  let r = rand() * SIGN_TOTAL;
  for (const [c, w] of SIGN_COLORS) { r -= w; if (r <= 0) return c; }
  return SIGN_COLORS[0][0];
}
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

/** TOUR — the story flight, in block units. The vista pulls out over the
 *  south-west; the approach drops onto the north–south avenue's median and
 *  runs it to the plaza; the corner turns east down the other avenue past
 *  the landmark; the climb rises over the eastern rooftops toward the moon.
 *  Canyon runs are collinear control points down the median (x = 0, then
 *  z = 0) with the corner pinned, so the spline cannot bow into a lot; the
 *  approach and the climb cross lots and the plan caps whatever stands
 *  beneath them. */
export function tourRoute(): CatmullRomCurve3 {
  const P = (bx: number, y: number, bz: number) => new Vector3(bx * G, y, bz * G);
  return new CatmullRomCurve3([
    P(-3.4, 78, 4.4), // the vista — the whole skyline
    P(-2.5, 54, 3.3),
    P(-1.5, 36, 2.3), // the approach
    P(-0.6, 26, 1.6),
    P(0, 22, 1.1), // onto the avenue median, due north
    P(0, 22, 0.35),
    P(0, 23, 0), // the plaza corner
    P(0.35, 24, 0), // east down the other avenue
    P(1.1, 25, 0),
    P(1.9, 28, 0), // the landmark passes on the left
    P(2.7, 40, 0.3),
    P(3.1, 66, 1.0), // over the eastern rooftops (capped underneath)
    P(3.0, 100, 1.9),
    P(2.5, 132, 2.8), // the terminus, rising toward the moon
  ]);
}

export function facadeStyles(rand: () => number): FacadeStyle[] {
  const wins: WinStyle[] = ['grid', 'ribbon', 'strip', 'tiny', 'wide', 'curtain'];
  // the reference's night is BLUE: deep indigo-navy masses, not black
  const tints = ['#0c1530', '#0a1226', '#101a3a', '#0d1020', '#141c3c', '#0b1424', '#160f22', '#101426'];
  const out: FacadeStyle[] = [];
  for (let i = 0; i < 18; i++) {
    out.push({
      tint: pick(rand, tints),
      win: wins[i % wins.length],
      crown: rand() < 0.28,
      density: 0.7 + rand() * 0.7,
      warm: 0.42 + rand() * 0.3,
      dim: 0.65 + rand() * 0.35,
      core: rand() < 0.35,
    });
  }
  // the sprawl: dense small lights the fog can eat into a twinkle
  out.push({ tint: '#0b1226', win: 'tiny', crown: false, density: 0.7, warm: 0.6, dim: 0.75, core: false });
  out.push({ tint: '#0d1020', win: 'grid', crown: false, density: 0.6, warm: 0.55, dim: 0.7, core: false });
  // the landmark: the brightest face in town, blue-lit to the crown
  out.push({ tint: '#101c40', win: 'grid', crown: true, density: 1.7, warm: 0.22, dim: 1, core: false });
  return out;
}
export const LANDMARK_TEX = 20;

export function planCity(seed: number): Plan {
  const rand = mulberry32(seed);
  const styles = facadeStyles(rand);
  const sprawlTex: [number, number] = [18, 19];
  const routePts = tourRoute().getPoints(1400);
  const grid = new CollisionGrid();
  const core: Solid[] = [];
  const outer: Solid[] = [];
  const sprawl: Solid[] = [];
  const strips: Strip[] = [];
  const leds: Strip[] = [];
  const signs: Sign[] = [];
  const posts: { x: number; z: number; h: number }[] = [];
  const tall: { x: number; z: number; top: number; w: number; d: number }[] = [];
  let bucket: Solid[] = core; // which ring the archetypes write into
  let rich = true; // signage density: the main city is lavish, the outer ring modest

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
    if (dv < 130) top = Math.min(top, 24 + dv * 0.26);
    return top;
  };
  /** Scale a building so its planned top (h·factor + extra) clears the route;
   *  returns 0 when nothing worth standing fits. */
  const fitH = (h: number, factor: number, extra: number, allowed: number): number => {
    if (h * factor + extra <= allowed) return h;
    const fit = (allowed - extra) / factor;
    return fit >= 4 ? fit : 0;
  };

  // -- signage: what makes a facade a street ------------------------------
  type Foot = { x: number; z: number; w: number; d: number } | null;
  /** A face of a footprint: its centre `out` units beyond the wall and the
   *  yaw of a plane lying parallel to it. */
  const face = (fp: NonNullable<Foot>, side: number, out: number) =>
    side === 0 ? { x: fp.x, z: fp.z + fp.d / 2 + out, rot: 0 }
    : side === 1 ? { x: fp.x, z: fp.z - fp.d / 2 - out, rot: Math.PI }
    : side === 2 ? { x: fp.x + fp.w / 2 + out, z: fp.z, rot: Math.PI / 2 }
    : { x: fp.x - fp.w / 2 - out, z: fp.z, rot: -Math.PI / 2 };
  const along = (fp: NonNullable<Foot>, side: number, len: number) => (rand() - 0.5) * Math.max(0, (side < 2 ? fp.w : fp.d) - len);
  const put = (fp: NonNullable<Foot>, side: number, out: number, y: number, w: number, h: number, kind: SignKind, perpendicular = false, slide = 0) => {
    const f = face(fp, side, out);
    signs.push({
      x: f.x + (side < 2 ? slide : 0), y, z: f.z + (side >= 2 ? slide : 0),
      rotY: f.rot + (perpendicular ? Math.PI / 2 : 0), w, h, color: signColor(rand), kind,
    });
  };
  /** Dress a building: a lit storefront board, hanging signs sticking out
   *  over the pavement, a flat wall sign, small tags, a roof billboard. */
  const dress = (fp: NonNullable<Foot>, h: number, top: number, capped: boolean) => {
    if (rand() < (rich ? 0.85 : 0.5)) {
      const s = Math.floor(rand() * 4);
      const len = (s < 2 ? fp.w : fp.d) * (0.5 + rand() * 0.3);
      put(fp, s, 0.16, 3.4 + rand() * 0.8, len, 1.1 + rand() * 0.4, 'board', false, along(fp, s, len));
    }
    const hangs = rich ? 1 + Math.floor(rand() * 3) : Math.floor(rand() * 2);
    for (let i = 0; i < hangs; i++) {
      const s = Math.floor(rand() * 4);
      const big = rand() < 0.6;
      const sw = big ? 2 : 1.5, sh = big ? 8 : 5;
      if (h < sh + 6) continue;
      const y = 5 + sh / 2 + rand() * Math.min(h - sh - 4, 26);
      put(fp, s, sw / 2 + 0.3, y, sw, sh, 'hang', true, along(fp, s, 1));
    }
    if (h > 14 && rand() < (rich ? 0.35 : 0.15)) {
      const s = Math.floor(rand() * 4);
      put(fp, s, 0.16, 8 + rand() * Math.min(h - 14, 30) + 4.5, 2.2, 9, 'wall', false, along(fp, s, 2.2));
    }
    const tags = rich ? Math.floor(rand() * 3) : Math.floor(rand() * 2);
    for (let i = 0; i < tags; i++) {
      const s = Math.floor(rand() * 4);
      put(fp, s, 0.16, 1.6 + rand() * 4.4, 2.4, 1.2, 'tag', false, along(fp, s, 2.4));
    }
    if (!capped && top > 16 && top < 72 && rand() < 0.16) {
      signs.push({ x: fp.x, y: top + 1.7, z: fp.z, rotY: rand() < 0.5 ? 0 : Math.PI / 2, w: Math.min(fp.w, fp.d) * 0.8, h: 2.2, color: signColor(rand), kind: 'roof' });
    }
  };

  // -- archetypes -----------------------------------------------------------
  const roofBits = (x: number, z: number, w: number, d: number, top: number, capped: boolean) => {
    if (capped) return;
    const bits = 1 + Math.floor(rand() * 2);
    for (let i = 0; i < bits; i++) {
      solid(bucket, 'dark', 'bits', 0,
        x + (rand() - 0.5) * w * 0.5, top + 0.7, z + (rand() - 0.5) * d * 0.5,
        0.8 + rand() * 1.4, 1.4, 0.8 + rand() * 1.4);
    }
    if (rand() < 0.16) solid(bucket, 'dark', 'bits', 0, x + (rand() - 0.5) * w * 0.4, top + 2.4, z + (rand() - 0.5) * d * 0.4, 0.22, 4.8, 0.22);
    if (rand() < 0.08) solid(bucket, 'cyl', 'bits', 0, x + (rand() - 0.5) * w * 0.4, top + 1.9, z + (rand() - 0.5) * d * 0.4, 1.6, 2.2, 1.6);
  };
  /** A crown for a tower's top tier: pyramid, spire or dome. */
  const crown = (x: number, z: number, wTop: number, top: number, allowed: number): number => {
    const a = rand();
    if (a < 0.2 && top + wTop * 0.7 <= allowed) {
      solid(bucket, 'pyr', 'tower', 0, x, top + wTop * 0.35, z, wTop, wTop * 0.7, wTop);
      return top + wTop * 0.7;
    }
    if (a < 0.32 && top + 12 <= allowed) {
      solid(bucket, 'spire', 'tower', 0, x, top + 6, z, 0.9, 12, 0.9);
      return top + 12;
    }
    if (a < 0.42 && top + wTop * 0.42 <= allowed) {
      solid(bucket, 'dome', 'tower', 0, x, top + wTop * 0.21, z, wTop * 0.84, wTop * 0.42, wTop * 0.84);
      return top + wTop * 0.42;
    }
    return top;
  };
  const noteTall = (x: number, z: number, top: number, w: number, d: number) => {
    if (top > 40 && bucket === core) tall.push({ x, z, top, w, d });
  };
  // every footprint stays inside its lot — the streets are the flight's
  // guaranteed-clear corridors, so nothing may lean into them
  const inLot = (c: number, size: number) => c + (rand() - 0.5) * Math.max(0, LOT - size);

  const tower = (x: number, z: number, w: number, d: number, h0: number, tex: number): Foot => {
    const allowed = allowedTop(x, z, w, d);
    const factor = h0 > 44 ? 1.44 : h0 > 30 ? 1.28 : 1;
    const h = fitH(h0, factor, 0, allowed);
    if (!h) return null;
    const capped = allowed < Infinity;
    solid(bucket, 'facade', 'tower', tex, x, h / 2, z, w, h, d);
    let top = h, wTop = w;
    if (h > 30) {
      solid(bucket, 'facade', 'tower', anyTex(), x, h + (h * 0.28) / 2, z, w * 0.66, h * 0.28, d * 0.66);
      top = h * 1.28; wTop = w * 0.66;
      if (h > 44) {
        solid(bucket, 'facade', 'tower', anyTex(), x, h * 1.28 + (h * 0.16) / 2, z, w * 0.38, h * 0.16, d * 0.38);
        top = h * 1.44; wTop = w * 0.38;
      }
    }
    if (h > 26) top = crown(x, z, Math.min(wTop, d * (wTop / w)), top, allowed);
    else roofBits(x, z, w, d, top, capped);
    noteTall(x, z, top, w, d);
    const fp = { x, z, w, d };
    dress(fp, h, top, capped);
    return fp;
  };
  const slab = (cx: number, cz: number, h0: number): Foot => {
    const w = 12 + rand() * 8, d = 4 + rand() * 2.5;
    const x = inLot(cx, w), z = inLot(cz, d);
    const allowed = allowedTop(x, z, w, d);
    const h = fitH(h0, 1, 0, allowed);
    if (!h) return null;
    solid(bucket, 'facade', 'slab', texOf((s) => s.win === 'ribbon' || s.win === 'curtain'), x, h / 2, z, w, h, d);
    roofBits(x, z, w, d, h, allowed < Infinity);
    noteTall(x, z, h, w, d);
    const fp = { x, z, w, d };
    dress(fp, h, h, allowed < Infinity);
    return fp;
  };
  const cylinder = (cx: number, cz: number, h0: number): Foot => {
    const r = 3 + rand() * 3.5;
    const x = inLot(cx, r * 2), z = inLot(cz, r * 2);
    const allowed = allowedTop(x, z, r * 2, r * 2);
    const h = fitH(h0, 1, r, allowed); // the dome is r tall — reserve all of it
    if (!h) return null;
    solid(bucket, 'cyl', 'cyl', texOf((s) => s.win === 'strip' || s.win === 'grid' || s.win === 'wide'), x, h / 2, z, r * 2, h, r * 2);
    let top = h;
    if (rand() < 0.45) { solid(bucket, 'dome', 'cyl', 0, x, h + r / 2, z, r * 2, r, r * 2); top = h + r; }
    noteTall(x, z, top, r * 2, r * 2);
    const fp = { x, z, w: r * 2, d: r * 2 };
    dress(fp, h, top, allowed < Infinity);
    return fp;
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
      solid(bucket, 'facade', 'ziggurat', t ? anyTex() : tex, x, y + th / 2, z, sw, th, sd);
      y += th; sw *= 0.72; sd *= 0.72;
    }
    noteTall(x, z, y, w, d);
    const fp = { x, z, w, d };
    dress(fp, h * shares[0], y, allowed < Infinity);
    return fp;
  };
  const twin = (x: number, z: number, w: number, d: number, h0: number): Foot => {
    const allowed = allowedTop(x, z, w, d);
    const h = fitH(h0, 1, 0, allowed);
    if (!h) return null;
    const tex = anyTex();
    const tw = w * 0.42, gap = w * 0.58;
    solid(bucket, 'facade', 'twin', tex, x - gap / 2, h / 2, z, tw, h, d);
    solid(bucket, 'facade', 'twin', tex, x + gap / 2, h / 2, z, tw, h, d);
    solid(bucket, 'facade', 'twin', tex, x, h * 0.64, z, gap, 2.2, d * 0.6); // the sky bridge
    roofBits(x - gap / 2, z, tw, d, h, allowed < Infinity);
    noteTall(x, z, h, w, d);
    const fp = { x, z, w, d };
    dress(fp, h, h, allowed < Infinity);
    return fp;
  };
  const cross = (x: number, z: number, w: number, d: number, h0: number): Foot => {
    const allowed = allowedTop(x, z, w, d);
    const h = fitH(h0, 1, 0, allowed);
    if (!h) return null;
    const tex = anyTex();
    solid(bucket, 'facade', 'cross', tex, x, h / 2, z, w, h, d * 0.5);
    solid(bucket, 'facade', 'cross', tex, x, h / 2, z, w * 0.5, h, d);
    roofBits(x, z, w * 0.5, d * 0.5, h, allowed < Infinity);
    noteTall(x, z, h, w, d);
    const fp = { x, z, w, d };
    dress(fp, h, h, allowed < Infinity);
    return fp;
  };
  const needle = (x: number, z: number, h0: number): Foot => {
    const w = 3.4 + rand() * 1.6;
    const allowed = allowedTop(x, z, w, w);
    const h = fitH(Math.max(h0, 36), 1, 10, allowed);
    if (!h) return null;
    solid(bucket, 'facade', 'needle', texOf((s) => s.win === 'strip' || s.win === 'tiny'), x, h / 2, z, w, h, w);
    solid(bucket, 'spire', 'needle', 0, x, h + 5, z, 0.7, 10, 0.7);
    const color = pick(rand, NEON);
    const sx = rand() < 0.5 ? -1 : 1, sz = rand() < 0.5 ? -1 : 1;
    leds.push({ x: x + sx * w / 2, y: h / 2, z: z + sz * w / 2, w: 0.2, h: h * 0.94, d: 0.2, color });
    leds.push({ x: x - sx * w / 2, y: h / 2, z: z - sz * w / 2, w: 0.2, h: h * 0.94, d: 0.2, color });
    noteTall(x, z, h + 10, w, w);
    const fp = { x, z, w, d: w };
    dress(fp, h, h + 10, allowed < Infinity);
    return fp;
  };
  const podium = (x: number, z: number, w: number, d: number, h0: number): Foot => {
    const allowed = allowedTop(x, z, w, d);
    const h = fitH(h0, 1, 0, allowed);
    if (!h) return null;
    const ph = Math.min(5 + rand() * 4, h * 0.4);
    solid(bucket, 'facade', 'podium', texOf((s) => s.win === 'curtain' || s.win === 'wide'), x, ph / 2, z, w, ph, d);
    solid(bucket, 'facade', 'podium', anyTex(), x, ph + (h - ph) / 2, z, w * 0.52, h - ph, d * 0.52);
    const top = crown(x, z, Math.min(w, d) * 0.52, h, allowed);
    noteTall(x, z, top, w, d);
    const fp = { x, z, w, d };
    dress(fp, ph, top, allowed < Infinity);
    return fp;
  };
  const oldtown = (cx: number, cz: number) => {
    const n = 4 + Math.floor(rand() * 4);
    const tex = texOf((s) => s.win === 'tiny' || s.win === 'grid');
    for (let i = 0; i < n; i++) {
      const w = 3.5 + rand() * 4, d = 3.5 + rand() * 4;
      const x = inLot(cx, w), z = inLot(cz, d);
      const allowed = allowedTop(x, z, w, d);
      const h = fitH(4 + rand() * 7, 1, 2.4, allowed);
      if (!h) continue;
      solid(bucket, 'facade', 'oldtown', tex, x, h / 2, z, w, h, d);
      if (rand() < 0.55) solid(bucket, 'pyr', 'oldtown', 0, x, h + 1.1, z, w, 2.2, d);
      dress({ x, z, w, d }, h, h, allowed < Infinity);
    }
  };

  /** One lot of the city: two to four buildings across the archetypes, the
   *  height pulled by the two downtowns; storefront glow on the main city. */
  const lot = (bx: number, bz: number, pull: number, storefronts: boolean) => {
    const cx = bx * G, cz = bz * G;
    if (pull < 0.3 && rand() < (rich ? 0.3 : 0.45)) { oldtown(cx, cz); return; }
    const n = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const w = 5 + rand() * 9;
      const d = 5 + rand() * 9;
      const x = inLot(cx, w);
      const z = inLot(cz, d);
      const h = 8 + rand() * 28 + pull * rand() * 40;
      const a = rand();
      const fp =
        h > 30 && a < 0.07 ? needle(x, z, h)
        : h > 24 && a < 0.15 ? ziggurat(x, z, w, d, h)
        : h > 22 && w > 9 && a < 0.21 ? twin(x, z, w, d, h)
        : h > 20 && a < 0.28 ? cross(x, z, w, d, h)
        : a < 0.37 ? slab(cx, cz, h)
        : a < 0.46 ? cylinder(cx, cz, h)
        : a < 0.56 ? podium(x, z, w, d, h)
        : tower(x, z, w, d, h, anyTex());
      // LIVELY STREETS: storefront light spilling onto the pavement
      if (fp && storefronts && rand() < 0.8) {
        const side = Math.floor(rand() * 4);
        const sx = side < 2 ? fp.x : fp.x + (side === 2 ? fp.w / 2 + 0.08 : -fp.w / 2 - 0.08);
        const sz = side === 0 ? fp.z + fp.d / 2 + 0.08 : side === 1 ? fp.z - fp.d / 2 - 0.08 : fp.z;
        strips.push({
          x: sx, y: 0.85, z: sz, w: side < 2 ? fp.w * 0.82 : 0.14, h: 1.5, d: side < 2 ? 0.14 : fp.d * 0.82,
          color: rand() < 0.62 ? pick(rand, WARM) : pick(rand, [...COOL, '#C8FF00', '#5df2ff']),
        });
      }
    }
  };

  // -- the main city ---------------------------------------------------------
  for (let bx = -HALF; bx <= HALF; bx++) {
    for (let bz = -HALF; bz <= HALF; bz++) {
      if (bx === 0 || bz === 0) continue; // the avenues
      if (bx === LANDMARK_BLOCK.bx && bz === LANDMARK_BLOCK.bz) continue; // the landmark's lot
      // two downtowns: the heart, and a second cluster beyond it from the
      // vista (south-east), so the opening reads in layers — never a wall
      const pull = Math.max(0, 1 - (Math.abs(bx) + Math.abs(bz)) / (HALF * 1.5))
        + 0.75 * Math.exp(-(((bx - 4) ** 2 + (bz + 4) ** 2) / 5));
      lot(bx, bz, pull, true);
    }
  }
  // -- the outer ring: past the fence, still finished ------------------------
  bucket = outer; rich = false;
  for (let bx = -HALF - OUTER; bx <= HALF + OUTER; bx++) {
    for (let bz = -HALF - OUTER; bz <= HALF + OUTER; bz++) {
      if (Math.max(Math.abs(bx), Math.abs(bz)) <= HALF) continue;
      if (bx === 0 || bz === 0) continue; // the avenues run on out of town
      lot(bx, bz, 0.05 + rand() * 0.1, false);
    }
  }
  bucket = core; rich = true;

  // -- the landmark: its own reserved lot at the heart (the vista's gaze) -----
  const lmx = LANDMARK_BLOCK.bx * G, lmz = LANDMARK_BLOCK.bz * G;
  solid(core, 'facade', 'landmark', LANDMARK_TEX, lmx, 42, lmz, 16, 84, 16);
  solid(core, 'facade', 'landmark', LANDMARK_TEX, lmx, 84 + 15, lmz, 11, 30, 11);
  solid(core, 'facade', 'landmark', LANDMARK_TEX, lmx, 114 + 8, lmz, 6.5, 16, 6.5);
  grid.add({ x: lmx, y: 131.8, z: lmz, w: 7.4, h: 3.6, d: 7.4 }); // the crown (drawn by the renderer)
  grid.add({ x: lmx, y: 142, z: lmz, w: 0.6, h: 18, d: 0.6 }); // the spire
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { // cyan LED edges up the base and the first tier
    leds.push({ x: lmx + sx * 8, y: 42, z: lmz + sz * 8, w: 0.24, h: 82, d: 0.24, color: '#7de8ff' });
    leds.push({ x: lmx + sx * 5.5, y: 99, z: lmz + sz * 5.5, w: 0.2, h: 28, d: 0.2, color: '#7de8ff' });
  }
  const landmark = { x: lmx, z: lmz, top: 151 };
  dress({ x: lmx, z: lmz, w: 16, d: 16 }, 84, 151, true);

  // -- the avenues: median trees, lamps, gantries; the plaza --------------------
  const reach = (HALF + OUTER) * G + STREET;
  const tree = (x: number, z: number) => {
    const h = 3.6 + rand() * 2;
    solid(core, 'dark', 'street', 0, x, 0.8, z, 0.34, 1.6, 0.34);
    solid(core, 'tree', 'street', 0, x, 1.6 + h / 2, z, 2.2 + rand() * 1.2, h, 2.2 + rand() * 1.2);
  };
  // the cross-streets cut through the medians: no tree or lamp on a crossing
  const onStreet = (t: number) => Math.abs(((t % G) + G) % G - G / 2) < STREET / 2 + 2.5;
  for (let t = -reach; t <= reach; t += 7) {
    if (Math.abs(t) < 30 || onStreet(t)) continue; // the plaza, the crossings
    tree(-7.5, t); tree(7.5, t); tree(t, -7.5); tree(t, 7.5);
    if (Math.round(t / 7) % 2 === 0) { posts.push({ x: 0, z: t, h: 6 }); posts.push({ x: t, z: 0, h: 6 }); }
  }
  const gantry = (axis: 'x' | 'z', at: number, t: number) => {
    // a lit board spanning the road on two posts at the kerbs
    const x = axis === 'z' ? at : t, z = axis === 'z' ? t : at;
    signs.push({ x, y: 10.4, z, rotY: axis === 'z' ? 0 : Math.PI / 2, w: 9.5, h: 2.2, color: signColor(rand), kind: 'gantry' });
    for (const s of [-1, 1]) {
      solid(core, 'dark', 'street', 0,
        axis === 'z' ? at + s * 5.3 : t, 5.75, axis === 'z' ? t : at + s * 5.3, 0.36, 11.5, 0.36);
    }
  };
  for (const k of [-6, -3, 3, 6]) {
    for (const s of [-1, 1]) { gantry('z', s * streetAt(0), k * G); gantry('x', s * streetAt(0), k * G); }
  }
  solid(core, 'cyl', 'street', 0, 0, 0.25, 0, 30, 0.5, 30); // the plaza's disc
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    posts.push({ x: Math.cos(a) * 17, z: Math.sin(a) * 17, h: 7 });
  }

  // -- the streets: lamp posts on every kerb, corner kiosks -------------------
  const streets: Street[] = [];
  for (let i = -HALF - OUTER - 1; i <= HALF + OUTER; i++) {
    streets.push({ axis: 'x', at: streetAt(i), from: -reach, to: reach });
    streets.push({ axis: 'z', at: streetAt(i), from: -reach, to: reach });
  }
  for (const st of streets) {
    for (let t = -reach + 6; t <= reach - 6; t += 12) {
      for (const s of [-1, 1]) {
        const off = st.at + s * (ROAD / 2 + 1);
        const x = st.axis === 'x' ? t : off, z = st.axis === 'x' ? off : t;
        if (Math.abs(x) < 30 && Math.abs(z) < 30) continue; // the plaza has its ring
        posts.push({ x, z, h: 5.5 });
      }
    }
  }
  for (let i = -HALF - 1; i <= HALF; i++) {
    for (let j = -HALF - 1; j <= HALF; j++) {
      if (rand() > 0.3) continue;
      const sx = rand() < 0.5 ? -1 : 1, sz = rand() < 0.5 ? -1 : 1;
      const x = streetAt(i) + sx * 8.6, z = streetAt(j) + sz * 8.6;
      if (Math.abs(x) < MEDIAN + 2 || Math.abs(z) < MEDIAN + 2) continue;
      solid(core, 'dark', 'street', 0, x, 1.2, z, 2.2, 2.4, 1.6);
      signs.push({ x, y: 1.5, z: z - sz * 0.85, rotY: sz > 0 ? Math.PI : 0, w: 1.8, h: 1.3, color: signColor(rand), kind: 'tag' });
    }
  }

  // -- the giant screens, beacons, points of interest ------------------------
  tall.sort((a, b) => b.top - a.top);
  const pois: Poi[] = [{ x: lmx, y: landmark.top * 0.62, z: lmz, w: 3 }];
  for (const t of tall.slice(0, 8)) {
    if (rand() < 0.75) {
      const w = Math.min(10, t.w * 0.9);
      const s = rand() < 0.5 ? 1 : -1;
      signs.push({ x: t.x, y: t.top * 0.42, z: t.z + s * (t.d / 2 + 0.25), rotY: s > 0 ? 0 : Math.PI, w, h: w * 0.6, color: '#ffffff', kind: 'screen' });
      pois.push({ x: t.x, y: t.top * 0.42, z: t.z, w: 1.6 });
    }
  }
  for (const t of tall.slice(0, 14)) pois.push({ x: t.x, y: t.top * 0.6, z: t.z, w: 1 + t.top / 100 });
  const beacons = [{ x: lmx, y: landmark.top + 1.6, z: lmz }, ...tall.slice(0, 26).map((t) => ({ x: t.x, y: t.top + 1.8, z: t.z }))];

  // -- the sprawl: past the outer ring, massing for the fog ------------------
  const clusters = [0, 1, 2].map(() => {
    const a = rand() * Math.PI * 2, r = 520 + rand() * 380;
    return { x: Math.cos(a) * r, z: Math.sin(a) * r, s: 60 + rand() * 80 };
  });
  for (let bx = -FAR; bx <= FAR; bx++) {
    for (let bz = -FAR; bz <= FAR; bz++) {
      if (Math.max(Math.abs(bx), Math.abs(bz)) <= HALF + OUTER) continue;
      if (rand() < 0.25) continue;
      const cx = bx * G, cz = bz * G;
      let boost = 0;
      for (const c of clusters) boost += Math.exp(-((cx - c.x) ** 2 + (cz - c.z) ** 2) / (2 * c.s * c.s));
      const n = 1 + (rand() < 0.6 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const w = 6 + rand() * 12, d = 6 + rand() * 12;
        const h = 5 + rand() * 14 + boost * (20 + rand() * 50) + (rand() < 0.03 ? 20 + rand() * 40 : 0);
        solid(sprawl, 'facade', 'sprawl', rand() < 0.5 ? sprawlTex[0] : sprawlTex[1],
          inLot(cx, w), h / 2, inLot(cz, d), w, h, d);
      }
    }
  }
  const sprawlLamps: number[] = [];
  for (let i = 0; i < 2400; i++) {
    const t = (rand() - 0.5) * 2 * FAR * G;
    const lane = streetAt(Math.floor(rand() * 2 * FAR) - FAR) + (ROAD / 2 + 1) * (rand() < 0.5 ? 1 : -1);
    if (rand() < 0.5) sprawlLamps.push(t, 5.5, lane); else sprawlLamps.push(lane, 5.5, t);
  }
  const neon = { pos: [] as number[], col: [] as string[] };
  for (let i = 0; i < 900; i++) {
    const s = pick(rand, sprawl);
    const side = Math.floor(rand() * 4);
    neon.pos.push(
      s.x + (side === 0 ? s.w / 2 + 0.2 : side === 1 ? -s.w / 2 - 0.2 : (rand() - 0.5) * s.w * 0.8),
      s.h * (0.25 + rand() * 0.65),
      s.z + (side === 2 ? s.d / 2 + 0.2 : side === 3 ? -s.d / 2 - 0.2 : (rand() - 0.5) * s.d * 0.8),
    );
    neon.col.push(signColor(rand));
  }

  return {
    core, outer, sprawl, strips, leds, signs, posts, sprawlLamps, neon, beacons, pois, streets,
    styles, sprawlTex, grid, landmark,
  };
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
export type Phase = 'cruise' | 'dive' | 'canyon' | 'climb';
interface FlightState { phase: Phase; left: number; heading: number; axis: 'x' | 'z'; dir: 1 | -1; street: number }
interface Knot { p: Vector3; t: Vector3; phase: Phase }
interface Proposal { p: Vector3; dir: Vector3; dive: boolean }

export class AutoFlight {
  readonly knots: Knot[] = [];
  dives = 0;
  fallbacks = 0;
  /** Counts up each time the camera enters a new leg — the cinematographer's cue. */
  legId = 0;
  private seg = 0;
  private u = 0;
  private segLen = 1;
  private st: FlightState;
  private readonly tmp = new Vector3();

  constructor(private grid: CollisionGrid, private rand: () => number, start: Vector3, heading: number) {
    this.st = { phase: 'cruise', left: 1 + Math.floor(rand() * 3), heading, axis: 'x', dir: 1, street: G / 2 };
    this.knots.push({ p: start.clone(), t: new Vector3(Math.sin(heading), 0, Math.cos(heading)).multiplyScalar(30), phase: 'cruise' });
    this.ensure();
    this.measure();
  }

  /** The phase of the leg being flown. */
  get phase(): Phase { return this.knots[this.seg + 1]?.phase ?? 'cruise'; }

  /** Advance `dist` world units; writes the camera position and its look point. */
  step(dist: number, pos: Vector3, look: Vector3): void {
    this.u += dist / this.segLen;
    while (this.u >= 1) {
      this.u -= 1;
      this.seg += 1;
      this.legId += 1;
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
   *  abandons its phase (low in a street → climb out along it, otherwise
   *  cruise high), and as a last resort heads home over the skyline. */
  private append(): void {
    const last = this.knots[this.knots.length - 1];
    for (let tries = 0; tries < 64; tries++) {
      const snap = { ...this.st };
      if (tries >= 40) {
        const low = this.st.phase === 'canyon' || this.st.phase === 'dive';
        this.st.phase = low ? 'climb' : 'cruise'; this.st.left = 2;
      }
      const phase = this.st.phase;
      const c = this.propose(last.p, tries >= 40 ? 40 + this.rand() * 60 : undefined);
      if (this.push(last, c, phase)) { if (c.dive) this.dives += 1; return; }
      this.st = snap;
      // near the fence, every retry re-aims for the plaza; elsewhere, wander
      if (Math.abs(last.p.x) > EXT - 80 || Math.abs(last.p.z) > EXT - 80) {
        this.st.heading = Math.atan2(-last.p.x, -last.p.z) + (this.rand() - 0.5) * 1.6;
      } else if (this.rand() < 0.5) this.st.heading += (this.rand() - 0.5) * 2.4;
    }
    // last resort: home is the way out — toward the plaza, over the skyline
    this.fallbacks += 1;
    const home = new Vector3(-last.p.x, 0, -last.p.z);
    if (home.lengthSq() < 1) home.set(0, 0, 1);
    home.normalize();
    const p = last.p.clone().addScaledVector(home, 40);
    p.y = clamp(Math.max(last.p.y, this.ceilingAlong(last.p, p)) + 24, 30, 210);
    if (!this.push(last, { p, dir: new Vector3(home.x, 0.6, home.z), dive: false }, 'cruise')) {
      this.knots.push({ p, t: home.clone().multiplyScalar(20), phase: 'cruise' }); // accepted regardless
    }
    this.st.phase = 'cruise'; this.st.left = 2; this.st.heading = Math.atan2(home.x, home.z);
  }

  private push(last: Knot, c: Proposal, phase: Phase): boolean {
    const chord = c.p.distanceTo(last.p);
    this.knots.push({ p: c.p, t: c.dir.normalize().multiplyScalar(chord * 0.55), phase });
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
      if (Math.abs(p.x) > BOUND - 16 || Math.abs(p.z) > BOUND - 16 || p.y < 3 || p.y > 230) return false;
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
      if (Math.abs(last.x) > EXT - 60 || Math.abs(last.z) > EXT - 60) s.heading = Math.atan2(-last.x, -last.z) + (r() - 0.5) * 0.9;
      const dist = 55 + r() * 65;
      const dir = new Vector3(Math.sin(s.heading), 0, Math.cos(s.heading));
      const p = new Vector3(last.x + dir.x * dist, 0, last.z + dir.z * dist);
      // never park a knot on the fence: the next leg's opening bulge would
      // have nowhere to go — turn for the plaza first
      if (Math.abs(p.x) > EXT - 40 || Math.abs(p.z) > EXT - 40) {
        s.heading = Math.atan2(-last.x, -last.z) + (r() - 0.5) * 0.6;
        dir.set(Math.sin(s.heading), 0, Math.cos(s.heading));
        p.set(last.x + dir.x * dist, 0, last.z + dir.z * dist);
      }
      // ride the skyline: sometimes skimming the roofs, sometimes well above
      const ceil = this.ceilingAlong(last, p);
      p.y = clamp(Math.max(ceil + 10 + (forceY ?? r() * 36), last.y + (r() - 0.5) * 50), 34, 210);
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
      // the streets are only dived inside the main city, only where the
      // skyline is low enough to drop through, and only with enough street
      // ahead for the run AND the climb out before the fence — otherwise
      // cruise on and try elsewhere
      const room = s.dir > 0 ? EXT - 24 - along : along + EXT - 24;
      if (ceil > 60 || room < 150 || Math.abs(perp) > EXT) {
        s.phase = 'cruise'; s.left = 1;
        return this.propose(last, forceY);
      }
      p.y = Math.max(44 + r() * 14, ceil + 8);
      s.phase = 'canyon'; s.left = Math.max(1, Math.min(2 + Math.floor(r() * 3), Math.floor((room - 100) / 70)));
      const dir = streetDir(); dir.y = -0.45; // nosing down, already aligned with the street
      return { p, dir, dive: true };
    }
    if (s.phase === 'canyon') {
      const along = (s.axis === 'x' ? last.x : last.z) + s.dir * (45 + r() * 25);
      if (Math.abs(along) > EXT - 110) { s.phase = 'climb'; return this.propose(last, forceY); } // the core ends: climb out while there is room
      const y = 18 + r() * 12; // the dives stay above the street's life (owner: raise them)
      const lat = s.street + (r() - 0.5) * 1.4;
      if (--s.left <= 0) s.phase = 'climb';
      return { p: s.axis === 'x' ? new Vector3(along, y, lat) : new Vector3(lat, y, along), dir: streetDir(), dive: false };
    }
    // climb: out of the canyon, back to the rooftops, still heading along the street
    const along = clamp((s.axis === 'x' ? last.x : last.z) + s.dir * (60 + r() * 30), -(EXT - 40), EXT - 40);
    const y = forceY ?? 64 + r() * 56;
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
