/** THE PLAN OF REVACHOL — pure geometry, no DOM, no renderer, so the city
 *  can be reasoned about in tests: every solid the camera must respect, the
 *  story route the city is BUILT AROUND (towers under the flight are capped,
 *  so the tour can never clip — owner decree: buildings are barriers), the
 *  endless randomised auto-flight that validates each new leg against the
 *  solids before flying it, the street furniture and signage that make the
 *  streets real and the city alive, and a star dome with no hole in it.
 *
 *  Scale (owner: "spacious, wider streets"): 24-unit lots, 14-unit streets
 *  (10 of road, 2 of sidewalk either side), two 52-unit avenues crossing at
 *  a central plaza — the north–south one a CANAL with bridges at every
 *  crossing, the east–west one tree-lined. The MAIN CITY is ±7 blocks and
 *  fenced; a 3-block OUTER ring past the fence is built with the same
 *  generator so nothing near the edge reads as an unfinished box; the
 *  SPRAWL beyond that is simple massing the fog already owns.
 *
 *  Newport City (owner: "more cyberpunk, Ghost in the Shell, messy"): every
 *  lot is PACKED edge to edge by a recursive partition into building cells
 *  with jumbled heights; half the lots are cut by an alley strung with
 *  lanterns and wires; some street segments close and buildings straddle
 *  them; a diagonal boulevard slashes the south-west; an elevated highway
 *  on pillars crosses the north; a stadium, a Ferris wheel, a stepped
 *  megastructure under a hologram, pagoda temples, an industrial corner of
 *  tanks and stacks, skybridges, footbridges, market stalls. */
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
export const REACH = (HALF + OUTER) * G + STREET; // how far streets, traffic and lamps run
export const HIGHWAY = { x0: -400, z0: 210, x1: 400, z1: 80, y: 14, width: 14 }; // the elevated highway across the north
export const DIAGONAL = { x0: -247, z0: -19, x1: -19, z1: -247, width: 12 }; // the surface boulevard slashing the south-west: x + z = −266 runs it through seven grid crossings, T-ing into the avenue roads at both ends
export const CANAL = { w: 24, deck: 1.15 }; // the north–south avenue's water and its bridge decks
const ROUTE_PAD = 3.4; // clearance the city keeps around the story route
const FLY_PAD = 2.6; // clearance the auto-flight demands of a new leg
const GRID_PAD = 4; // cell registration pad — every query radius stays under it
const LANDMARK_BLOCK = { bx: 1, bz: 1 };
export const streetAt = (i: number): number => (i + 0.5) * G;

export interface Box { x: number; y: number; z: number; w: number; h: number; d: number }
export type Kind = 'facade' | 'dark' | 'cyl' | 'pyr' | 'spire' | 'dome' | 'tree' | 'canopy';
export type Arch =
  | 'tower' | 'slab' | 'cyl' | 'ziggurat' | 'twin' | 'cross' | 'needle' | 'podium' | 'low'
  | 'oldtown' | 'landmark' | 'sprawl' | 'bits' | 'street' | 'bridge' | 'temple' | 'industry' | 'mega';
export interface Solid extends Box { kind: Kind; tex: number; arch: Arch }
export interface Strip extends Box { color: string }
export type SignKind = 'hang' | 'wall' | 'board' | 'tag' | 'roof' | 'gantry' | 'screen';
export interface Sign {
  x: number; y: number; z: number; rotY: number; w: number; h: number; color: string; kind: SignKind;
}
export type StreetKind = 'road' | 'highway' | 'canal' | 'alley' | 'diagonal' | 'ramp';
/** A straight run: p(t) = (x0 + dx·t, z0 + dz·t) for t in [0, len]; lanes sit
 *  along the left normal (−dz, dx). A ramp climbs (or falls) from y to y1
 *  along its length and is driven one way, from t = 0. */
export interface Street {
  x0: number; z0: number; dx: number; dz: number; len: number; y: number; kind: StreetKind; width: number;
  y1?: number; oneWay?: boolean;
}
export const RAMP_W = 8;
export const rampY = (st: Street, t: number): number => {
  if (st.y1 === undefined) return st.y;
  const u = Math.min(1, Math.max(0, t / st.len));
  return st.y + (st.y1 - st.y) * u * u * (3 - 2 * u);
};
export interface Poi { x: number; y: number; z: number; w: number }
export interface Holo { x: number; y: number; z: number; w: number; h: number; rotY: number }
export interface Stall { x: number; z: number; color: string }
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
  awnings: Strip[];
  signs: Sign[];
  posts: { x: number; z: number; h: number; y?: number }[];
  lanterns: number[];
  wires: number[];
  vents: { x: number; z: number }[];
  holos: Holo[];
  stalls: Stall[];
  sprawlLamps: number[];
  neon: { pos: number[]; col: string[] };
  beacons: { x: number; y: number; z: number }[];
  pois: Poi[];
  streets: Street[];
  stadium: { x: number; z: number; w: number; d: number; h: number; masts: { x: number; z: number; h: number }[] };
  wheel: { x: number; y: number; z: number; r: number };
  mega: { x: number; z: number; top: number };
  stacks: { x: number; z: number; top: number }[];
  bridges: { z: number }[];
  styles: FacadeStyle[];
  sprawlTex: [number, number];
  grid: CollisionGrid;
  landmark: { x: number; z: number; top: number };
  /** Open street ahead of `from` along the travel axis at street `at`, in
   *  direction dir, up to the fence — the auto-flight's dive budget. */
  roomAhead(axis: 'x' | 'z', at: number, from: number, dir: 1 | -1): number;
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

/** Lateral distance from (x, z) to the segment A→B, or Infinity beyond its ends. */
function lineDist(x: number, z: number, ax: number, az: number, bx: number, bz: number): number {
  return lineProj(x, z, ax, az, bx, bz).d;
}
/** The same, with the parameter (0..1) of the foot of the perpendicular. */
function lineProj(x: number, z: number, ax: number, az: number, bx: number, bz: number): { d: number; t: number } {
  const vx = bx - ax, vz = bz - az;
  const len2 = vx * vx + vz * vz;
  const t = ((x - ax) * vx + (z - az) * vz) / len2;
  if (t < 0 || t > 1) return { d: Infinity, t };
  const px = ax + vx * t, pz = az + vz * t;
  return { d: Math.hypot(x - px, z - pz), t };
}

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
 *  north-west, above the elevated highway; the approach drops onto the
 *  canal avenue's water and runs it to the plaza; the corner turns east
 *  down the tree-lined avenue past the landmark; the climb rises over the
 *  eastern rooftops toward the moon. Canyon runs are collinear control
 *  points down the medians (x = 0, then z = 0) with the corner pinned, so
 *  the spline cannot bow into a lot; the approach and the climb cross lots
 *  and the plan caps whatever stands beneath them. */
export function tourRoute(): CatmullRomCurve3 {
  const P = (bx: number, y: number, bz: number) => new Vector3(bx * G, y, bz * G);
  return new CatmullRomCurve3([
    P(-3.4, 78, 4.4), // the vista — the whole skyline
    P(-2.5, 54, 3.3),
    P(-1.5, 36, 2.3), // the approach
    P(-0.6, 26, 1.6),
    P(0, 22, 1.1), // over the canal, due north
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
  // the reference's night is BLUE-GREEN: deep indigo-navy masses with a
  // teal cast, not black
  const tints = ['#0c1530', '#0a1226', '#101a3a', '#0d1020', '#141c3c', '#0b1424', '#160f22', '#0c1a26', '#101426'];
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
  // the megastructure: a curtain of cold light
  out.push({ tint: '#0c1a2e', win: 'curtain', crown: true, density: 1.5, warm: 0.15, dim: 1, core: false });
  return out;
}
export const LANDMARK_TEX = 20;
export const MEGA_TEX = 21;

interface Rect { x: number; z: number; w: number; d: number }

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
  const awnings: Strip[] = [];
  const signs: Sign[] = [];
  const posts: { x: number; z: number; h: number; y?: number }[] = [];
  const lanterns: number[] = [];
  const wires: number[] = [];
  const vents: { x: number; z: number }[] = [];
  const holos: Holo[] = [];
  const stalls: Stall[] = [];
  const streets: Street[] = [];
  const ramps: Street[] = []; // planned before any lot is built — they cap what stands under them
  const stacks: { x: number; z: number; top: number }[] = [];
  const tall: { x: number; z: number; top: number; w: number; d: number; bridges: number }[] = [];
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
  const lantern = (x: number, y: number, z: number) => lanterns.push(x, y, z);

  /** The highest top the story route allows over a footprint; the opening's
   *  foreground stays low-rise so the vista looks OVER it; and whatever
   *  stands under the elevated highway ducks beneath its deck. */
  const vista = routePts[0];
  const allowedTop = (x: number, z: number, w: number, d: number): number => {
    let top = Infinity;
    const hx = w / 2 + ROUTE_PAD, hz = d / 2 + ROUTE_PAD;
    for (const p of routePts) {
      if (Math.abs(p.x - x) < hx && Math.abs(p.z - z) < hz && p.y - ROUTE_PAD < top) top = p.y - ROUTE_PAD;
    }
    const dv = Math.hypot(x - vista.x, z - vista.z);
    if (dv < 130) top = Math.min(top, 24 + dv * 0.26);
    if (lineDist(x, z, HIGHWAY.x0, HIGHWAY.z0, HIGHWAY.x1, HIGHWAY.z1) < HIGHWAY.width / 2 + Math.max(w, d) / 2 + 1) {
      top = Math.min(top, HIGHWAY.y - 0.5 - ROUTE_PAD);
    }
    for (const r of ramps) { // the ramps fall to the ground: nothing stands under their low end
      const pr = lineProj(x, z, r.x0, r.z0, r.x0 + r.dx * r.len, r.z0 + r.dz * r.len);
      if (pr.d < RAMP_W / 2 + Math.max(w, d) / 2 + 1) top = Math.min(top, rampY(r, pr.t * r.len) - 0.5 - ROUTE_PAD);
    }
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
  /** The mess of a lived-in facade: balconies stacked up a face, an awning
   *  over the shopfront, a pipe run, a steam vent at the kerb. */
  const clutter = (fp: NonNullable<Foot>, h: number) => {
    if (rand() < 0.55 && h > 8) {
      const s = Math.floor(rand() * 4);
      const f = face(fp, s, 0.45);
      const len = (s < 2 ? fp.w : fp.d) * 0.7;
      for (let y = 3.8; y < h - 1.5; y += 3.6) {
        solid(bucket, 'dark', 'bits', 0, f.x, y, f.z, s < 2 ? len : 0.9, 0.22, s < 2 ? 0.9 : len);
      }
    }
    if (rand() < 0.4) {
      const s = Math.floor(rand() * 4);
      const f = face(fp, s, 0.7);
      const len = (s < 2 ? fp.w : fp.d) * 0.6;
      awnings.push({ x: f.x, y: 3.1, z: f.z, w: s < 2 ? len : 1.4, h: 0.16, d: s < 2 ? 1.4 : len, color: signColor(rand) });
    }
    if (rand() < 0.3) {
      const s = Math.floor(rand() * 4);
      const f = face(fp, s, 0.2);
      solid(bucket, 'dark', 'bits', 0, f.x + (s < 2 ? along(fp, s, 0.4) : 0), h / 2, f.z + (s >= 2 ? along(fp, s, 0.4) : 0), 0.3, h * 0.96, 0.3);
    }
    if (rand() < 0.06) vents.push({ x: fp.x + (rand() < 0.5 ? -1 : 1) * (fp.w / 2 + 1.2), z: fp.z + (rand() - 0.5) * fp.d });
  };

  // -- archetypes -----------------------------------------------------------
  const roofBits = (x: number, z: number, w: number, d: number, top: number, capped: boolean) => {
    if (capped) return;
    const bits = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < bits; i++) {
      solid(bucket, 'dark', 'bits', 0,
        x + (rand() - 0.5) * w * 0.5, top + 0.7, z + (rand() - 0.5) * d * 0.5,
        0.8 + rand() * 1.4, 1.4, 0.8 + rand() * 1.4);
    }
    if (rand() < 0.2) solid(bucket, 'dark', 'bits', 0, x + (rand() - 0.5) * w * 0.4, top + 2.4, z + (rand() - 0.5) * d * 0.4, 0.22, 4.8, 0.22);
    if (rand() < 0.1) solid(bucket, 'cyl', 'bits', 0, x + (rand() - 0.5) * w * 0.4, top + 1.9, z + (rand() - 0.5) * d * 0.4, 1.6, 2.2, 1.6);
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
    if (top > 40 && bucket === core) tall.push({ x, z, top, w, d, bridges: 0 });
  };
  const finish = (fp: NonNullable<Foot>, h: number, top: number, capped: boolean) => {
    dress(fp, h, top, capped);
    clutter(fp, h);
    return fp;
  };

  const tower = (x: number, z: number, w: number, d: number, h0: number, tex: number): Foot => {
    const allowed = allowedTop(x, z, w, d);
    const factor = h0 > 44 ? 1.44 : h0 > 30 ? 1.28 : 1;
    const h = fitH(h0, factor, 0, allowed);
    if (!h) return null;
    const capped = allowed < Infinity;
    solid(bucket, 'facade', 'tower', tex, x, h / 2, z, w, h, d);
    let top = h, wTop = w;
    if (h > 30) {
      // the setbacks sit off-centre: stacked additions, not a wedding cake
      const ox = (rand() - 0.5) * w * 0.3, oz = (rand() - 0.5) * d * 0.3;
      solid(bucket, 'facade', 'tower', anyTex(), x + ox, h + (h * 0.28) / 2, z + oz, w * 0.66, h * 0.28, d * 0.66);
      top = h * 1.28; wTop = w * 0.66;
      if (h > 44) {
        solid(bucket, 'facade', 'tower', anyTex(), x + ox * 0.5, h * 1.28 + (h * 0.16) / 2, z + oz * 0.5, w * 0.38, h * 0.16, d * 0.38);
        top = h * 1.44; wTop = w * 0.38;
      }
    }
    if (h > 26) top = crown(x, z, Math.min(wTop, d * (wTop / w)), top, allowed);
    else roofBits(x, z, w, d, top, capped);
    noteTall(x, z, top, w, d);
    return finish({ x, z, w, d }, h, top, capped);
  };
  const slab = (x: number, z: number, w: number, d: number, h0: number): Foot => {
    const allowed = allowedTop(x, z, w, d);
    const h = fitH(h0, 1, 0, allowed);
    if (!h) return null;
    solid(bucket, 'facade', 'slab', texOf((s) => s.win === 'ribbon' || s.win === 'curtain'), x, h / 2, z, w, h, d);
    roofBits(x, z, w, d, h, allowed < Infinity);
    noteTall(x, z, h, w, d);
    return finish({ x, z, w, d }, h, h, allowed < Infinity);
  };
  const cylinder = (x: number, z: number, r: number, h0: number): Foot => {
    const allowed = allowedTop(x, z, r * 2, r * 2);
    const h = fitH(h0, 1, r, allowed); // the dome is r tall — reserve all of it
    if (!h) return null;
    solid(bucket, 'cyl', 'cyl', texOf((s) => s.win === 'strip' || s.win === 'grid' || s.win === 'wide'), x, h / 2, z, r * 2, h, r * 2);
    let top = h;
    if (rand() < 0.45) { solid(bucket, 'dome', 'cyl', 0, x, h + r / 2, z, r * 2, r, r * 2); top = h + r; }
    noteTall(x, z, top, r * 2, r * 2);
    return finish({ x, z, w: r * 2, d: r * 2 }, h, top, allowed < Infinity);
  };
  const ziggurat = (x: number, z: number, w: number, d: number, h0: number): Foot => {
    const allowed = allowedTop(x, z, w, d);
    const h = fitH(h0, 1, 0, allowed);
    if (!h) return null;
    const tex = anyTex();
    const tiers = 3 + (rand() < 0.5 ? 1 : 0);
    const shares = tiers === 3 ? [0.5, 0.3, 0.2] : [0.42, 0.26, 0.19, 0.13];
    let y = 0, sw = w, sd = d, ox = 0, oz = 0;
    for (let t = 0; t < tiers; t++) {
      const th = h * shares[t];
      solid(bucket, 'facade', 'ziggurat', t ? anyTex() : tex, x + ox, y + th / 2, z + oz, sw, th, sd);
      y += th; sw *= 0.72; sd *= 0.72;
      ox += (rand() - 0.5) * w * 0.12; oz += (rand() - 0.5) * d * 0.12;
    }
    noteTall(x, z, y, w, d);
    return finish({ x, z, w, d }, h * shares[0], y, allowed < Infinity);
  };
  const twin = (x: number, z: number, w: number, d: number, h0: number): Foot => {
    const allowed = allowedTop(x, z, w, d);
    const h = fitH(h0, 1, 0, allowed);
    if (!h) return null;
    const tex = anyTex();
    const tw = w * 0.42, gap = w * 0.58;
    solid(bucket, 'facade', 'twin', tex, x - gap / 2, h / 2, z, tw, h, d);
    solid(bucket, 'facade', 'twin', tex, x + gap / 2, (h * (0.7 + rand() * 0.3)) / 2, z, tw, h * (0.7 + rand() * 0.3), d);
    solid(bucket, 'facade', 'twin', tex, x, h * 0.5, z, gap, 2.2, d * 0.6); // the sky bridge
    roofBits(x - gap / 2, z, tw, d, h, allowed < Infinity);
    noteTall(x, z, h, w, d);
    return finish({ x, z, w, d }, h, h, allowed < Infinity);
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
    return finish({ x, z, w, d }, h, h, allowed < Infinity);
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
    return finish({ x, z, w, d: w }, h, h + 10, allowed < Infinity);
  };
  const podium = (x: number, z: number, w: number, d: number, h0: number): Foot => {
    const allowed = allowedTop(x, z, w, d);
    const h = fitH(h0, 1, 0, allowed);
    if (!h) return null;
    const ph = Math.min(5 + rand() * 4, h * 0.4);
    solid(bucket, 'facade', 'podium', texOf((s) => s.win === 'curtain' || s.win === 'wide'), x, ph / 2, z, w, ph, d);
    const ox = (rand() - 0.5) * w * 0.3, oz = (rand() - 0.5) * d * 0.3;
    solid(bucket, 'facade', 'podium', anyTex(), x + ox, ph + (h - ph) / 2, z + oz, w * 0.52, h - ph, d * 0.52);
    const top = crown(x + ox, z + oz, Math.min(w, d) * 0.52, h, allowed);
    noteTall(x, z, top, w, d);
    return finish({ x, z, w, d }, ph, top, allowed < Infinity);
  };
  /** The low-rise stack: a tenement of small floors, balconies, a pitched
   *  or flat roof, sometimes a rooftop shed — Newport City's old quarter. */
  const low = (x: number, z: number, w: number, d: number, h0: number): Foot => {
    const allowed = allowedTop(x, z, w, d);
    const h = fitH(h0, 1, 2.6, allowed);
    if (!h) return null;
    const tex = texOf((s) => s.win === 'tiny' || s.win === 'grid');
    solid(bucket, 'facade', 'low', tex, x, h / 2, z, w, h, d);
    let top = h;
    if (rand() < 0.4) { solid(bucket, 'pyr', 'low', 0, x, h + 1.2, z, w, 2.4, d); top = h + 2.4; }
    else if (rand() < 0.5) { solid(bucket, 'facade', 'low', tex, x + (rand() - 0.5) * w * 0.3, h + 1.4, z + (rand() - 0.5) * d * 0.3, w * 0.5, 2.8, d * 0.5); top = h + 2.8; }
    return finish({ x, z, w, d }, h, top, allowed < Infinity);
  };

  /** Recursive partition of a rectangle into building cells between min and
   *  max across, so a lot fills edge to edge with jumbled footprints. */
  const partition = (r: Rect, min: number, max: number, out: Rect[]) => {
    const canW = r.w >= 2 * min, canD = r.d >= 2 * min;
    const mustW = r.w > max, mustD = r.d > max;
    if (!mustW && !mustD && (rand() < 0.35 || (!canW && !canD))) { out.push(r); return; }
    const splitW = canW && (mustW || !canD || r.w >= r.d ? rand() < 0.75 : rand() < 0.25);
    if (splitW && canW) {
      const w1 = min + rand() * (r.w - 2 * min);
      partition({ x: r.x - r.w / 2 + w1 / 2, z: r.z, w: w1, d: r.d }, min, max, out);
      partition({ x: r.x + w1 / 2, z: r.z, w: r.w - w1, d: r.d }, min, max, out);
    } else if (canD) {
      const d1 = min + rand() * (r.d - 2 * min);
      partition({ x: r.x, z: r.z - r.d / 2 + d1 / 2, w: r.w, d: d1 }, min, max, out);
      partition({ x: r.x, z: r.z + d1 / 2, w: r.w, d: r.d - d1 }, min, max, out);
    } else out.push(r);
  };

  /** One cell of a lot becomes one building, by size class and height. */
  const building = (c: Rect, pull: number, storefronts: boolean) => {
    if (lineDist(c.x, c.z, DIAGONAL.x0, DIAGONAL.z0, DIAGONAL.x1, DIAGONAL.z1) < DIAGONAL.width / 2 + Math.max(c.w, c.d) / 2 + 1) return; // the boulevard's right of way
    const g = 0.3 + rand() * 0.8;
    const w = c.w - 2 * g, d = c.d - 2 * g;
    if (w < 3 || d < 3) return;
    const x = c.x, z = c.z;
    const base = 10 + pull * 44;
    const h = base * (0.45 + rand() * 1.15) * (rand() < 0.08 ? 1.6 : 1); // jumbled, with the odd spike
    const m = Math.min(w, d), M = Math.max(w, d);
    const a = rand();
    const fp =
      m < 5.5 ? (h > 34 && rand() < 0.25 ? needle(x, z, h) : low(x, z, w, d, Math.min(h, 16)))
      : M / m > 2.2 ? slab(x, z, w, d, h)
      : h > 30 && a < 0.08 ? needle(x, z, h)
      : h > 24 && a < 0.18 ? ziggurat(x, z, w, d, h)
      : h > 22 && w > 9 && a < 0.25 ? twin(x, z, w, d, h)
      : h > 20 && a < 0.32 ? cross(x, z, w, d, h)
      : a < 0.4 && m >= 6 ? cylinder(x, z, (m / 2) * 0.95, h)
      : a < 0.5 ? podium(x, z, w, d, h)
      : h < 14 ? low(x, z, w, d, h)
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
  };

  /** An alley cut through a lot: a narrow walkway strung with lanterns,
   *  banners and wires between the buildings either side. */
  const alley = (r: Rect, alongX: boolean, at: number, aw: number) => {
    const len = alongX ? r.w : r.d;
    const x0 = alongX ? r.x - r.w / 2 : at, z0 = alongX ? at : r.z - r.d / 2;
    streets.push({ x0, z0, dx: alongX ? 1 : 0, dz: alongX ? 0 : 1, len, y: 0, kind: 'alley', width: aw });
    for (let t = 3; t < len - 2; t += 6) {
      const side = rand() < 0.5 ? -1 : 1;
      lantern(alongX ? x0 + t : at + side * (aw / 2 - 0.4), 3.6 + rand() * 1.5, alongX ? at + side * (aw / 2 - 0.4) : z0 + t);
    }
    for (let i = 0, n = 3 + Math.floor(rand() * 4); i < n; i++) {
      const t = 2 + rand() * (len - 4);
      const ya = 5 + rand() * 8, yb = 5 + rand() * 8, sag = 0.5 + rand() * 1.2;
      const a = alongX ? [x0 + t, ya, at - aw / 2] : [at - aw / 2, ya, z0 + t];
      const b = alongX ? [x0 + t + (rand() - 0.5) * 3, yb, at + aw / 2] : [at + aw / 2, yb, z0 + t + (rand() - 0.5) * 3];
      const m = [(a[0] + b[0]) / 2, Math.min(ya, yb) - sag, (a[2] + b[2]) / 2];
      wires.push(a[0], a[1], a[2], m[0], m[1], m[2], m[0], m[1], m[2], b[0], b[1], b[2]);
    }
    for (let t = 6; t < len - 4; t += 11) {
      if (rand() < 0.5) continue;
      signs.push({ x: alongX ? x0 + t : at, y: 4.6 + rand() * 3, z: alongX ? at : z0 + t, rotY: alongX ? Math.PI / 2 : 0, w: aw * 0.8, h: 1.1, color: signColor(rand), kind: 'tag' });
    }
    if (rand() < 0.5) vents.push({ x: alongX ? x0 + rand() * len : at + (rand() - 0.5) * 1.5, z: alongX ? at + (rand() - 0.5) * 1.5 : z0 + rand() * len });
  };

  /** Pack a lot (or a merged superblock) edge to edge, half the time cut by an alley. */
  const buildLot = (r: Rect, pull: number, storefronts: boolean) => {
    const parts: Rect[] = [];
    if (r.w >= 20 && r.d >= 20 && rand() < 0.5) {
      const alongX = rand() < 0.5;
      const aw = 3.5 + rand() * 1.5;
      if (alongX) {
        const at = r.z + (rand() - 0.5) * (r.d - 14);
        const zl = r.z - r.d / 2, zh = r.z + r.d / 2;
        parts.push({ x: r.x, z: (zl + at - aw / 2) / 2, w: r.w, d: at - aw / 2 - zl });
        parts.push({ x: r.x, z: (at + aw / 2 + zh) / 2, w: r.w, d: zh - at - aw / 2 });
        alley(r, true, at, aw);
      } else {
        const at = r.x + (rand() - 0.5) * (r.w - 14);
        const xl = r.x - r.w / 2, xh = r.x + r.w / 2;
        parts.push({ x: (xl + at - aw / 2) / 2, z: r.z, w: at - aw / 2 - xl, d: r.d });
        parts.push({ x: (at + aw / 2 + xh) / 2, z: r.z, w: xh - at - aw / 2, d: r.d });
        alley(r, false, at, aw);
      }
    } else parts.push(r);
    for (const part of parts) {
      const cells: Rect[] = [];
      partition(part, 5, 11 + rand() * 5, cells);
      for (const c of cells) building(c, pull, storefronts);
    }
  };

  // -- the map: avenues, reserved features, merged superblocks --------------
  const reserved = new Map<string, string>();
  const key = (bx: number, bz: number) => `${bx}:${bz}`;
  for (const [bx, bz] of [[-5, 3], [-4, 3], [-5, 4], [-4, 4]]) reserved.set(key(bx, bz), 'stadium');
  reserved.set(key(-6, 4), 'wheel');
  for (const [bx, bz] of [[3, -3], [4, -3], [3, -4], [4, -4]]) reserved.set(key(bx, bz), 'mega');
  for (const [bx, bz] of [[-3, -6], [5, 2], [-6, -2]]) reserved.set(key(bx, bz), 'temple');
  for (let bx = 8; bx <= 10; bx++) for (let bz = -10; bz <= -8; bz++) reserved.set(key(bx, bz), 'industry');
  reserved.set(key(LANDMARK_BLOCK.bx, LANDMARK_BLOCK.bz), 'landmark');
  // closed street segments: a north–south street line i closed alongside
  // block row j (closedZ), an east–west line i closed alongside column j (closedX)
  const closedZ = new Set<string>();
  const closedX = new Set<string>();
  closedZ.add('-5:3'); closedZ.add('-5:4'); closedX.add('3:-5'); closedX.add('3:-4'); // the stadium
  closedZ.add('3:-3'); closedZ.add('3:-4'); closedX.add('-4:3'); closedX.add('-4:4'); // the megastructure
  const merged = new Map<string, 'x' | 'z'>(); // the first block of a merged pair → merge axis
  const swallowed = new Set<string>();
  const ordinary = (bx: number, bz: number) =>
    bx !== 0 && bz !== 0 && Math.max(Math.abs(bx), Math.abs(bz)) <= HALF && !reserved.has(key(bx, bz)) && !merged.has(key(bx, bz)) && !swallowed.has(key(bx, bz));
  for (let bx = -HALF; bx <= HALF; bx++) {
    for (let bz = -HALF; bz <= HALF; bz++) {
      if (!ordinary(bx, bz)) continue;
      if (bx + 1 !== 0 && ordinary(bx + 1, bz) && rand() < 0.13) {
        merged.set(key(bx, bz), 'x'); swallowed.add(key(bx + 1, bz)); closedZ.add(`${bx}:${bz}`);
      } else if (bz + 1 !== 0 && ordinary(bx, bz + 1) && rand() < 0.1) {
        merged.set(key(bx, bz), 'z'); swallowed.add(key(bx, bz + 1)); closedX.add(`${bz}:${bx}`);
      }
    }
  }
  // -- the interchanges: at one column west and one east of the plaza the
  // highway sheds an off-ramp and takes an on-ramp on each side (owner: a
  // highway cut by smaller roads, not a generic slab) — each ramp falls
  // 65 units along the deck to a T on the north–south street below ---------
  const openZ = (i: number, j: number) => !closedZ.has(`${i}:${j}`);
  const openX = (i: number, j: number) => !closedX.has(`${i}:${j}`);
  const onStreet = (t: number) => Math.abs(((t % G) + G) % G - G / 2) < STREET / 2 + 2.5;
  {
    const hx = HIGHWAY.x1 - HIGHWAY.x0, hz = HIGHWAY.z1 - HIGHWAY.z0;
    const hlen = Math.hypot(hx, hz);
    const nx = -hz / hlen, nz = hx / hlen; // the deck's left normal — the eastbound lanes ride this side
    const zH = (x: number) => HIGHWAY.z0 + (x - HIGHWAY.x0) * hz / hx;
    const ramp = (ax: number, ay: number, az: number, bx: number, by: number, bz: number): Street => {
      const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
      return { x0: ax, z0: az, dx: dx / len, dz: dz / len, len, y: ay, y1: by, kind: 'ramp', width: RAMP_W, oneWay: true };
    };
    const fits = (i: number): boolean => {
      const X = streetAt(i), z = zH(X);
      for (const off of [-24.6, -16.6, 16.6, 24.6]) if (onStreet(z + off)) return false;
      const j0 = Math.round((z - 24.6) / G), j1 = Math.round((z + 24.6) / G);
      for (let j = j0; j <= j1; j++) if (!openZ(i, j)) return false;
      return Math.abs(X) + 70 < EXT;
    };
    for (const side of [[-4, -3, -5, -2], [2, 3, 1, 4]]) {
      const i = side.find(fits);
      if (i === undefined) continue;
      const X = streetAt(i), z = zH(X), top = HIGHWAY.y + 0.4;
      const edge = (x: number, s: number) => ({ x: x + nx * 11 * s, z: zH(x) + nz * 11 * s });
      const a = edge(X - 67, 1), b = edge(X + 67, 1), c = edge(X + 67, -1), d = edge(X - 67, -1);
      ramps.push(ramp(a.x, top, a.z, X, 0, z + 16.6)); // eastbound off
      ramps.push(ramp(X, 0, z + 24.6, b.x, top, b.z)); // eastbound on
      ramps.push(ramp(c.x, top, c.z, X, 0, z - 16.6)); // westbound off
      ramps.push(ramp(X, 0, z - 24.6, d.x, top, d.z)); // westbound on
    }
  }
  const pullAt = (bx: number, bz: number) =>
    Math.max(0, 1 - (Math.abs(bx) + Math.abs(bz)) / (HALF * 1.5)) + 0.75 * Math.exp(-(((bx - 4) ** 2 + (bz + 4) ** 2) / 5));

  // -- the main city ---------------------------------------------------------
  for (let bx = -HALF; bx <= HALF; bx++) {
    for (let bz = -HALF; bz <= HALF; bz++) {
      if (bx === 0 || bz === 0) continue; // the avenues
      const k = key(bx, bz);
      if (reserved.has(k) || swallowed.has(k)) continue;
      const m = merged.get(k);
      const rect: Rect = m === 'x'
        ? { x: bx * G + G / 2, z: bz * G, w: 2 * LOT + STREET, d: LOT }
        : m === 'z' ? { x: bx * G, z: bz * G + G / 2, w: LOT, d: 2 * LOT + STREET }
        : { x: bx * G, z: bz * G, w: LOT, d: LOT };
      buildLot(rect, pullAt(bx, bz), true);
    }
  }
  // -- the outer ring: past the fence, still finished ------------------------
  bucket = outer; rich = false;
  for (let bx = -HALF - OUTER; bx <= HALF + OUTER; bx++) {
    for (let bz = -HALF - OUTER; bz <= HALF + OUTER; bz++) {
      if (Math.max(Math.abs(bx), Math.abs(bz)) <= HALF) continue;
      if (bx === 0 || bz === 0) continue; // the avenues run on out of town
      if (reserved.has(key(bx, bz))) continue;
      buildLot({ x: bx * G, z: bz * G, w: LOT, d: LOT }, 0.05 + rand() * 0.1, false);
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

  // -- the stadium, the wheel, the megastructure, the temples, the industry ----
  const sx0 = streetAt(-5), sz0 = streetAt(3);
  const stadium = {
    x: sx0, z: sz0, w: 58, d: 44, h: 13,
    masts: [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => ({ x: sx0 + a * 27, z: sz0 + b * 20, h: 24 })),
  };
  grid.add({ x: stadium.x, y: stadium.h / 2, z: stadium.z, w: stadium.w, h: stadium.h, d: stadium.d });
  for (const m of stadium.masts) solid(core, 'dark', 'street', 0, m.x, m.h / 2, m.z, 0.9, m.h, 0.9);
  signs.push({ x: sx0, y: 15.5, z: sz0 - stadium.d / 2 - 0.4, rotY: Math.PI, w: 22, h: 4, color: '#5df2ff', kind: 'screen' });
  const wheel = { x: -6 * G, y: 14.5, z: 4 * G, r: 11.5 }; // fits its lot: no overhang onto the streets
  grid.add({ x: wheel.x, y: wheel.y, z: wheel.z, w: 3, h: 25, d: 25 });
  for (const s of [-1, 1]) solid(core, 'dark', 'street', 0, wheel.x + s * 4, 7.25, wheel.z, 1.6, 14.5, 1.6);
  const mgx = streetAt(3), mgz = streetAt(-4);
  solid(core, 'facade', 'mega', MEGA_TEX, mgx, 22, mgz, 60, 44, 60);
  solid(core, 'facade', 'mega', MEGA_TEX, mgx + 4, 59, mgz - 3, 44, 30, 44);
  solid(core, 'facade', 'mega', MEGA_TEX, mgx + 7, 88, mgz - 6, 28, 28, 28);
  for (let i = 0; i < 4; i++) solid(core, 'spire', 'mega', 0, mgx + 7 + (i % 2 ? 8 : -8), 102 + 7, mgz - 6 + (i < 2 ? 8 : -8), 0.9, 14, 0.9);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) leds.push({ x: mgx + a * 30, y: 22, z: mgz + b * 30, w: 0.28, h: 43, d: 0.28, color: '#5df2ff' });
  signs.push({ x: mgx - 30.3, y: 24, z: mgz + 6, rotY: -Math.PI / 2, w: 26, h: 14, color: '#ffffff', kind: 'screen' });
  signs.push({ x: mgx - 8, y: 24, z: mgz + 30.3, rotY: 0, w: 26, h: 14, color: '#ffffff', kind: 'screen' });
  const mega = { x: mgx, z: mgz, top: 116 };
  holos.push({ x: mgx + 7, y: 140, z: mgz - 6, w: 34, h: 50, rotY: 0.6 });
  holos.push({ x: -60, y: 84, z: 64, w: 22, h: 36, rotY: -0.4 });
  holos.push({ x: sx0, y: 46, z: sz0, w: 26, h: 26, rotY: 1.1 });
  const temple = (cx: number, cz: number) => {
    for (let k = 0; k < 3; k++) {
      const fw = 13 - 3 * k, fd = 11 - 2.5 * k, y = k * 5.6;
      solid(core, 'facade', 'temple', texOf((s) => s.win === 'wide'), cx, y + 1.8, cz, fw, 3.6, fd);
      solid(core, 'pyr', 'temple', 0, cx, y + 3.6 + 1.1, cz, fw + 2.4, 2.2, fd + 2.4);
      const ey = y + 3.7;
      strips.push({ x: cx, y: ey, z: cz + fd / 2 + 1.2, w: fw + 2.4, h: 0.18, d: 0.18, color: '#ffb36b' });
      strips.push({ x: cx, y: ey, z: cz - fd / 2 - 1.2, w: fw + 2.4, h: 0.18, d: 0.18, color: '#ffb36b' });
      strips.push({ x: cx + fw / 2 + 1.2, y: ey, z: cz, w: 0.18, h: 0.18, d: fd + 2.4, color: '#ffb36b' });
      strips.push({ x: cx - fw / 2 - 1.2, y: ey, z: cz, w: 0.18, h: 0.18, d: fd + 2.4, color: '#ffb36b' });
    }
    solid(core, 'spire', 'temple', 0, cx, 16.8 + 2.5, cz, 0.5, 5, 0.5);
    for (let i = 0; i < 8; i++) lantern(cx + (rand() - 0.5) * 20, 2.4, cz + (rand() - 0.5) * 20);
    pois.push({ x: cx, y: 10, z: cz, w: 1.3 });
  };
  const pois: Poi[] = [{ x: lmx, y: landmark.top * 0.62, z: lmz, w: 3 }];
  for (const [bx, bz] of [[-3, -6], [5, 2], [-6, -2]]) temple(bx * G, bz * G);
  bucket = outer;
  for (let bx = 8; bx <= 10; bx++) {
    for (let bz = -10; bz <= -8; bz++) {
      const cx = bx * G, cz = bz * G;
      const a = rand();
      if (a < 0.4) { // tank farm
        for (const [ox, oz] of [[-6, -6], [6, 6], [6, -6]]) {
          solid(outer, 'cyl', 'industry', 0, cx + ox, 4.5, cz + oz, 11, 9, 11);
          for (let i = 0; i < 10; i++) { const t = (i / 10) * Math.PI * 2; lantern(cx + ox + Math.cos(t) * 5.6, 9.3, cz + oz + Math.sin(t) * 5.6); }
        }
        solid(outer, 'dark', 'bits', 0, cx, 3.2, cz, 22, 0.5, 0.5);
      } else if (a < 0.7) { // stacks and a plant
        solid(outer, 'facade', 'industry', texOf((s) => s.win === 'ribbon'), cx, 4, cz, 20, 8, 14);
        for (let i = 0; i < 2; i++) {
          const x = cx - 6 + i * 12, z = cz + 9;
          solid(outer, 'cyl', 'industry', 0, x, 18, z, 2.4, 36, 2.4);
          stacks.push({ x, z, top: 36 });
        }
      } else { // a crane yard
        solid(outer, 'dark', 'industry', 0, cx - 5, 16, cz, 1.4, 32, 1.4);
        solid(outer, 'dark', 'industry', 0, cx + 4, 31.5, cz, 20, 0.9, 1.2);
        lantern(cx + 13, 32.2, cz);
        solid(outer, 'facade', 'industry', texOf((s) => s.win === 'ribbon'), cx + 2, 3, cz - 8, 18, 6, 6);
      }
      for (let i = 0; i < 4; i++) lantern(cx + (rand() - 0.5) * 22, 4.5, cz + (rand() - 0.5) * 22);
    }
  }
  bucket = core;

  // -- the avenues: the canal (bridges at every crossing, quay lamps), the
  // tree-lined avenue (trees, lamps, gantries, footbridges); the plaza market --
  // the cross-streets cut through the medians: no tree or lamp on a crossing
  const tree = (x: number, z: number) => {
    const h = 3.6 + rand() * 2;
    solid(core, 'dark', 'street', 0, x, 0.8, z, 0.34, 1.6, 0.34);
    solid(core, 'tree', 'street', 0, x, 1.6 + h / 2, z, 2.2 + rand() * 1.2, h, 2.2 + rand() * 1.2);
  };
  for (let t = -REACH; t <= REACH; t += 7) {
    if (Math.abs(t) < 30 || onStreet(t)) continue; // the plaza, the crossings
    tree(t, -7.5); tree(t, 7.5);
    if (Math.round(t / 7) % 2 === 0) posts.push({ x: t, z: 0, h: 6 });
  }
  const bridges: { z: number }[] = [];
  for (let j = -HALF - OUTER - 1; j <= HALF + OUTER; j++) {
    const z = streetAt(j);
    bridges.push({ z });
    solid(core, 'dark', 'bridge', 0, 0, CANAL.deck, z, CANAL.w + 2, 0.5, 12);
  }
  for (let t = -REACH; t <= REACH; t += 9) {
    if (Math.abs(t) < 30 || onStreet(t)) continue;
    if (Math.round(t / 9) % 2 === 0) { posts.push({ x: -10.6, z: t, h: 5.5 }); posts.push({ x: 10.6, z: t, h: 5.5 }); }
    else { lantern(-10.2, 2.6, t); lantern(10.2, 2.6, t); }
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
  for (const k of [-5, -2, 2, 5]) { // footbridges over the tree-lined avenue
    const x = k * G;
    solid(core, 'dark', 'bridge', 0, x, 9.5, 0, 3, 0.5, 56);
    for (const s of [-1, 1]) solid(core, 'dark', 'street', 0, x, 4.75, s * 27, 0.6, 9.5, 0.6);
    for (let z = -26; z <= 26; z += 4) lantern(x + 1.6, 10.4, z);
  }
  solid(core, 'cyl', 'street', 0, 0, 0.25, 0, 30, 0.5, 30); // the plaza's disc
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    posts.push({ x: Math.cos(a) * 17, z: Math.sin(a) * 17, h: 7 });
  }
  // the night market: two rows of stalls down the tree-lined avenue's
  // median either side of the plaza (never on a road, never on the water)
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      for (const sz of [-1, 1]) {
        const x = sx * (29 + i * 3.4), z = sz * 3.3;
        stalls.push({ x, z, color: signColor(rand) });
        for (const [ox, oz] of [[-1.3, -1.1], [1.3, -1.1], [-1.3, 1.1], [1.3, 1.1]]) solid(core, 'dark', 'street', 0, x + ox, 1.2, z + oz, 0.14, 2.4, 0.14);
        grid.add({ x, y: 2.9, z, w: 3.2, h: 1.2, d: 2.6 });
        lantern(x, 2.2, z);
      }
    }
  }

  // -- the elevated highway and the diagonal boulevard ------------------------
  {
    const hx = HIGHWAY.x1 - HIGHWAY.x0, hz = HIGHWAY.z1 - HIGHWAY.z0;
    const len = Math.hypot(hx, hz);
    const dx = hx / len, dz = hz / len;
    streets.push({ x0: HIGHWAY.x0, z0: HIGHWAY.z0, dx, dz, len, y: HIGHWAY.y + 0.4, kind: 'highway', width: HIGHWAY.width });
    for (let t = 0; t <= len; t += 10) { // the deck, as a chain of solids the flight respects
      const x = HIGHWAY.x0 + dx * t, z = HIGHWAY.z0 + dz * t;
      grid.add({ x, y: HIGHWAY.y, z, w: 12 + Math.abs(dz) * 8, h: 0.8, d: 14 + Math.abs(dx) * 2 });
      if (t % 20 === 0 && !onStreet(x) && !onStreet(z) && Math.abs(x) < REACH && Math.abs(z) < REACH) {
        solid(core, 'dark', 'street', 0, x, HIGHWAY.y / 2 - 0.4, z, 1.4, HIGHWAY.y - 0.8, 1.4);
      }
      if (t % 30 === 0 && Math.abs(x) < REACH) posts.push({ x, z, h: 6, y: HIGHWAY.y + 0.4 }); // median lamps up the deck
      if (t % 110 === 50 && Math.abs(x) < EXT) { // an overhead sign gantry across the deck
        signs.push({ x, y: HIGHWAY.y + 6.6, z, rotY: Math.atan2(dx, dz) + Math.PI / 2, w: 12, h: 2.4, color: signColor(rand), kind: 'gantry' });
        for (const s of [-1, 1]) solid(core, 'dark', 'street', 0, x - dz * s * 7.2, HIGHWAY.y + 4, z + dx * s * 7.2, 0.36, 8, 0.36);
      }
    }
    for (const r of ramps) {
      streets.push(r);
      for (let t = 0; t <= r.len; t += 4) { // the ramp's deck, as a chain of solids
        const x = r.x0 + r.dx * t, z = r.z0 + r.dz * t, y = rampY(r, t);
        grid.add({ x, y, z, w: 5 + Math.abs(r.dz) * 4, h: 0.8, d: 5 + Math.abs(r.dx) * 4 });
        if (t % 12 === 0 && y > 3.5 && !onStreet(x) && !onStreet(z)) solid(core, 'dark', 'street', 0, x, y / 2 - 0.4, z, 1.2, y - 0.8, 1.2);
        if (t % 16 === 8) posts.push({ x: x - r.dz * 3.4, z: z + r.dx * 3.4, h: 4.5, y });
      }
    }
    const gx = DIAGONAL.x1 - DIAGONAL.x0, gz = DIAGONAL.z1 - DIAGONAL.z0;
    const glen = Math.hypot(gx, gz);
    const gdx = gx / glen, gdz = gz / glen;
    streets.push({ x0: DIAGONAL.x0, z0: DIAGONAL.z0, dx: gdx, dz: gdz, len: glen, y: 0, kind: 'diagonal', width: DIAGONAL.width });
    for (let t = 6; t < glen; t += 12) {
      const x = DIAGONAL.x0 + gdx * t, z = DIAGONAL.z0 + gdz * t;
      if (onStreet(x) || onStreet(z)) continue;
      for (const s of [-1, 1]) posts.push({ x: x - gdz * s * 7, z: z + gdx * s * 7, h: 5.5 });
    }
  }

  // -- the streets: open runs between closed segments, lamps on every kerb,
  // corner kiosks; skybridges between neighbouring towers ---------------------
  const roads: { axis: 'x' | 'z'; at: number; from: number; to: number }[] = [];
  for (let i = -HALF - OUTER - 1; i <= HALF + OUTER; i++) {
    for (const axis of ['x', 'z'] as const) {
      let start: number | null = null;
      for (let j = -HALF - OUTER; j <= HALF + OUTER + 1; j++) {
        const open = j <= HALF + OUTER && (axis === 'x' ? openX(i, j) : openZ(i, j));
        if (open && start === null) start = j;
        if (!open && start !== null) {
          roads.push({ axis, at: streetAt(i), from: (start - 0.5) * G, to: (j - 0.5) * G });
          start = null;
        }
      }
    }
  }
  for (const r of roads) {
    streets.push(r.axis === 'x'
      ? { x0: r.from, z0: r.at, dx: 1, dz: 0, len: r.to - r.from, y: 0, kind: 'road', width: STREET }
      : { x0: r.at, z0: r.from, dx: 0, dz: 1, len: r.to - r.from, y: 0, kind: 'road', width: STREET });
    for (let t = r.from + 6; t <= r.to - 6; t += 12) {
      for (const s of [-1, 1]) {
        const off = r.at + s * (ROAD / 2 + 1);
        const x = r.axis === 'x' ? t : off, z = r.axis === 'x' ? off : t;
        if (Math.abs(x) < 30 && Math.abs(z) < 30) continue; // the plaza has its ring
        if (Math.abs(x) < MEDIAN + 1 && r.axis === 'x') continue; // the canal has its quays
        posts.push({ x, z, h: 5.5 });
      }
    }
  }
  streets.push({ x0: 0, z0: -REACH, dx: 0, dz: 1, len: 2 * REACH, y: 0.3, kind: 'canal', width: CANAL.w });
  for (let i = -HALF - 1; i <= HALF; i++) {
    for (let j = -HALF - 1; j <= HALF; j++) {
      if (rand() > 0.3) continue;
      const sx = rand() < 0.5 ? -1 : 1, sz = rand() < 0.5 ? -1 : 1;
      const x = streetAt(i) + sx * 8.6, z = streetAt(j) + sz * 8.6;
      if (Math.abs(x) < MEDIAN + 2 || Math.abs(z) < MEDIAN + 2) continue;
      if (lineDist(x, z, DIAGONAL.x0, DIAGONAL.z0, DIAGONAL.x1, DIAGONAL.z1) < 9) continue;
      solid(core, 'dark', 'street', 0, x, 1.2, z, 2.2, 2.4, 1.6);
      signs.push({ x, y: 1.5, z: z - sz * 0.85, rotY: sz > 0 ? Math.PI : 0, w: 1.8, h: 1.3, color: signColor(rand), kind: 'tag' });
    }
  }
  tall.sort((a, b) => b.top - a.top);
  let bridged = 0;
  for (let i = 0; i < tall.length && bridged < 44; i++) {
    for (let j = i + 1; j < tall.length && bridged < 44; j++) {
      const a = tall[i], b = tall[j];
      if (a.bridges > 1 || b.bridges > 1) continue;
      const gx = Math.abs(a.x - b.x) - (a.w + b.w) / 2, gz = Math.abs(a.z - b.z) - (a.d + b.d) / 2;
      const lowTop = Math.min(a.top, b.top);
      let y = lowTop * (0.42 + rand() * 0.3);
      const acrossX = gx >= 4 && gx <= 16 && Math.abs(a.z - b.z) < (a.d + b.d) / 2 - 3;
      const acrossZ = !acrossX && gz >= 4 && gz <= 16 && Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 3;
      if ((acrossX ? gx : acrossZ ? gz : 0) >= 12) { // spanning a street: above the auto-flight's canyon band
        y = Math.max(y, 36);
        if (y > lowTop - 5) continue;
      }
      if (acrossX) {
        const x = (a.x + b.x) / 2 + (a.x < b.x ? (a.w - b.w) / 4 : (b.w - a.w) / 4);
        const z = (a.z + b.z) / 2;
        solid(core, 'facade', 'bridge', texOf((s) => s.win === 'curtain'), x, y, z, gx + 0.6, 2.4, 3);
        strips.push({ x, y: y + 1.35, z, w: gx, h: 0.16, d: 0.16, color: '#7de8ff' });
      } else if (acrossZ) {
        const z = (a.z + b.z) / 2 + (a.z < b.z ? (a.d - b.d) / 4 : (b.d - a.d) / 4);
        const x = (a.x + b.x) / 2;
        solid(core, 'facade', 'bridge', texOf((s) => s.win === 'curtain'), x, y, z, 3, 2.4, gz + 0.6);
        strips.push({ x, y: y + 1.35, z, w: 0.16, h: 0.16, d: gz, color: '#7de8ff' });
      } else continue;
      a.bridges += 1; b.bridges += 1; bridged += 1;
    }
  }

  // -- the giant screens, beacons, points of interest ------------------------
  for (const t of tall.slice(0, 8)) {
    if (rand() < 0.75) {
      const w = Math.min(10, t.w * 0.9);
      const s = rand() < 0.5 ? 1 : -1;
      signs.push({ x: t.x, y: t.top * 0.42, z: t.z + s * (t.d / 2 + 0.25), rotY: s > 0 ? 0 : Math.PI, w, h: w * 0.6, color: '#ffffff', kind: 'screen' });
      pois.push({ x: t.x, y: t.top * 0.42, z: t.z, w: 1.6 });
    }
  }
  for (const t of tall.slice(0, 14)) pois.push({ x: t.x, y: t.top * 0.6, z: t.z, w: 1 + t.top / 100 });
  pois.push({ x: stadium.x, y: 14, z: stadium.z, w: 2.2 }, { x: wheel.x, y: wheel.y, z: wheel.z, w: 2 }, { x: mega.x, y: 62, z: mega.z, w: 2.6 });
  for (const h of holos) pois.push({ x: h.x, y: h.y, z: h.z, w: 1.5 });
  const beacons = [
    { x: lmx, y: landmark.top + 1.6, z: lmz },
    { x: mgx + 15, y: 118, z: mgz + 2 },
    ...stacks.map((s) => ({ x: s.x, y: s.top + 1.4, z: s.z })),
    ...tall.slice(0, 26).map((t) => ({ x: t.x, y: t.top + 1.8, z: t.z })),
  ];

  // -- the sprawl: past the outer ring, massing for the fog ------------------
  const clusters = [0, 1, 2].map(() => {
    const a = rand() * Math.PI * 2, r = 520 + rand() * 380;
    return { x: Math.cos(a) * r, z: Math.sin(a) * r, s: 60 + rand() * 80 };
  });
  const inLot = (c: number, size: number) => c + (rand() - 0.5) * Math.max(0, LOT - size);
  for (let bx = -FAR; bx <= FAR; bx++) {
    for (let bz = -FAR; bz <= FAR; bz++) {
      if (Math.max(Math.abs(bx), Math.abs(bz)) <= HALF + OUTER) continue;
      if (rand() < 0.2) continue;
      const cx = bx * G, cz = bz * G;
      let boost = 0;
      for (const c of clusters) boost += Math.exp(-((cx - c.x) ** 2 + (cz - c.z) ** 2) / (2 * c.s * c.s));
      const n = 1 + (rand() < 0.7 ? 1 : 0) + (rand() < 0.3 ? 1 : 0);
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

  /** Street left ahead of `from` on the travel axis at street `at`: to the
   *  first closed segment, or the fence. */
  const roomAhead = (axis: 'x' | 'z', at: number, from: number, dir: 1 | -1): number => {
    const i = Math.round(at / G - 0.5);
    const fence = dir > 0 ? EXT - 24 - from : from + EXT - 24;
    let j = Math.round(from / G);
    let room = fence;
    for (let n = 0; n < 40; n++, j += dir) {
      const open = axis === 'x' ? openX(i, j) : openZ(i, j);
      if (!open) {
        const edge = dir > 0 ? (j - 0.5) * G : (j + 0.5) * G;
        room = Math.min(room, dir > 0 ? edge - from : from - edge);
        break;
      }
    }
    return Math.max(0, room);
  };

  return {
    core, outer, sprawl, strips, leds, awnings, signs, posts, lanterns, wires, vents, holos, stalls, sprawlLamps, neon,
    beacons, pois, streets, stadium, wheel, mega, stacks, bridges, styles, sprawlTex, grid, landmark, roomAhead,
  };
}

/** AUTO — an endless, never-repeating drift. A cubic Hermite chain grows
 *  ahead of the camera one knot at a time; every knot carries its own
 *  tangent, so a leg is FINAL the moment its far knot is proposed and can be
 *  sampled against the solids (and the fence) right then — rejected knots are
 *  re-proposed, never flown. (A Catmull-Rom chain can't do this: a leg's
 *  shape keeps changing until the knot after its end exists, so validation
 *  lands one step too late to fix the real culprit.) Every leg is flown by
 *  ARC LENGTH — a table of cumulative lengths inverts the parameter — so
 *  the camera moves at one steady pace, never surging out of a knot (owner:
 *  the jitter). The flight alternates rooftop cruises with dives that
 *  arrive aligned to a real street, canyon runs down its centre, climbs
 *  back out, ORBITS around a landmark with the eye held on it, and long
 *  low FLYOVERS down the avenues (owner: cinematic, around the city). */
export type Phase = 'cruise' | 'dive' | 'canyon' | 'climb' | 'orbit' | 'flyover';
interface Orbit { x: number; z: number; y: number; r: number; a: number; da: number; focus: Poi }
interface FlightState {
  phase: Phase; left: number; heading: number; axis: 'x' | 'z'; dir: 1 | -1; street: number; avenue: boolean; orbit: Orbit | null;
  /** Cruise legs still to fly before another orbit may start. */
  cool: number;
  /** Dives refused in a row — the next choice insists on a street. */
  retry: number;
}
interface Knot { p: Vector3; t: Vector3; phase: Phase; focus: Poi | null; k: number }
/** A proposed knot: the leg into it flies as the given phase; `k` scales
 *  its tangent by the chord (an orbit leg is a circular arc — its Hermite
 *  wants tangents about a chord long; everything else stays flatter). */
interface Proposal { p: Vector3; dir: Vector3; dive: boolean; phase: Phase; focus?: Poi; k?: number }
export type RoomFn = (axis: 'x' | 'z', at: number, from: number, dir: 1 | -1) => number;
const ARC = 48; // samples per leg in the arc-length table
const LOOK_AHEAD = 26; // the look point runs this far ahead along the path

export class AutoFlight {
  readonly knots: Knot[] = [];
  dives = 0;
  orbits = 0;
  flyovers = 0;
  fallbacks = 0;
  /** Counts up each time the camera enters a new leg — the cinematographer's cue. */
  legId = 0;
  private seg = 0;
  private s = 0; // arc distance into the current leg
  private segLen = 1;
  private tab = new Float32Array(ARC + 1);
  private tabNext = new Float32Array(ARC + 1);
  private st: FlightState;
  private readonly tmp = new Vector3();
  private readonly tmp2 = new Vector3();
  private readonly room: RoomFn;
  private readonly pois: Poi[];

  constructor(private grid: CollisionGrid, private rand: () => number, start: Vector3, heading: number, room?: RoomFn, pois: Poi[] = []) {
    this.room = room ?? ((_axis, _at, from, dir) => (dir > 0 ? EXT - 24 - from : from + EXT - 24));
    this.pois = pois.filter((p) => p.w >= 2);
    this.st = { phase: 'cruise', left: 1 + Math.floor(rand() * 3), heading, axis: 'x', dir: 1, street: G / 2, avenue: false, orbit: null, cool: 2, retry: 0 };
    this.knots.push({ p: start.clone(), t: new Vector3(Math.sin(heading), 0, Math.cos(heading)).multiplyScalar(30), phase: 'cruise', focus: null, k: 0.8 });
    this.ensure();
    this.measure();
  }

  /** The phase of the leg being flown. */
  get phase(): Phase { return this.knots[this.seg + 1]?.phase ?? 'cruise'; }
  /** What the leg being flown wants the eye on (an orbit's centre), if anything. */
  get focus(): Poi | null { return this.knots[this.seg + 1]?.focus ?? null; }

  /** Advance `dist` world units; writes the camera position and its look point. */
  step(dist: number, pos: Vector3, look: Vector3): void {
    this.s += dist;
    while (this.s >= this.segLen) {
      this.s -= this.segLen;
      this.seg += 1;
      this.legId += 1;
      this.trim();
      this.ensure();
      this.measure();
    }
    this.at(this.seg, this.tab, this.s, pos);
    const ahead = this.s + LOOK_AHEAD;
    if (ahead < this.segLen) this.at(this.seg, this.tab, ahead, look);
    else this.at(this.seg + 1, this.tabNext, Math.min(ahead - this.segLen, this.tabNext[ARC]), look);
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

  /** Leg i at arc distance s, through its table. */
  private at(i: number, tab: Float32Array, s: number, out: Vector3): void {
    let k = 0;
    while (k < ARC - 1 && tab[k + 1] < s) k += 1;
    const span = tab[k + 1] - tab[k];
    const u = (k + (span > 1e-6 ? clamp((s - tab[k]) / span, 0, 1) : 0)) / ARC;
    this.point(i, u, out);
  }

  private table(i: number, tab: Float32Array): void {
    tab[0] = 0;
    let prev = this.point(i, 0, new Vector3());
    for (let k = 1; k <= ARC; k++) {
      const p = this.point(i, k / ARC, new Vector3());
      tab[k] = tab[k - 1] + p.distanceTo(prev);
      prev = p;
    }
  }

  private trim(): void {
    while (this.seg > 1) { this.knots.shift(); this.seg -= 1; }
  }

  /** Legs `seg` and `seg + 1` (the look-ahead) must both exist. */
  private ensure(): void {
    while (this.knots.length < this.seg + 4) this.append(); // three legs: the third lets the second's far knot be re-sized
  }

  private measure(): void {
    this.table(this.seg, this.tab);
    this.table(this.seg + 1, this.tabNext);
    this.segLen = Math.max(1, this.tab[ARC]);
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
      const snap = { ...this.st, orbit: this.st.orbit ? { ...this.st.orbit } : null };
      if (tries >= 40) { // only a canyon is actually low; a dive not yet flown is still up in the air
        this.st.phase = this.st.phase === 'canyon' ? 'climb' : 'cruise'; this.st.left = 2; this.st.orbit = null; this.st.avenue = false;
      }
      const c = this.propose(last.p, last.t, tries, tries >= 40 ? 40 + this.rand() * 60 : undefined);
      if (this.push(last, c, c.phase)) { if (c.dive) this.dives += 1; return; }
      this.st = snap;
      // an orbit that meets a tower climbs over it; otherwise the heading
      // wanders (a cruise re-derives its own from the tangent it carries;
      // a dive reads the street from it)
      if (this.st.orbit) this.st.orbit.y += 9;
      else this.st.heading += (this.rand() - 0.5) * 2.4;
    }
    // last resort: straight up and onward — along the tangent we carry
    // (no hairpin), climbing hard over whatever hems us in
    this.fallbacks += 1;
    const on = new Vector3(last.t.x, 0, last.t.z);
    if (on.lengthSq() < 1) on.set(0, 0, 1);
    on.normalize();
    const p = last.p.clone().addScaledVector(on, 26);
    p.y = clamp(Math.max(last.p.y + 36, this.ceilingAlong(last.p, p) + 24), 30, 210);
    const dir = new Vector3(on.x * 0.5, 0.85, on.z * 0.5);
    if (!this.push(last, { p, dir, dive: false, phase: 'climb' }, 'climb')) {
      this.knots.push({ p, t: dir.normalize().multiplyScalar(20), phase: 'climb', focus: null, k: 0.8 }); // accepted regardless
    }
    this.st.phase = 'cruise'; this.st.left = 2; this.st.heading = Math.atan2(on.x, on.z); this.st.orbit = null; this.st.avenue = false;
  }

  private push(last: Knot, c: Proposal, phase: Phase): boolean {
    const chord = c.p.distanceTo(last.p);
    if (chord < 20) return false; // a stub leg under a long tangent loops — never flown
    // no doubling back: a leg that leaves against the tangent it inherits
    // (in plan — a drop can hide a reversal) bends through a near-cusp,
    // and the pace would sag in it; and no plunge: a leg never rises or
    // falls more than six tenths of its run
    const cx = c.p.x - last.p.x, cz = c.p.z - last.p.z, ch = Math.hypot(cx, cz);
    const th = Math.hypot(last.t.x, last.t.z);
    const dy = Math.abs(c.p.y - last.p.y);
    if (ch > dy && th > 1 && (last.t.x * cx + last.t.z * cz) < -0.2 * th * ch) return false; // (a mostly vertical leg may turn about)
    if (last.p.y - c.p.y > 0.6 * ch + 4) return false;
    c.dir.normalize();
    // a knot needs a RUNWAY: the next leg leaves along this tangent, so a
    // clear point hemmed in by towers would strand the flight
    for (let t = 3; t <= 18; t += 3) {
      const q = this.tmp.copy(c.p).addScaledVector(c.dir, t);
      if (Math.abs(q.x) > BOUND - 16 || Math.abs(q.z) > BOUND - 16 || q.y < 3 || q.y > 230 || this.grid.hit(q.x, q.y, q.z, FLY_PAD)) return false;
    }
    const k = c.k ?? 0.8; // tangents most of a chord long spread a bend over the leg instead of cornering at the knot
    this.knots.push({ p: c.p, t: c.dir.clone().multiplyScalar(chord * k), phase, focus: c.focus ?? null, k });
    const i = this.knots.length - 2; // the new leg's start knot
    if (!this.legClear(i)) { this.knots.pop(); return false; }
    // now that both of its neighbours are known, re-aim the start knot's
    // tangent from the one to the other and size it to the mean chord
    // (Catmull-Rom's rule), so neither the direction nor the pitch kinks
    // there — unless that knot ends the leg being flown, or the re-shaped
    // legs stop being clear
    if (i >= this.seg + 2 && i >= 1) {
      const prev = this.knots[i - 1];
      const prevChord = last.p.distanceTo(prev.p);
      const old = last.t.clone();
      const through = this.tmp2.subVectors(c.p, prev.p);
      if (through.lengthSq() > 1) {
        const len = ((last.k + k) / 2) * (prevChord + chord) / 2;
        last.t.copy(through).setLength(len);
        if (!this.legClear(i - 1) || !this.legClear(i)) {
          last.t.setLength(len * 0.5); // a shorter re-aim bulges less
          if (!this.legClear(i - 1) || !this.legClear(i)) last.t.copy(old);
        }
      }
    }
    return true;
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

  /** A knot landing in the outer band leans its tangent a little toward
   *  the plaza (never enough to oppose its own chord — that hairpins). */
  private bend(p: Vector3, dir: Vector3): Vector3 {
    const edge = Math.max(Math.abs(p.x), Math.abs(p.z));
    if (edge < EXT - 100) return dir;
    const h = Math.hypot(p.x, p.z) || 1;
    dir.x = dir.x * 0.7 - (p.x / h) * 0.3;
    dir.z = dir.z * 0.7 - (p.z / h) * 0.3;
    return dir;
  }

  /** Turn the cruise heading toward the plaza as the fence nears — a
   *  bounded turn per leg, so the path arcs back instead of reversing. */
  private steerHome(last: Vector3): void {
    const s = this.st;
    const edge = Math.max(Math.abs(last.x), Math.abs(last.z));
    if (edge < EXT - 170) return;
    const w = clamp((edge - (EXT - 170)) / 110, 0, 1);
    const home = Math.atan2(-last.x, -last.z);
    let d = home - s.heading;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    const turn = 0.4 + 0.8 * w; // at most 69° a leg: the guard against doubling back allows ~100°
    s.heading += clamp(d, -turn, turn) * (0.45 + 0.55 * w);
  }

  /** A landmark worth circling: ahead-ish, not too near, not too far. */
  private pickOrbit(last: Vector3, heading: number): Orbit | null {
    let best: Poi | null = null, bestScore = 0;
    const hx = Math.sin(heading), hz = Math.cos(heading);
    for (const p of this.pois) {
      const d = Math.hypot(p.x - last.x, p.z - last.z);
      if (d < 50 || d > 260) continue;
      if ((hx * (p.x - last.x) + hz * (p.z - last.z)) / d < 0.2) continue; // ahead of us, not behind
      // the whole circle must fit inside the fence
      if (Math.max(Math.abs(p.x), Math.abs(p.z)) + Math.max(48, p.w * 20) > EXT - 40) continue;
      const score = p.w * (1 - d / 300) * (0.5 + this.rand());
      if (score > bestScore) { best = p; bestScore = score; }
    }
    if (!best) return null;
    const r = Math.max(48, best.w * 20);
    const da = this.rand() < 0.5 ? 0.85 : -0.85;
    // land one step around the circle from the nearest point, so the leg
    // onto it is a real leg even when the flight is already at the rim
    const a = Math.atan2(last.x - best.x, last.z - best.z) + da;
    return { x: best.x, z: best.z, y: clamp(best.y * 0.9 + 16, 44, 190), r, a, da, focus: best };
  }

  private propose(last: Vector3, tan: Vector3, tries: number, forceY?: number): Proposal {
    const s = this.st;
    const r = this.rand;
    const streetDir = () => (s.axis === 'x' ? new Vector3(s.dir, 0, 0) : new Vector3(0, 0, s.dir));
    if (s.phase === 'orbit' && s.orbit) {
      const o = s.orbit;
      o.a += o.da;
      const p = new Vector3(o.x + Math.sin(o.a) * o.r, o.y, o.z + Math.cos(o.a) * o.r);
      const dir = new Vector3(Math.cos(o.a), 0, -Math.sin(o.a)).multiplyScalar(Math.sign(o.da));
      if (--s.left <= 0) { s.phase = 'cruise'; s.left = 1 + Math.floor(r() * 2); s.heading = Math.atan2(dir.x, dir.z); s.orbit = null; s.cool = 4; }
      return { p, dir, dive: false, phase: 'orbit', focus: o.focus, k: 1.0 };
    }
    if (s.phase === 'cruise') {
      // from the way we are actually going (the tangent we carry), a wander
      // of up to ±26°, then the fence's steering
      s.heading = Math.atan2(tan.x, tan.z) + (r() - 0.5) * 0.9;
      this.steerHome(last);
      const near = Math.max(Math.abs(last.x), Math.abs(last.z)) > EXT - 140;
      const dist = near ? 40 + r() * 40 : 55 + r() * 65; // shorter legs along the edge: finer turning
      const dir = new Vector3(Math.sin(s.heading), 0, Math.cos(s.heading));
      const p = new Vector3(last.x + dir.x * dist, 0, last.z + dir.z * dist);
      // never park a knot on the fence: the next leg's opening bulge would
      // have nowhere to go — turn harder for the plaza, and if that still
      // lands outside, stop short of the line
      if (Math.abs(p.x) > EXT - 40 || Math.abs(p.z) > EXT - 40) {
        p.x = clamp(p.x, -(EXT - 40), EXT - 40); p.z = clamp(p.z, -(EXT - 40), EXT - 40);
        dir.set(p.x - last.x, 0, p.z - last.z);
        if (dir.lengthSq() < 1) dir.set(Math.sin(s.heading), 0, Math.cos(s.heading));
        dir.normalize();
        s.heading = Math.atan2(dir.x, dir.z);
      }
      // ride the skyline: sometimes skimming the roofs, sometimes well above
      // — but never more than half the leg's length up or down in one leg
      const ceil = this.ceilingAlong(last, p);
      p.y = clamp(Math.max(ceil + 10 + (forceY ?? r() * 36), last.y + (r() - 0.5) * 50), 34, 210);
      p.y = clamp(Math.max(Math.min(p.y, last.y + dist * 0.5), last.y - dist * 0.5, ceil + 10), 34, 210);
      s.cool = Math.max(0, s.cool - 1);
      if (--s.left <= 0) {
        // what next: circle a landmark (now and then), run an avenue low
        // (when one is near), or — mostly — dive a street
        const a = s.retry > 0 && s.retry < 4 ? 1 : r(); // a refused dive is tried again elsewhere before anything else
        const orbit = a < 0.16 && s.cool === 0 && tries === 0 ? this.pickOrbit(p, s.heading) : null;
        if (orbit) {
          s.orbit = orbit; s.phase = 'orbit'; s.left = 3 + Math.floor(r() * 3); this.orbits += 1;
          // the first orbit leg lands on the circle where it is nearest
          p.set(orbit.x + Math.sin(orbit.a) * orbit.r, orbit.y, orbit.z + Math.cos(orbit.a) * orbit.r);
          dir.set(Math.cos(orbit.a), 0, -Math.sin(orbit.a)).multiplyScalar(Math.sign(orbit.da));
          return { p, dir, dive: false, phase: 'orbit', focus: orbit.focus, k: 0.8 };
        }
        const nearX = Math.abs(p.z) < 70, nearZ = Math.abs(p.x) < 70; // an avenue runs along x (z ≈ 0) or along z (x ≈ 0)
        if (a < 0.42 && (nearX || nearZ)) {
          s.phase = 'flyover'; s.avenue = true;
          s.axis = nearX && (!nearZ || r() < 0.5) ? 'x' : 'z';
          const along = s.axis === 'x' ? p.x : p.z;
          s.dir = along < 0 ? 1 : -1; // across the plaza and out the far side
          s.heading = s.axis === 'x' ? (s.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (s.dir > 0 ? 0 : Math.PI);
          this.flyovers += 1;
        } else { s.phase = 'dive'; s.avenue = false; }
      }
      return { p, dir: this.bend(p, dir), dive: false, phase: 'cruise' };
    }
    if (s.phase === 'dive' || s.phase === 'flyover') {
      if (!s.avenue) {
        const alongX = Math.abs(Math.sin(s.heading)) > Math.abs(Math.cos(s.heading));
        s.axis = alongX ? 'x' : 'z';
        s.dir = (alongX ? Math.sin(s.heading) : Math.cos(s.heading)) >= 0 ? 1 : -1;
        const perp = alongX ? last.z : last.x;
        s.street = clamp(Math.round((perp - G / 2) / G) * G + G / 2, -EXT + G / 2, EXT - G / 2);
      } else s.street = 0;
      const along = (s.axis === 'x' ? last.x : last.z) + s.dir * (60 + r() * 30);
      const p = s.axis === 'x' ? new Vector3(along, 0, s.street) : new Vector3(s.street, 0, along);
      const ceil = this.ceilingAlong(last, p);
      // the streets are only dived inside the main city, only where the
      // skyline is low enough to drop through, and only with enough OPEN
      // street ahead for the run AND the climb out before a closed segment
      // or the fence — otherwise cruise on and try elsewhere. The avenues
      // are open by construction: the flyover just needs room to the fence.
      const room = this.room(s.axis, s.street, along, s.dir);
      const perp = s.axis === 'x' ? last.z : last.x;
      if ((!s.avenue && ceil > 90) || room < 120 || Math.abs(perp) > EXT) {
        s.phase = 'cruise'; s.left = 1; s.avenue = false; s.retry += 1; // one more cruise leg, then try a street again
        return this.propose(last, tan, tries, forceY);
      }
      // (an avenue's own skyline is its gantries; the cell's ceiling would be
      // the landmark next door — the legs are validated regardless)
      p.y = s.avenue ? 36 + r() * 10 : Math.max(44 + r() * 14, ceil + 8);
      const phase: Phase = s.avenue ? 'flyover' : 'dive';
      const dist = s.dir * (along - (s.axis === 'x' ? last.x : last.z));
      if (last.y - p.y > dist * 0.5 && room > 220) { // room for this leg and the one after
        // too steep for one leg: a first leg brings the height down, still aligned with the street
        p.y = Math.max(last.y - dist * 0.5, ceil + 8);
        s.heading = s.axis === 'x' ? (s.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (s.dir > 0 ? 0 : Math.PI);
        const dir0 = streetDir(); dir0.y = -0.35;
        return { p, dir: dir0, dive: false, phase };
      }
      s.retry = 0;
      s.phase = 'canyon';
      s.left = s.avenue ? 3 + Math.floor(r() * 2) : Math.max(1, Math.min(2 + Math.floor(r() * 3), Math.floor((room - 100) / 70)));
      const dir = streetDir(); dir.y = -0.45; // nosing down, already aligned with the street
      return { p, dir, dive: !s.avenue, phase };
    }
    if (s.phase === 'canyon') {
      const along = (s.axis === 'x' ? last.x : last.z) + s.dir * (45 + r() * 25);
      if (Math.abs(along) > EXT - 110) { s.phase = 'climb'; return this.propose(last, tan, tries, forceY); } // the core ends: climb out while there is room
      // the dives stay above the street's life (owner: raise them), and a
      // canyon leg never falls more than half its run — the descent from the
      // dive knot is spread over the first legs
      const band = s.avenue ? 22 + r() * 12 : 20 + r() * 12;
      const y = Math.max(band, last.y - Math.abs(along - (s.axis === 'x' ? last.x : last.z)) * 0.5);
      const lat = s.street + (r() - 0.5) * 1.4;
      if (y <= band + 0.01 && --s.left <= 0) s.phase = 'climb';
      return { p: s.axis === 'x' ? new Vector3(along, y, lat) : new Vector3(lat, y, along), dir: streetDir(), dive: false, phase: 'canyon' };
    }
    // climb: out of the canyon, back to the rooftops, still heading along
    // the street — in two legs when the rise is steeper than half the run
    const from = s.axis === 'x' ? last.x : last.z;
    const along = clamp(from + s.dir * (60 + r() * 30), -(EXT - 40), EXT - 40);
    const run = Math.abs(along - from);
    let y = forceY ?? 64 + r() * 56;
    const split = y - last.y > run * 0.5 && Math.abs(along + s.dir * 80) < EXT - 40;
    if (split) y = last.y + run * 0.5;
    else { y = Math.min(y, last.y + run * 0.7); s.phase = 'cruise'; s.left = 2 + Math.floor(r() * 4); s.avenue = false; }
    s.heading = s.axis === 'x' ? (s.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (s.dir > 0 ? 0 : Math.PI);
    const dir = streetDir(); dir.y = 0.35;
    const p = s.axis === 'x' ? new Vector3(along, y, s.street) : new Vector3(s.street, y, along);
    return { p, dir: this.bend(p, dir), dive: false, phase: 'climb' };
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
