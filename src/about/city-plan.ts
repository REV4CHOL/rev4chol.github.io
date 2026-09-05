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
export const HIGHWAY = { x0: -400, z0: 210, x1: 400, z1: 80, y: 14, width: 17 }; // three lanes a side at a bus's width, parapets past them // the elevated highway across the north
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
  | 'tower' | 'slab' | 'cyl' | 'ziggurat' | 'twin' | 'cross' | 'needle' | 'podium' | 'low' | 'block'
  | 'oldtown' | 'landmark' | 'sprawl' | 'bits' | 'street' | 'bridge' | 'temple' | 'industry' | 'mega' | 'shanty'
  | 'annex' | 'over';
export interface Solid extends Box { kind: Kind; tex: number; arch: Arch }
export interface Strip extends Box { color: string }
export type SignKind = 'hang' | 'wall' | 'board' | 'tag' | 'roof' | 'gantry' | 'screen';
export interface Sign {
  x: number; y: number; z: number; rotY: number; w: number; h: number; color: string; kind: SignKind;
}
/** A catwalk is a raised walk (across an alley, along a facade as an arcade, a station platform): it carries
 *  its own `y`, only pedestrians use it. */
export type StreetKind = 'road' | 'highway' | 'canal' | 'alley' | 'diagonal' | 'ramp' | 'catwalk';
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
/** THE KIT (owner: a lived-in city, Ghost in the Shell): the small things crusted on every wall and roof — AC
 *  units, pipes, ducts, dishes, balcony rails, fire-escape ladders, water tanks and their legs, sign brackets,
 *  vending machines, bins, crates, phone booths, vent stacks, billboard frames. A box (w along the wall, h up,
 *  d out of it) turned by rotY, whose local +z is the wall's outward normal. Not solid to the camera (only
 *  the tanks are registered in the grid) — the walls they hang on are. */
export type ClutterKind = 'ac' | 'pipe' | 'duct' | 'dish' | 'rail' | 'escape' | 'tank' | 'bracket' | 'vend' | 'bin' | 'crate' | 'booth' | 'plant' | 'frame' | 'beam';
export interface Clutter { kind: ClutterKind; x: number; y: number; z: number; w: number; h: number; d: number; rotY: number; color?: string }
/** THE DISTRICTS (owner: not uniform): the HEIGHTS of slender supertalls beside the megastructure; the WALLED
 *  city south of it, fused into masses and bridged over its streets; the STRIP about the plaza, the avenues and
 *  the boulevard, where the signage is thickest; the OLD town in the north-west, low under pitched roofs and
 *  lanterns; MID everywhere else. */
export type District = 'heights' | 'walled' | 'strip' | 'old' | 'mid';
export interface Profile {
  name: District;
  /** The heights, before the block's jitter and the odd spike. */
  lo: number; hi: number;
  /** The odds a lot fuses its buildings into one mass (a seam, not a gutter); how many additions stack on a
   *  building; how thick the kit, the signage, the overbuilds over its streets, the arcades along its walls. */
  fuse: number; stack: number; kit: number; signs: number; over: number; arcade: number;
  /** The cell sizes a lot is cut into. */
  min: number; max: number;
}
export const DISTRICTS: Record<District, Profile> = {
  heights: { name: 'heights', lo: 50, hi: 125, fuse: 0.3, stack: 2, kit: 0.25, signs: 0.6, over: 0.1, arcade: 0.05, min: 6, max: 12 },
  walled: { name: 'walled', lo: 44, hi: 80, fuse: 0.9, stack: 3, kit: 1.0, signs: 1.0, over: 0.9, arcade: 0.35, min: 6, max: 14 }, // tall enough for the overbuilds to roof its streets
  strip: { name: 'strip', lo: 20, hi: 70, fuse: 0.5, stack: 2, kit: 0.7, signs: 1.2, over: 0.25, arcade: 0.3, min: 5, max: 16 },
  old: { name: 'old', lo: 8, hi: 24, fuse: 0.6, stack: 1, kit: 0.5, signs: 0.5, over: 0, arcade: 0.15, min: 4, max: 9 },
  mid: { name: 'mid', lo: 16, hi: 60, fuse: 0.5, stack: 2, kit: 0.6, signs: 0.8, over: 0.15, arcade: 0.2, min: 5, max: 16 },
};
export function districtOf(bx: number, bz: number): District {
  if (Math.abs(bx) === 1 || Math.abs(bz) === 1) return 'strip'; // about the plaza and along both avenues
  if (bx < 0 && bz < 0 && Math.abs(bx + bz + 7) <= 1) return 'strip'; // along the diagonal boulevard (x + z = −266: seven blocks)
  if (bx >= 2 && bx <= 6 && bz >= -3 && bz <= -2) return 'heights';
  if (bx >= 1 && bx <= 6 && bz >= -7 && bz <= -4) return 'walled';
  if (bx <= -2 && bz >= 2) return 'old';
  return 'mid';
}
/** A block's own hand in the heights: 0.7–1.3, from its coordinates alone. */
export function blockJitter(bx: number, bz: number): number {
  let h = ((bx + 64) * 73856093) ^ ((bz + 64) * 19349663);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = (h ^ (h >>> 16)) >>> 0;
  return 0.7 + ((h % 1000) / 1000) * 0.6;
}
/** A corridor for the flying traffic: a polyline (closed when `loop`),
 *  every point lifted clear of the skyline under the legs it joins. */
export interface AirLane { pts: [number, number, number][]; loop: boolean; speed: number; kind: 'avenue' | 'ring' | 'patrol' }
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
  /** Tarpaulins over the shacks and the stalls, the washing on the balconies — lit dim, in their own colours. */
  tarps: Strip[];
  /** The kit on the walls and the roofs (see Clutter). */
  clutter: Clutter[];
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
  stadium: {
    x: number; z: number; w: number; d: number; h: number; masts: { x: number; z: number; h: number }[];
    /** The four lit gates on the bowl's rim, with the yaw of a board facing out. */
    gates: { x: number; z: number; rotY: number }[];
  };
  /** The flying traffic's corridors. */
  air: AirLane[];
  /** Landing pads on the tallest roofs — the flying traffic sets down on them. */
  pads: { x: number; y: number; z: number }[];
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
  // the poor quarters (owner: not only the rich live here): corrugated rust
  // and patched tarp, crowded with tiny warm windows
  out.push({ tint: '#3a2418', win: 'tiny', crown: false, density: 1.3, warm: 0.9, dim: 0.8, core: false });
  out.push({ tint: '#1c2e4a', win: 'tiny', crown: false, density: 1.1, warm: 0.75, dim: 0.75, core: false });
  return out;
}
export const LANDMARK_TEX = 20;
export const MEGA_TEX = 21;
export const SHANTY_TEX: [number, number] = [22, 23];
const TARP = ['#2a5aa8', '#c8552c', '#3f7f5a', '#d9c26a', '#7a3d8f', '#c9c2b2', '#b03a3a'];
const VEND = ['#ff3b3b', '#5df2ff', '#ffd23f', '#ff4fd8', '#3dff8f', '#f4f1e8'];
const OUTER_PROFILE: Profile = { ...DISTRICTS.mid, lo: 6, hi: 24, stack: 1, kit: 0.3, signs: 0.3, over: 0, arcade: 0 };

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
  const tarps: Strip[] = [];
  const clutter: Clutter[] = [];
  const signs: Sign[] = [];
  const pois: Poi[] = [];
  const posts: { x: number; z: number; h: number; y?: number }[] = [];
  const lanterns: number[] = [];
  const wires: number[] = [];
  const vents: { x: number; z: number }[] = [];
  const holos: Holo[] = [];
  const stalls: Stall[] = [];
  const streets: Street[] = [];
  const ramps: Street[] = []; // planned before any lot is built — they cap what stands under them
  const stacks: { x: number; z: number; top: number }[] = [];
  const tall: { x: number; z: number; top: number; w: number; d: number; bridges: number; flat: boolean }[] = [];
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
  const dress = (fp: NonNullable<Foot>, h: number, top: number, capped: boolean, lowY: number[] = [0, 0, 0, 0]) => {
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
      const lo = Math.max(5, lowY[s]);
      if (h < sh + lo + 1) continue;
      let y = lo + sh / 2 + rand() * Math.min(h - sh - lo + 1, 26);
      const b = bctx.bustle;
      if (b && b.side === s) for (let k = 0; k < 3 && y + sh / 2 > b.y0 - 1 && y - sh / 2 < b.y1 + 1; k++) y = lo + sh / 2 + rand() * Math.min(h - sh - lo + 1, 26); // not through the bustle
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
  /** The mess of a lived-in facade: balconies stacked up a face with rails and the washing hung out, an
   *  awning over the shopfront, a steam vent at the kerb. */
  const balconies = (fp: NonNullable<Foot>, h: number) => {
    if (!bctx.round && rand() < 0.55 && h > 8) {
      const s = Math.floor(rand() * 4);
      const f = face(fp, s, 0.45), fr = face(fp, s, 0.88);
      const len = (s < 2 ? fp.w : fp.d) * 0.7;
      for (let y = 3.8; y < h - 1.5; y += 3.6) {
        solid(bucket, 'dark', 'bits', 0, f.x, y, f.z, s < 2 ? len : 0.9, 0.22, s < 2 ? 0.9 : len);
        clutter.push({ kind: 'rail', x: fr.x, y: y + 0.55, z: fr.z, w: len, h: 0.85, d: 0.05, rotY: fr.rot });
        for (let k = 0, n = rand() < 0.45 ? 1 + Math.floor(rand() * 3) : 0; k < n; k++) { // the washing
          const u = (rand() - 0.5) * (len - 1);
          tarps.push({ x: fr.x + (s < 2 ? u : 0), y: y + 0.45, z: fr.z + (s >= 2 ? u : 0), w: s < 2 ? 0.45 : 0.06, h: 0.55, d: s < 2 ? 0.06 : 0.45, color: pick(rand, TARP) });
        }
      }
    }
    if (rand() < 0.4) {
      const s = Math.floor(rand() * 4);
      const f = face(fp, s, 0.7);
      const len = (s < 2 ? fp.w : fp.d) * 0.6;
      awnings.push({ x: f.x, y: 3.1, z: f.z, w: s < 2 ? len : 1.4, h: 0.16, d: s < 2 ? 1.4 : len, color: signColor(rand) });
    }
    if (rand() < 0.06) vents.push({ x: fp.x + (rand() < 0.5 ? -1 : 1) * (fp.w / 2 + 1.2), z: fp.z + (rand() - 0.5) * fp.d });
  };

  // -- the building at hand: which of its walls face a street, its district, its gutter, whether it is round,
  // the bustle hung on it (so the signs keep clear); and the register of street-facing walls, by block and
  // side, that the overbuilds span between ---------------------------------------------------------------
  let bctx: { outer: boolean[]; prof: Profile; g: number; round: boolean; bustle: { side: number; y0: number; y1: number } | null } =
    { outer: [true, true, true, true], prof: DISTRICTS.mid, g: 0.5, round: false, bustle: null };
  const faces = new Map<string, Solid[]>();
  const noteFace = (s: Solid, lot: Rect) => {
    const bx = Math.round(s.x / G), bz = Math.round(s.z / G);
    const on = [s.z + s.d / 2 > lot.z + lot.d / 2 - 1.6, s.z - s.d / 2 < lot.z - lot.d / 2 + 1.6, s.x + s.w / 2 > lot.x + lot.w / 2 - 1.6, s.x - s.w / 2 < lot.x - lot.w / 2 + 1.6];
    for (let k = 0; k < 4; k++) {
      if (!on[k]) continue;
      const key = `${bx}:${bz}:${k}`;
      const l = faces.get(key);
      if (l) l.push(s); else faces.set(key, [s]);
    }
  };
  /** ARCADES (owner: layered walkways): a covered walk along a long street face at first-floor height, over the
   *  pavement, with rails and lanterns (drawn by the renderer); people walk it. Returns, per side, the height
   *  the hanging signs must start above. */
  const arcades = (fp: NonNullable<Foot>, h: number): number[] => {
    const lowY = [0, 0, 0, 0];
    if (bctx.round || bucket !== core) return lowY;
    for (let s = 0; s < 4; s++) {
      const along = s < 2 ? fp.w : fp.d;
      if (!bctx.outer[s] || along < 8 || h < 9 || rand() >= bctx.prof.arcade) continue;
      const f = face(fp, s, 0.8);
      streets.push({ x0: s < 2 ? f.x - along / 2 : f.x, z0: s < 2 ? f.z : f.z - along / 2, dx: s < 2 ? 1 : 0, dz: s < 2 ? 0 : 1, len: along, y: 5.5, kind: 'catwalk', width: 1.6 });
      grid.add({ x: f.x, y: 5.5, z: f.z, w: s < 2 ? along : 1.6, h: 0.3, d: s < 2 ? 1.6 : along });
      lowY[s] = 9;
    }
    return lowY;
  };
  /** STACKED ADDITIONS (owner: messy, overlapping): an annex on the roof, now and then cantilevered out over
   *  the street; a shack on the annex in the poorest quarter; a bustle hung on a street wall. Every one checks
   *  the route's ceiling for its own box. Returns the new top. */
  const stackOn = (fp: NonNullable<Foot>, h: number, top: number, flat: boolean): number => {
    const { outer, prof } = bctx;
    let t = top;
    const sides = [0, 1, 2, 3].filter((s) => outer[s]);
    if (flat && prof.stack >= 1 && rand() < 0.65) {
      const aw = fp.w * (0.3 + rand() * 0.3), ad = fp.d * (0.3 + rand() * 0.3), ah = 3 + rand() * 6;
      let ax = fp.x + (rand() - 0.5) * (fp.w - aw) * 0.9, az = fp.z + (rand() - 0.5) * (fp.d - ad) * 0.9;
      if (!bctx.round && sides.length && h >= 5 && rand() < 0.4) { // out over the street, its underside clear of the street's life
        const s = pick(rand, sides), o = 0.6 + rand() * 0.9;
        if (s === 0) az = fp.z + fp.d / 2 - ad / 2 + o; else if (s === 1) az = fp.z - fp.d / 2 + ad / 2 - o; else if (s === 2) ax = fp.x + fp.w / 2 - aw / 2 + o; else ax = fp.x - fp.w / 2 + aw / 2 - o;
      }
      if (h + ah <= allowedTop(ax, az, aw, ad) && !grid.hit(ax, h + ah / 2, az, 0)) {
        solid(bucket, 'facade', 'annex', anyTex(), ax, h + ah / 2, az, aw, ah, ad);
        t = Math.max(t, h + ah);
        if (prof.stack >= 3 && rand() < 0.5 && h + ah + 2.6 <= allowedTop(ax, az, aw, ad)) { // a shack on the annex
          const sw = aw * 0.6, sd = ad * 0.6, sh = 2 + rand();
          const sx = ax + (rand() - 0.5) * (aw - sw), sz = az + (rand() - 0.5) * (ad - sd);
          solid(bucket, 'facade', 'shanty', SHANTY_TEX[rand() < 0.6 ? 0 : 1], sx, h + ah + sh / 2, sz, sw, sh, sd);
          tarps.push({ x: sx, y: h + ah + sh + 0.08, z: sz, w: sw + 0.6, h: 0.12, d: sd + 0.6, color: pick(rand, TARP) });
          t = Math.max(t, h + ah + sh);
        }
      }
    }
    if (prof.stack >= 2 && !bctx.round && sides.length && h >= 10 && rand() < 0.45) { // the bustle
      const s = pick(rand, sides), f = face(fp, s, 0);
      const along = s < 2 ? fp.w : fp.d, len = along * (0.4 + rand() * 0.3), dep = 1.2 + rand() * 0.6, bh = h * (0.3 + rand() * 0.4);
      const y0 = 5 + rand() * Math.max(0, h - bh - 6), slide = (rand() - 0.5) * (along - len);
      const bx = f.x + (s < 2 ? slide : s === 2 ? dep / 2 : -dep / 2), bz = f.z + (s >= 2 ? slide : s === 0 ? dep / 2 : -dep / 2);
      const bw = s < 2 ? len : dep, bd = s < 2 ? dep : len;
      if (y0 + bh <= allowedTop(bx, bz, bw, bd)) {
        solid(bucket, 'facade', 'annex', anyTex(), bx, y0 + bh / 2, bz, bw, bh, bd);
        bctx.bustle = { side: s, y0, y1: y0 + bh };
      }
    }
    return t;
  };
  /** THE FACADE KIT (owner: a lived-in city): on every street face, by the district's thickness — AC units in
   *  rows under the windows, a pipe run or two, a duct, a dish, a fire escape (its platforms solid), cables
   *  along the second floor, and at the kerb, where the gutter is wide enough that the pavement's walkers pass
   *  clear, a vending machine, a phone booth, a bin, a crate. */
  const facadeKit = (fp: NonNullable<Foot>, h: number) => {
    if (bctx.round) return;
    const K = bctx.prof.kit * (bucket === core ? 1 : 0.4);
    const floors = Math.floor((h - 3) / 3);
    for (let s = 0; s < 4; s++) {
      if (!bctx.outer[s] && rand() < 0.7) continue; // the inner faces (seams, alleys) take a little
      const along = s < 2 ? fp.w : fp.d;
      const f = face(fp, s, 0), rot = f.rot;
      const nx = Math.sin(rot), nz = Math.cos(rot); // the wall's outward normal
      const at = (u: number, y: number, out: number) => ({ x: f.x + (s < 2 ? u : 0) + nx * out, y, z: f.z + (s >= 2 ? u : 0) + nz * out });
      if (rand() < 0.75 * K && floors > 1) { // condensers under the windows, on alternate floors
        const n = Math.max(1, Math.floor(along / 2.4));
        for (let k = 1; k < floors; k += 1 + Math.floor(rand() * 2)) {
          for (let i = 0; i < n; i++) {
            if (rand() >= 0.35 * K) continue;
            const p = at(-along / 2 + (i + 0.5) * (along / n) + (rand() - 0.5) * 0.4, 3 * k + 1.7, 0.28);
            clutter.push({ kind: 'ac', x: p.x, y: p.y, z: p.z, w: 0.62, h: 0.55, d: 0.5, rotY: rot });
          }
        }
      }
      if (rand() < 0.6 * K) { const p = at((rand() - 0.5) * (along - 1), h * 0.48, 0.14); clutter.push({ kind: 'pipe', x: p.x, y: p.y, z: p.z, w: 0.2, h: h * 0.94, d: 0.2, rotY: rot }); }
      if (rand() < 0.3 * K && floors > 1) { const y = 3 * (1 + Math.floor(rand() * (floors - 1))) + 0.4; const p = at(0, y, 0.16); clutter.push({ kind: 'pipe', x: p.x, y, z: p.z, w: along * (0.6 + rand() * 0.35), h: 0.16, d: 0.16, rotY: rot }); }
      if (rand() < 0.25 * K && h > 8) { const p = at((rand() - 0.5) * (along - 1.5), h * 0.5, 0.3); clutter.push({ kind: 'duct', x: p.x, y: p.y, z: p.z, w: 0.55, h: h * 0.8, d: 0.55, rotY: rot }); }
      if (rand() < 0.2 * K) { const p = at((rand() - 0.5) * (along - 1.5), 4 + rand() * Math.max(1, h - 6), 0.5); clutter.push({ kind: 'dish', x: p.x, y: p.y, z: p.z, w: 0.9, h: 0.9, d: 0.2, rotY: rot + (rand() - 0.5) * 1.2 }); }
      if (bctx.outer[s] && along >= 6 && h >= 12 && rand() < 0.12 * K) { // the fire escape
        const u = (rand() - 0.5) * (along - 4), len = 3.2;
        for (let y = 4; y < h - 2; y += 3) {
          const p = at(u, y, 0.5);
          solid(bucket, 'dark', 'bits', 0, p.x, y, p.z, s < 2 ? len : 0.9, 0.12, s < 2 ? 0.9 : len); // the platform
          const rp = at(u, y + 0.5, 0.95);
          clutter.push({ kind: 'rail', x: rp.x, y: rp.y, z: rp.z, w: len, h: 0.9, d: 0.05, rotY: rot });
          const lp = at(u + 1.2, y + 1.5, 0.7);
          clutter.push({ kind: 'escape', x: lp.x, y: lp.y, z: lp.z, w: 0.5, h: 2.9, d: 0.1, rotY: rot }); // the ladder
        }
      }
      if (rand() < 0.5 * K && h > 7) { // cables along the second floor
        const a = at(-along / 2, 6.2 + rand() * 0.6, 0.12), b = at(along / 2, 6.2 + rand() * 0.6, 0.12), m = at(0, 6.0, 0.4);
        wires.push(a.x, a.y, a.z, m.x, m.y, m.z, m.x, m.y, m.z, b.x, b.y, b.z);
      }
      if (bctx.outer[s] && bctx.g >= 0.7 && h >= 5) { // the street kit, in a gutter wide enough for it
        if (rand() < 0.3 * K) { const p = at((rand() - 0.5) * (along - 2), 0.95, 0.42); clutter.push({ kind: 'vend', x: p.x, y: p.y, z: p.z, w: 0.95, h: 1.9, d: 0.8, rotY: rot, color: pick(rand, VEND) }); }
        if (rand() < 0.12 * K) { const p = at((rand() - 0.5) * (along - 2), 1.15, 0.5); clutter.push({ kind: 'booth', x: p.x, y: p.y, z: p.z, w: 1.0, h: 2.3, d: 1.0, rotY: rot }); }
        if (rand() < 0.2 * K) { const p = at((rand() - 0.5) * (along - 2), 0.55, 0.5); clutter.push({ kind: 'bin', x: p.x, y: p.y, z: p.z, w: 1.6, h: 1.1, d: 0.9, rotY: rot }); }
        if (rand() < 0.15 * K) { const p = at((rand() - 0.5) * (along - 2), 0.4, 0.4); clutter.push({ kind: 'crate', x: p.x, y: p.y, z: p.z, w: 0.8, h: 0.8, d: 0.8, rotY: rot + (rand() - 0.5) * 0.6 }); }
      }
    }
  };

  // -- archetypes -----------------------------------------------------------
  /** THE ROOFTOP KIT (owner: a lived-in city): a water tank on legs, a row of condensers, a stair bulkhead,
   *  a vent stack, a dish, a skylight ridge, an aerial — the outer ring gets a lighter kit; a roof under the
   *  route stays bare. */
  const roofKit = (x: number, z: number, w: number, d: number, top: number, capped: boolean) => {
    if (capped) return;
    const P = bucket === core ? 1 : 0.4;
    const spot = (mw: number, md: number): [number, number] => [x + (rand() - 0.5) * Math.max(0, w - mw - 0.6), z + (rand() - 0.5) * Math.max(0, d - md - 0.6)];
    if (w > 4 && d > 4 && rand() < 0.45 * P) { // a water tank on four legs
      const r = 0.7 + rand() * 0.4, th = 1.6 + rand(), legs = 1.1;
      const [tx, tz] = spot(2 * r, 2 * r);
      clutter.push({ kind: 'tank', x: tx, y: top + legs + th / 2, z: tz, w: 2 * r, h: th, d: 2 * r, rotY: 0 });
      grid.add({ x: tx, y: top + legs + th / 2, z: tz, w: 2 * r, h: th, d: 2 * r });
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) clutter.push({ kind: 'beam', x: tx + sx * r * 0.6, y: top + legs / 2, z: tz + sz * r * 0.6, w: 0.12, h: legs, d: 0.12, rotY: 0 });
    }
    if (rand() < 0.6 * P) { // a row of condensers
      const n = 2 + Math.floor(rand() * 5), alongX = rand() < 0.5;
      const [ax, az] = spot(alongX ? n * 1.1 : 0.9, alongX ? 0.9 : n * 1.1);
      for (let i = 0; i < n; i++) clutter.push({ kind: 'ac', x: ax + (alongX ? (i - (n - 1) / 2) * 1.1 : 0), y: top + 0.42, z: az + (alongX ? 0 : (i - (n - 1) / 2) * 1.1), w: 0.9, h: 0.8, d: 0.9, rotY: 0 });
    }
    if (w > 5 && d > 5 && rand() < 0.5 * P) { const [bx, bz] = spot(2.2, 2.4); solid(bucket, 'dark', 'bits', 0, bx, top + 1.2, bz, 2.2, 2.4, 2.4); } // the stair bulkhead
    if (rand() < 0.4 * P) { const [vx, vz] = spot(0.7, 0.7); clutter.push({ kind: 'plant', x: vx, y: top + 0.55, z: vz, w: 0.7, h: 1.1, d: 0.7, rotY: 0 }); } // a vent stack
    if (rand() < 0.3 * P) { const [dx, dz] = spot(1.1, 1.1); clutter.push({ kind: 'dish', x: dx, y: top + 0.8, z: dz, w: 1.1, h: 1.1, d: 0.15, rotY: rand() * Math.PI * 2 }); }
    if (w > 6 && rand() < 0.25 * P) { const [sx, sz] = spot(0.7, d * 0.5); clutter.push({ kind: 'duct', x: sx, y: top + 0.3, z: sz, w: 0.7, h: 0.6, d: d * 0.5, rotY: 0 }); } // a skylight ridge
    if (rand() < 0.2 * P) solid(bucket, 'dark', 'bits', 0, x + (rand() - 0.5) * w * 0.4, top + 2.4, z + (rand() - 0.5) * d * 0.4, 0.22, 4.8, 0.22); // an aerial
  };
  /** ROOFTOP SHANTIES (owner: the poor build where they can): shacks under tarps on a flat roof, a water
   *  tank, a lantern. */
  const roofShanties = (x: number, z: number, w: number, d: number, h: number) => {
    const n = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const sw = 1.6 + rand() * 1.4, sd = 1.6 + rand() * 1.4, sh = 1.6 + rand() * 1.2;
      const sx = x + (rand() - 0.5) * (w - sw - 0.6), sz = z + (rand() - 0.5) * (d - sd - 0.6);
      solid(bucket, 'facade', 'shanty', SHANTY_TEX[rand() < 0.6 ? 0 : 1], sx, h + sh / 2, sz, sw, sh, sd);
      tarps.push({ x: sx, y: h + sh + 0.08, z: sz, w: sw + 0.6, h: 0.12, d: sd + 0.6, color: pick(rand, TARP) });
    }
    if (rand() < 0.5) solid(bucket, 'cyl', 'bits', 0, x + (rand() - 0.5) * w * 0.5, h + 1.1, z + (rand() - 0.5) * d * 0.5, 1.4, 2.2, 1.4);
    lantern(x + (rand() - 0.5) * w * 0.6, h + 2.2, z + (rand() - 0.5) * d * 0.6);
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
  const noteTall = (x: number, z: number, top: number, w: number, d: number, flat = false) => {
    if (top > 40 && bucket === core) tall.push({ x, z, top, w, d, bridges: 0, flat });
  };
  /** Every building ends here: an arcade along it perhaps, additions stacked on it, its signs, its balconies,
   *  its kit. `flat` says the roof at `h` is a flat roof an annex can stand on. */
  const finish = (fp: NonNullable<Foot>, h: number, top: number, capped: boolean, flat = true) => {
    const lowY = arcades(fp, h);
    const top2 = stackOn(fp, h, top, flat);
    dress(fp, h, top2, capped, lowY);
    balconies(fp, h);
    facadeKit(fp, h);
    bctx.bustle = null;
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
    else roofKit(x, z, w, d, top, capped);
    noteTall(x, z, top, w, d);
    return finish({ x, z, w, d }, h, top, capped, true);
  };
  const slab = (x: number, z: number, w: number, d: number, h0: number): Foot => {
    const allowed = allowedTop(x, z, w, d);
    const h = fitH(h0, 1, 0, allowed);
    if (!h) return null;
    solid(bucket, 'facade', 'slab', texOf((s) => s.win === 'ribbon' || s.win === 'curtain'), x, h / 2, z, w, h, d);
    roofKit(x, z, w, d, h, allowed < Infinity);
    noteTall(x, z, h, w, d, true);
    return finish({ x, z, w, d }, h, h, allowed < Infinity, true);
  };
  const cylinder = (x: number, z: number, r: number, h0: number): Foot => {
    const allowed = allowedTop(x, z, r * 2, r * 2);
    const h = fitH(h0, 1, r, allowed); // the dome is r tall — reserve all of it
    if (!h) return null;
    bctx.round = true;
    solid(bucket, 'cyl', 'cyl', texOf((s) => s.win === 'strip' || s.win === 'grid' || s.win === 'wide'), x, h / 2, z, r * 2, h, r * 2);
    let top = h;
    if (rand() < 0.45) { solid(bucket, 'dome', 'cyl', 0, x, h + r / 2, z, r * 2, r, r * 2); top = h + r; }
    noteTall(x, z, top, r * 2, r * 2);
    return finish({ x, z, w: r * 2, d: r * 2 }, h, top, allowed < Infinity, false);
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
    return finish({ x, z, w, d }, h * shares[0], y, allowed < Infinity, false);
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
    roofKit(x - gap / 2, z, tw, d, h, allowed < Infinity);
    noteTall(x, z, h, w, d);
    return finish({ x, z, w, d }, h, h, allowed < Infinity, false);
  };
  const cross = (x: number, z: number, w: number, d: number, h0: number): Foot => {
    const allowed = allowedTop(x, z, w, d);
    const h = fitH(h0, 1, 0, allowed);
    if (!h) return null;
    const tex = anyTex();
    solid(bucket, 'facade', 'cross', tex, x, h / 2, z, w, h, d * 0.5);
    solid(bucket, 'facade', 'cross', tex, x, h / 2, z, w * 0.5, h, d);
    roofKit(x, z, w * 0.5, d * 0.5, h, allowed < Infinity);
    noteTall(x, z, h, w, d, true);
    return finish({ x, z, w, d }, h, h, allowed < Infinity, false);
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
    return finish({ x, z, w, d: w }, h, h + 10, allowed < Infinity, false);
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
    return finish({ x, z, w, d }, ph, top, allowed < Infinity, false);
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
    const roof = rand();
    if (roof < 0.35) { solid(bucket, 'pyr', 'low', 0, x, h + 1.2, z, w, 2.4, d); top = h + 2.4; }
    else if (roof < 0.55) { solid(bucket, 'facade', 'low', tex, x + (rand() - 0.5) * w * 0.3, h + 1.4, z + (rand() - 0.5) * d * 0.3, w * 0.5, 2.8, d * 0.5); top = h + 2.8; }
    else if (roof < 0.85 && w > 5 && d > 5 && h + 3 <= allowed) { roofShanties(x, z, w, d, h); top = h + 3; }
    else roofKit(x, z, w, d, h, allowed < Infinity);
    return finish({ x, z, w, d }, h, top, allowed < Infinity, roof >= 0.85);
  };
  /** THE BLOCK (owner: Kowloon): a plain box of flats jumbled against its neighbours, shanties or the kit on
   *  its roof, additions stacked on it by `finish`. */
  const block = (x: number, z: number, w: number, d: number, h0: number): Foot => {
    const allowed = allowedTop(x, z, w, d);
    const h = fitH(h0, 1, 0, allowed);
    if (!h) return null;
    solid(bucket, 'facade', 'block', texOf((s) => s.win === 'grid' || s.win === 'tiny' || s.win === 'strip'), x, h / 2, z, w, h, d);
    let top = h, flat = true;
    if (w > 5 && d > 5 && h + 3 <= allowed && rand() < 0.4) { roofShanties(x, z, w, d, h); top = h + 3; flat = false; }
    else roofKit(x, z, w, d, h, allowed < Infinity);
    noteTall(x, z, top, w, d, flat);
    return finish({ x, z, w, d }, h, top, allowed < Infinity, flat);
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

  /** One cell of a lot becomes one building: its district's heights (jittered per block, the odd spike), a
   *  seam or a gutter about it, an archetype by district and size class; its street-facing walls are
   *  remembered for the overbuilds. */
  const building = (c: Rect, lot: Rect, prof: Profile, seam: number | null, storefronts: boolean, jit: number) => {
    if (lineDist(c.x, c.z, DIAGONAL.x0, DIAGONAL.z0, DIAGONAL.x1, DIAGONAL.z1) < DIAGONAL.width / 2 + Math.max(c.w, c.d) / 2 + 1) return; // the boulevard's right of way
    const g = seam ?? 0.3 + rand() * 0.8;
    const w = c.w - 2 * g, d = c.d - 2 * g;
    if (w < 3 || d < 3) return;
    const x = c.x, z = c.z;
    const jt = prof.name === 'walled' ? 1 + (jit - 1) * 0.4 : jit; // the walled city keeps its height whatever the block: its streets are roofed over
    let h = (prof.lo + Math.pow(rand(), prof.name === 'walled' ? 1 : 1.3) * (prof.hi - prof.lo)) * jt;
    if (rand() < 0.08) h *= 1.6; // the odd spike
    h = Math.min(h, 128);
    const m = Math.min(w, d), M = Math.max(w, d);
    const a = rand();
    const outer = [c.z + c.d / 2 > lot.z + lot.d / 2 - 1, c.z - c.d / 2 < lot.z - lot.d / 2 + 1, c.x + c.w / 2 > lot.x + lot.w / 2 - 1, c.x - c.w / 2 < lot.x - lot.w / 2 + 1];
    bctx = { outer, prof, g, round: false, bustle: null };
    const i0 = bucket.length;
    let fp: Foot;
    if (m < 5.5) fp = prof.name === 'walled' ? block(x, z, w, d, Math.min(h, 44)) : h > 34 && rand() < 0.25 && prof.name !== 'old' ? needle(x, z, h) : low(x, z, w, d, Math.min(h, 16));
    else if (M / m > 2.2) fp = slab(x, z, w, d, h);
    else if (prof.name === 'heights') {
      fp = a < 0.34 ? tower(x, z, w, d, h, anyTex()) : a < 0.52 ? podium(x, z, w, d, h) : a < 0.66 && w > 9 ? twin(x, z, w, d, h) : a < 0.8 ? cross(x, z, w, d, h)
        : a < 0.9 && m >= 6 ? cylinder(x, z, (m / 2) * 0.95, h) : needle(x, z, h);
    } else if (prof.name === 'walled') {
      fp = a < 0.68 ? block(x, z, w, d, h) : a < 0.82 ? tower(x, z, w, d, h, anyTex()) : a < 0.92 ? ziggurat(x, z, w, d, h) : cross(x, z, w, d, h);
    } else if (prof.name === 'old') {
      fp = a < 0.7 || h < 14 ? low(x, z, w, d, Math.min(h, 24)) : block(x, z, w, d, h);
    } else {
      fp = h > 30 && a < 0.06 ? needle(x, z, h)
        : h > 24 && a < 0.14 ? ziggurat(x, z, w, d, h)
        : h > 22 && w > 9 && a < 0.2 ? twin(x, z, w, d, h)
        : h > 20 && a < 0.27 ? cross(x, z, w, d, h)
        : a < 0.34 && m >= 6 ? cylinder(x, z, (m / 2) * 0.95, h)
        : a < 0.44 ? podium(x, z, w, d, h)
        : a < 0.66 ? block(x, z, w, d, h)
        : h < 14 ? low(x, z, w, d, h)
        : tower(x, z, w, d, h, anyTex());
    }
    for (let i = i0; i < bucket.length; i++) { const s = bucket[i]; if (s.kind === 'facade' && s.arch !== 'shanty' && s.arch !== 'annex') noteFace(s, lot); }
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
  const pendingCats: { x: number; z: number; alongX: boolean; aw: number }[] = [];
  const alley = (r: Rect, alongX: boolean, at: number, aw: number) => {
    const len = alongX ? r.w : r.d;
    const x0 = alongX ? r.x - r.w / 2 : at, z0 = alongX ? at : r.z - r.d / 2;
    streets.push({ x0, z0, dx: alongX ? 1 : 0, dz: alongX ? 0 : 1, len, y: 0, kind: 'alley', width: aw });
    for (let k = 0, n = 1 + (rand() < 0.5 ? 1 : 0); k < n; k++) { // catwalks across it, hung once the walls stand
      const t = 3 + rand() * (len - 6);
      pendingCats.push({ x: alongX ? x0 + t : at, z: alongX ? at : z0 + t, alongX, aw });
    }
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

  /** Pack a lot (or a merged superblock) edge to edge by its district's profile — fused into one mass or
   *  gutters between — often cut by an alley with catwalks across it. */
  const buildLot = (r: Rect, prof: Profile, storefronts: boolean, jit: number) => {
    const parts: Rect[] = [];
    const alleyOdds = prof.name === 'old' ? 0.6 : prof.name === 'walled' ? 0.3 : 0.5;
    if (r.w >= 20 && r.d >= 20 && rand() < alleyOdds) {
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
    const seam = rand() < prof.fuse ? 0.08 : null;
    for (const part of parts) {
      const cells: Rect[] = [];
      partition(part, prof.min, prof.min + 2 + rand() * (prof.max - prof.min - 2), cells);
      for (const c of cells) building(c, r, prof, seam, storefronts, jit);
    }
    for (const c of pendingCats.splice(0)) { // catwalks across the alley, between walls that are really there
      const nx = c.alongX ? 0 : 1, nz = c.alongX ? 1 : 0; // across the alley
      const e = c.aw / 2 + 1.3; // into the walls either side
      for (let tries = 0; tries < 4; tries++) {
        const y = 4.5 + rand() * 13.5;
        if (!grid.hit(c.x + nx * e, y, c.z + nz * e, 0.1) || !grid.hit(c.x - nx * e, y, c.z - nz * e, 0.1)) continue;
        streets.push({ x0: c.x - nx * e, z0: c.z - nz * e, dx: nx, dz: nz, len: 2 * e, y, kind: 'catwalk', width: 1.4 });
        grid.add({ x: c.x, y, z: c.z, w: c.alongX ? 1.4 : 2 * e, h: 0.3, d: c.alongX ? 2 * e : 1.4 });
        lantern(c.x - nx * (e - 1.6), y + 1.5, c.z - nz * (e - 1.6)); lantern(c.x + nx * (e - 1.6), y + 1.5, c.z + nz * (e - 1.6));
        break;
      }
    }
  };

  /** A FLEA MARKET fills a lot: rows of tarp stalls with gaps to walk
   *  through, string lights across, a lit gate. */
  const flea = (r: Rect) => {
    const cols = Math.floor((r.w - 2) / 3.6), rows = Math.floor((r.d - 2) / 3.2);
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if (rand() < 0.22) continue;
        const x = r.x - r.w / 2 + 2.8 + i * 3.6, z = r.z - r.d / 2 + 2.6 + j * 3.2;
        stalls.push({ x, z, color: pick(rand, TARP) });
        for (const [ox, oz] of [[-1.3, -1.1], [1.3, -1.1], [-1.3, 1.1], [1.3, 1.1]]) solid(bucket, 'dark', 'street', 0, x + ox, 1.2, z + oz, 0.14, 2.4, 0.14);
        grid.add({ x, y: 2.9, z, w: 3.2, h: 1.2, d: 2.6 });
        if ((i + j) % 3 === 0) lantern(x, 2.6, z);
      }
    }
    for (let i = 0; i < 3; i++) {
      const z = r.z - r.d / 2 + 3 + rand() * (r.d - 6);
      for (let x = r.x - r.w / 2 + 1; x <= r.x + r.w / 2 - 1; x += 2.2) lantern(x, 3.4, z);
    }
    signs.push({ x: r.x, y: 5.2, z: r.z - r.d / 2 - 0.2, rotY: Math.PI, w: 8, h: 1.6, color: signColor(rand), kind: 'gantry' });
    for (const sg of [-1, 1]) solid(bucket, 'dark', 'street', 0, r.x + sg * 4.2, 2.8, r.z - r.d / 2 - 0.2, 0.3, 5.6, 0.3);
    pois.push({ x: r.x, y: 6, z: r.z, w: 1.4 });
  };
  /** A FAVELA fills a lot: tiny stacked boxes in rust and tarp, offset as
   *  they climb, tarps over them, wires strung across, lanterns, steam. */
  const favela = (r: Rect) => {
    const cells: Rect[] = [];
    partition(r, 3, 6, cells);
    for (const c of cells) {
      const g = 0.5 + rand() * 0.5;
      const w = c.w - g, d = c.d - g;
      if (w < 2 || d < 2) continue;
      const levels = 1 + Math.floor(rand() * 3);
      let y = 0, cx = c.x, cz = c.z, cw = w, cd = d;
      for (let l = 0; l < levels; l++) {
        const h = 2.4 + rand() * 1.4;
        if (y + h > allowedTop(cx, cz, cw, cd)) break;
        solid(bucket, 'facade', 'shanty', SHANTY_TEX[rand() < 0.65 ? 0 : 1], cx, y + h / 2, cz, cw, h, cd);
        y += h;
        if (rand() < 0.5) tarps.push({ x: cx, y: y + 0.1, z: cz, w: cw + 0.8, h: 0.12, d: cd + 0.8, color: pick(rand, TARP) });
        cx += (rand() - 0.5) * 1.2; cz += (rand() - 0.5) * 1.2; cw *= 0.85; cd *= 0.85;
      }
      if (rand() < 0.35) lantern(c.x + (rand() - 0.5) * w, y + 0.6, c.z + (rand() - 0.5) * d);
      if (rand() < 0.25) vents.push({ x: c.x, z: c.z + d / 2 + 0.6 });
    }
    for (let i = 0; i < 10; i++) {
      const ax = r.x - r.w / 2 + rand() * r.w, az = r.z - r.d / 2 + rand() * r.d;
      const bx = r.x - r.w / 2 + rand() * r.w, bz = r.z - r.d / 2 + rand() * r.d;
      const ya = 4 + rand() * 4, yb = 4 + rand() * 4;
      const mx = (ax + bx) / 2, mz = (az + bz) / 2, my = Math.min(ya, yb) - 0.8;
      wires.push(ax, ya, az, mx, my, mz, mx, my, mz, bx, yb, bz);
    }
    pois.push({ x: r.x, y: 8, z: r.z, w: 1.2 });
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
  for (const [bx, bz] of [[-6, -5], [6, 6], [2, -7]]) reserved.set(key(bx, bz), 'flea'); // the flea markets
  for (const [bx, bz] of [[-7, 6], [7, -2], [-4, 7], [6, -6]]) reserved.set(key(bx, bz), 'favela'); // the poor quarters
  // closed street segments: a north–south street line i closed alongside
  // block row j (closedZ), an east–west line i closed alongside column j (closedX)
  const closedZ = new Set<string>();
  const closedX = new Set<string>();
  closedZ.add('-5:3'); closedZ.add('-5:4'); closedX.add('3:-5'); closedX.add('3:-4'); // the stadium
  closedZ.add('3:-3'); closedZ.add('3:-4'); closedX.add('-4:3'); closedX.add('-4:4'); // the megastructure
  const merged = new Map<string, 'x' | 'z'>(); // the first block of a merged pair → merge axis
  const swallowed = new Set<string>();
  const noMerge = new Set<string>(); // blocks the interchanges need whole
  const ordinary = (bx: number, bz: number) =>
    bx !== 0 && bz !== 0 && Math.max(Math.abs(bx), Math.abs(bz)) <= HALF && !reserved.has(key(bx, bz)) && !merged.has(key(bx, bz)) && !swallowed.has(key(bx, bz)) && !noMerge.has(key(bx, bz));
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
    // a column takes an interchange if its four landings (an off-ramp's
    // foot and an on-ramp's head each side) fall between crossings on open
    // segments, and the ramps' far ends stay clear of the avenues
    const fits = (i: number): number | null => {
      const X = streetAt(i), z = zH(X);
      if (Math.abs(X) + 70 >= EXT || Math.abs(X) - 67 < MEDIAN + 16) return null;
      for (const a of [16.6, 20, 24, 28, 14]) {
        if ([-a - 8, -a, a, a + 8].some((off) => onStreet(z + off))) continue;
        const j0 = Math.round((z - a - 8) / G), j1 = Math.round((z + a + 8) / G);
        let open = true;
        for (let j = j0; j <= j1; j++) if (!openZ(i, j)) open = false; // only the features close segments this early
        if (!open) continue;
        for (let j = j0; j <= j1; j++) { noMerge.add(key(i, j)); noMerge.add(key(i + 1, j)); } // and no merge may close them later
        return a;
      }
      return null;
    };
    for (const side of [[-4, -3, -5], [3, 2, 4]]) {
      let i: number | undefined, a: number | null = null;
      for (const c of side) { a = fits(c); if (a !== null) { i = c; break; } }
      if (i === undefined || a === null) continue;
      const X = streetAt(i), z = zH(X), top = HIGHWAY.y + 0.4;
      const edge = (x: number, s: number) => ({ x: x + nx * 12.5 * s, z: zH(x) + nz * 12.5 * s }); // the ramp's high end rides the deck's edge
      const p = edge(X - 67, 1), q = edge(X + 67, 1), r = edge(X + 67, -1), t = edge(X - 67, -1);
      ramps.push(ramp(p.x, top, p.z, X, 0, z + a)); // eastbound off
      ramps.push(ramp(X, 0, z + a + 8, q.x, top, q.z)); // eastbound on
      ramps.push(ramp(r.x, top, r.z, X, 0, z - a)); // westbound off
      ramps.push(ramp(X, 0, z - a - 8, t.x, top, t.z)); // westbound on
    }
  }
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
  // -- the main city, by district ---------------------------------------------
  for (let bx = -HALF; bx <= HALF; bx++) {
    for (let bz = -HALF; bz <= HALF; bz++) {
      if (bx === 0 || bz === 0) continue; // the avenues
      const k = key(bx, bz);
      const kind = reserved.get(k);
      if (kind === 'flea') { flea({ x: bx * G, z: bz * G, w: LOT, d: LOT }); continue; }
      if (kind === 'favela') { favela({ x: bx * G, z: bz * G, w: LOT, d: LOT }); continue; }
      if (reserved.has(k) || swallowed.has(k)) continue;
      const m = merged.get(k);
      const rect: Rect = m === 'x'
        ? { x: bx * G + G / 2, z: bz * G, w: 2 * LOT + STREET, d: LOT }
        : m === 'z' ? { x: bx * G, z: bz * G + G / 2, w: LOT, d: 2 * LOT + STREET }
        : { x: bx * G, z: bz * G, w: LOT, d: LOT };
      buildLot(rect, DISTRICTS[districtOf(bx, bz)], true, blockJitter(bx, bz));
    }
  }
  // -- the outer ring: past the fence, still finished ------------------------
  bucket = outer; rich = false;
  for (let bx = -HALF - OUTER; bx <= HALF + OUTER; bx++) {
    for (let bz = -HALF - OUTER; bz <= HALF + OUTER; bz++) {
      if (Math.max(Math.abs(bx), Math.abs(bz)) <= HALF) continue;
      if (bx === 0 || bz === 0) continue; // the avenues run on out of town
      if (reserved.has(key(bx, bz))) continue;
      buildLot({ x: bx * G, z: bz * G, w: LOT, d: LOT }, OUTER_PROFILE, false, blockJitter(bx, bz));
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
    gates: [[0, -1, Math.PI], [1, 0, Math.PI / 2], [0, 1, 0], [-1, 0, -Math.PI / 2]].map(([a, b, rotY]) => ({ x: sx0 + a * 29.4, z: sz0 + b * 22.4, rotY })),
  };
  grid.add({ x: stadium.x, y: stadium.h / 2, z: stadium.z, w: stadium.w, h: stadium.h, d: stadium.d });
  for (const m of stadium.masts) solid(core, 'dark', 'street', 0, m.x, m.h / 2, m.z, 0.9, m.h, 0.9);
  // two big screens, a lit board over every gate, the roof ring's edge in the grid
  signs.push({ x: sx0, y: 15.5, z: sz0 - stadium.d / 2 - 0.4, rotY: Math.PI, w: 22, h: 4, color: '#5df2ff', kind: 'screen' });
  signs.push({ x: sx0, y: 15.5, z: sz0 + stadium.d / 2 + 0.4, rotY: 0, w: 22, h: 4, color: '#ff4fd8', kind: 'screen' });
  for (const g of stadium.gates) signs.push({ x: g.x, y: 6.4, z: g.z, rotY: g.rotY, w: 9, h: 1.6, color: signColor(rand), kind: 'board' });
  grid.add({ x: stadium.x, y: stadium.h + 2.4, z: stadium.z, w: stadium.w + 4, h: 1.2, d: stadium.d + 4 }); // the roof ring
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
  pois.push({ x: lmx, y: landmark.top * 0.62, z: lmz, w: 3 });
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
  // STILT HUTS on the canal's edges, between the bridges: the water's poor
  for (let i = 0; i < 16; i++) {
    const side = i % 2 ? -1 : 1;
    const z = (rand() - 0.5) * 2 * (EXT - 30);
    if (onStreet(z) || Math.abs(z) < 34) continue;
    const x = side * 10.4;
    solid(core, 'facade', 'shanty', SHANTY_TEX[1], x, 2.2, z, 3.2, 2.6, 3.4);
    solid(core, 'pyr', 'shanty', 0, x, 4.2, z, 3.8, 1.4, 4);
    for (const [ox, oz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) solid(core, 'dark', 'street', 0, x + ox, 0.45, z + oz, 0.16, 0.9, 0.16);
    lantern(x - side * 1.9, 2.8, z);
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
        for (const s of [-1, 1]) solid(core, 'dark', 'street', 0, x - dz * s * 8.7, HIGHWAY.y + 4, z + dx * s * 8.7, 0.36, 8, 0.36);
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
        const off = r.at + s * (ROAD / 2 + 0.55); // at the kerb line: the pavement's walkers pass clear of them
        const x = r.axis === 'x' ? t : off, z = r.axis === 'x' ? off : t;
        if (Math.abs(x) < 30 && Math.abs(z) < 30) continue; // the plaza has its ring
        if (Math.abs(x) < MEDIAN + 1 && r.axis === 'x') continue; // the canal has its quays
        posts.push({ x, z, h: 5.5 });
      }
    }
  }
  // -- OVERBUILDS (owner: overlapping structures, buildings over the streets): blocks of flats bridging a
  // street between two masses that face each other, above the auto-flight's canyon band (20–32, a 2.6 pad)
  // and under the route (the underside at 35+); the walled city is mostly roofed over this way, a screen looks
  // down the street ------------------------------------------------------------------------------------------
  const roofed: { axis: 'x' | 'z'; at: number; t: number; half: number }[] = []; // where a span roofs a street: the auto-flight treats it as a closure
  const key3 = (b: number[]) => `${b[0]}:${b[1]}:${b[2]}`;
  for (const r of roads) {
    const i = Math.round(r.at / G - 0.5);
    if (i === -1 || i === 0) continue; // the avenues' own carriageways
    const j0 = Math.round(r.from / G + 0.5), j1 = Math.round(r.to / G - 0.5);
    for (let j = j0; j <= j1; j++) {
      const ba = r.axis === 'x' ? [j, i, 0] : [i, j, 2], bb = r.axis === 'x' ? [j, i + 1, 1] : [i + 1, j, 3]; // (bx, bz, side) either side of the road
      if ([ba, bb].some((b) => Math.abs(b[0]) > HALF || Math.abs(b[1]) > HALF)) continue;
      const A = faces.get(key3(ba)), B = faces.get(key3(bb));
      if (!A || !B) continue;
      const odds = DISTRICTS[districtOf(ba[0], ba[1])].over;
      if (rand() >= odds) continue;
      // the masses either side, read along the street: a span lands wherever both carry at least 43
      const ext = (q: Solid): [number, number] => (r.axis === 'x' ? [q.x - q.w / 2, q.x + q.w / 2] : [q.z - q.d / 2, q.z + q.d / 2]);
      const topAt = (list: Solid[], u: number) => { let t = 0; for (const q of list) { const [q0, q1] = ext(q); if (u >= q0 && u <= q1) t = Math.max(t, q.y + q.h / 2); } return t; };
      const u0 = j * G - LOT / 2, u1 = j * G + LOT / 2;
      const runs: [number, number][] = [];
      let run: number | null = null;
      for (let u = u0; u <= u1 + 0.25; u += 0.5) {
        const ok = u <= u1 && Math.min(topAt(A, u), topAt(B, u)) >= 41;
        if (ok && run === null) run = u;
        if (!ok && run !== null) { if (u - 0.5 - run >= 4.5) runs.push([run, u - 0.5]); run = null; }
      }
      for (const [r0, r1] of runs) {
        let u = r0; // spans laid along the run, end to end with a breath between
        for (let n = 0; n < 3 && r1 - u >= 4.5; n++) {
          const dep = Math.min(r1 - u, 8 + rand() * 8), c = u + dep / 2;
          u += dep + 1 + rand() * 6;
          let lowTop = Infinity, fa = -Infinity, fb = Infinity;
          for (const u of [c - dep / 2 + 0.1, c, c + dep / 2 - 0.1]) lowTop = Math.min(lowTop, topAt(A, u), topAt(B, u));
          for (const q of A) { const [q0, q1] = ext(q); if (q1 > c - dep / 2 && q0 < c + dep / 2) fa = Math.max(fa, r.axis === 'x' ? q.z + q.d / 2 : q.x + q.w / 2); }
          for (const q of B) { const [q0, q1] = ext(q); if (q1 > c - dep / 2 && q0 < c + dep / 2) fb = Math.min(fb, r.axis === 'x' ? q.z - q.d / 2 : q.x - q.w / 2); }
          const across = fb - fa;
          if (!(across >= 8 && across <= 30)) continue;
          const y0 = 35 + rand() * 3, hb = Math.min(5 + rand() * 7, lowTop - 2 - y0); // the underside above the canyon band and its pad (34.6); as thick as the lower mass allows
          if (hb < 4) continue;
          const x = r.axis === 'x' ? c : (fa + fb) / 2, z = r.axis === 'x' ? (fa + fb) / 2 : c;
          const w = r.axis === 'x' ? dep : across + 0.4, d = r.axis === 'x' ? across + 0.4 : dep;
          if (Math.abs(x) < 26 || Math.abs(z) < 26) continue; // never over an avenue
          if (y0 + hb > allowedTop(x, z, w, d)) continue; // the route flies over
          if (grid.hit(x, y0 + hb / 2, z, 1)) continue; // something already fills that air
          solid(core, 'facade', 'over', anyTex(), x, y0 + hb / 2, z, w, hb, d);
          roofed.push({ axis: r.axis, at: r.at, t: c, half: dep / 2 });
          if (rand() < 0.35) { // a screen on the face that looks down the street
            const sgn = rand() < 0.5 ? 1 : -1;
            signs.push({
              x: x + (r.axis === 'x' ? sgn * (dep / 2 + 0.2) : 0), y: y0 + hb / 2, z: z + (r.axis === 'x' ? 0 : sgn * (dep / 2 + 0.2)),
              rotY: r.axis === 'x' ? sgn * Math.PI / 2 : sgn > 0 ? 0 : Math.PI, w: across * 0.6, h: hb * 0.6, color: '#ffffff', kind: 'screen',
            });
          }
        }
      }
    }
  }
  // -- TOWER CRANES (owner: a city still building itself): three, on flat roofs at mid height, clear of the
  // route and the highway, a red lamp on the mast, a lantern at the jib's tip ------------------------------
  const extraBeacons: { x: number; y: number; z: number }[] = [];
  for (const t of tall.filter((q) => q.flat && q.top > 40 && q.top < 90 && allowedTop(q.x, q.z, q.w + 40, q.d + 40) === Infinity).slice(0, 3)) {
    const alongX = rand() < 0.5, dir = rand() < 0.5 ? 1 : -1;
    const mx = t.x + (rand() - 0.5) * t.w * 0.4, mz = t.z + (rand() - 0.5) * t.d * 0.4, mt = t.top + 22;
    solid(core, 'dark', 'street', 0, mx, (t.top + mt) / 2, mz, 1.1, mt - t.top, 1.1); // the mast
    solid(core, 'dark', 'street', 0, mx + (alongX ? dir * 3 : 0), mt + 0.5, mz + (alongX ? 0 : dir * 3), alongX ? 14 : 0.9, 0.9, alongX ? 0.9 : 14); // the jib and the counter-jib, over the lot
    solid(core, 'dark', 'street', 0, mx, mt - 0.6, mz, 1.6, 1.4, 1.6); // the cab
    const tx = mx + (alongX ? dir * 9.5 : 0), tz = mz + (alongX ? 0 : dir * 9.5);
    wires.push(tx, mt, tz, tx, mt - 4, tz, tx, mt - 4, tz, tx, mt - 8, tz); // the hook's cable
    lantern(tx, mt + 0.3, tz);
    extraBeacons.push({ x: mx, y: mt + 1.6, z: mz });
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
  // the SQUATS under the deck: shacks between the pillars wherever nothing stands
  {
    const hx = HIGHWAY.x1 - HIGHWAY.x0, hz = HIGHWAY.z1 - HIGHWAY.z0, hlen = Math.hypot(hx, hz), hdx = hx / hlen, hdz = hz / hlen;
    for (let t = 4; t < hlen; t += 6) {
      const x = HIGHWAY.x0 + hdx * t, z = HIGHWAY.z0 + hdz * t;
      if (Math.abs(x) > EXT || Math.abs(z) > EXT || onStreet(x) || onStreet(z) || rand() < 0.35) continue;
      const side = rand() < 0.5 ? -1 : 1;
      const sx = x - hdz * side * (2.5 + rand() * 2), sz = z + hdx * side * (2.5 + rand() * 2);
      const sw = 2.2 + rand() * 1.6, sd = 2.2 + rand() * 1.6, sh = 2 + rand() * 1.2;
      const pad = Math.max(sw, sd) / 2 + 0.6; // the shack itself, not just the deck's axis, stays off the pavements
      if (Math.abs(((sx % G) + G) % G - G / 2) < STREET / 2 + pad || Math.abs(((sz % G) + G) % G - G / 2) < STREET / 2 + pad) continue;
      if (grid.hit(sx, sh / 2, sz, Math.max(sw, sd) / 2 + 0.4)) continue;
      solid(core, 'facade', 'shanty', SHANTY_TEX[rand() < 0.6 ? 0 : 1], sx, sh / 2, sz, sw, sh, sd);
      tarps.push({ x: sx, y: sh + 0.08, z: sz, w: sw + 0.7, h: 0.12, d: sd + 0.7, color: pick(rand, TARP) });
      if (rand() < 0.5) lantern(sx + side * 1.6, 1.6, sz);
    }
  }
  tall.sort((a, b) => b.top - a.top);
  let bridged = 0, overStreets = 0; // the spans over streets close them to the flight: not too many
  const airFull = (x: number, y: number, z: number, wx: number, wz: number): boolean => { // an overbuild or a cantilever already there
    for (let k = -2; k <= 2; k++) if (grid.hit(x + wx * k / 5, y, z + wz * k / 5, 1)) return true;
    return false;
  };
  for (let i = 0; i < tall.length && bridged < 90; i++) {
    for (let j = i + 1; j < tall.length && bridged < 90; j++) {
      const a = tall[i], b = tall[j];
      if (a.bridges > 1 || b.bridges > 1) continue;
      const gx = Math.abs(a.x - b.x) - (a.w + b.w) / 2, gz = Math.abs(a.z - b.z) - (a.d + b.d) / 2;
      const lowTop = Math.min(a.top, b.top);
      let y = lowTop * (0.42 + rand() * 0.3);
      const acrossX = gx >= 4 && gx <= 16 && Math.abs(a.z - b.z) < (a.d + b.d) / 2 - 3;
      const acrossZ = !acrossX && gz >= 4 && gz <= 16 && Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 3;
      if ((acrossX ? gx : acrossZ ? gz : 0) >= 12) { // spanning a street: above the auto-flight's canyon band, and not too many of them
        y = Math.max(y, 36);
        if (y > lowTop - 5 || overStreets >= 30) continue;
      }
      // two builds: an enclosed glass tube, or an open catwalk with rails and a string of lanterns
      if (acrossX) {
        const x = (a.x + b.x) / 2 + (a.x < b.x ? (a.w - b.w) / 4 : (b.w - a.w) / 4);
        const z = (a.z + b.z) / 2;
        if (airFull(x, y, z, gx, 0)) continue;
        if (gx >= 12) { roofed.push({ axis: 'z', at: x, t: z, half: 4 }); overStreets += 1; } // over a north–south street: the flight sees a closure
        if (rand() < 0.55) {
          solid(core, 'facade', 'bridge', texOf((s) => s.win === 'curtain'), x, y, z, gx + 0.6, 2.4, 3);
          strips.push({ x, y: y + 1.35, z, w: gx, h: 0.16, d: 0.16, color: '#7de8ff' });
        } else {
          solid(core, 'dark', 'bridge', 0, x, y - 0.9, z, gx + 0.6, 0.3, 2.2);
          for (const s of [-1, 1]) clutter.push({ kind: 'rail', x, y: y - 0.3, z: z + s * 1.05, w: gx + 0.6, h: 0.9, d: 0.05, rotY: 0 });
          for (let u = -gx / 2 + 2; u < gx / 2; u += 4) lantern(x + u, y + 0.6, z);
        }
      } else if (acrossZ) {
        const z = (a.z + b.z) / 2 + (a.z < b.z ? (a.d - b.d) / 4 : (b.d - a.d) / 4);
        const x = (a.x + b.x) / 2;
        if (airFull(x, y, z, 0, gz)) continue;
        if (gz >= 12) { roofed.push({ axis: 'x', at: z, t: x, half: 4 }); overStreets += 1; } // over an east–west street
        if (rand() < 0.55) {
          solid(core, 'facade', 'bridge', texOf((s) => s.win === 'curtain'), x, y, z, 3, 2.4, gz + 0.6);
          strips.push({ x, y: y + 1.35, z, w: 0.16, h: 0.16, d: gz, color: '#7de8ff' });
        } else {
          solid(core, 'dark', 'bridge', 0, x, y - 0.9, z, 2.2, 0.3, gz + 0.6);
          for (const s of [-1, 1]) clutter.push({ kind: 'rail', x: x + s * 1.05, y: y - 0.3, z, w: gz + 0.6, h: 0.9, d: 0.05, rotY: Math.PI / 2 });
          for (let u = -gz / 2 + 2; u < gz / 2; u += 4) lantern(x, y + 0.6, z + u);
        }
      } else continue;
      a.bridges += 1; b.bridges += 1; bridged += 1;
    }
  }

  // -- THE AIR (owner: flying vehicles): corridors above the avenues in both
  // directions, a ring round the core, two low patrols over the streets;
  // every point lifted clear of the skyline under the legs it joins; pads
  // on the six tallest roofs -------------------------------------------------
  const lift = (pts: [number, number, number][], loop: boolean, clear: number): [number, number, number][] => {
    const tops = pts.map(([x, , z], i) => {
      if (!loop && i === pts.length - 1) return 0;
      const [nx, , nz] = pts[(i + 1) % pts.length];
      let top = 0;
      for (let k = 0; k <= 16; k++) { const t = k / 16; top = Math.max(top, grid.ceilingAt(x + (nx - x) * t, z + (nz - z) * t)); }
      return top;
    });
    return pts.map(([x, y, z], i) => {
      const prev = tops[(i - 1 + tops.length) % tops.length], next = tops[i];
      return [x, Math.max(y, (loop || i > 0 ? prev : 0) + clear, (loop || i < pts.length - 1 ? next : 0) + clear), z];
    });
  };
  const air: AirLane[] = [];
  air.push({ kind: 'avenue', loop: true, speed: 0.42, pts: lift([[-REACH, 58, -8], [REACH, 58, -8], [REACH + 20, 62, 0], [REACH, 66, 8], [-REACH, 66, 8], [-REACH - 20, 62, 0]], true, 10) });
  air.push({ kind: 'avenue', loop: true, speed: 0.4, pts: lift([[8, 74, -REACH], [8, 74, REACH], [0, 78, REACH + 20], [-8, 82, REACH], [-8, 82, -REACH], [0, 78, -REACH - 20]], true, 10) });
  const ring: [number, number, number][] = [];
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ring.push([Math.cos(a) * 212, 96, Math.sin(a) * 212]); }
  air.push({ kind: 'ring', loop: true, speed: 0.5, pts: lift(ring, true, 12) });
  air.push({ kind: 'patrol', loop: true, speed: 0.16, pts: lift([[streetAt(-2), 30, streetAt(-2)], [streetAt(2), 30, streetAt(-2)], [streetAt(2), 30, streetAt(2)], [streetAt(-2), 30, streetAt(2)]], true, 8) });
  air.push({ kind: 'patrol', loop: true, speed: 0.15, pts: lift([[streetAt(-5), 30, streetAt(-1)], [streetAt(-1), 30, streetAt(-1)], [streetAt(-1), 30, streetAt(-5)], [streetAt(-5), 30, streetAt(-5)]], true, 8) });
  const pads = tall.slice(0, 6).map((t) => ({ x: t.x, y: t.top + 0.2, z: t.z }));
  for (const p of pads) grid.add({ x: p.x, y: p.y, z: p.z, w: 6, h: 0.4, d: 6 });

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
    ...extraBeacons,
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
   *  first closed segment, the first span roofing the street, or the fence. */
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
    for (const o of roofed) {
      if (o.axis !== axis || Math.abs(o.at - at) > 1) continue;
      const d = dir > 0 ? o.t - o.half - from : from - (o.t + o.half);
      if (d >= 0) room = Math.min(room, d);
    }
    return Math.max(0, room);
  };

  return {
    core, outer, sprawl, strips, leds, awnings, tarps, clutter, signs, posts, lanterns, wires, vents, holos, stalls, sprawlLamps, neon,
    beacons, pois, streets, stadium, wheel, mega, stacks, bridges, styles, sprawlTex, grid, landmark, roomAhead, air, pads,
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
interface Orbit { x: number; z: number; y: number; yTo: number; r: number; a: number; da: number; focus: Poi }
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
        // hemmed in: the knot's own tangent leads into a wall and every leg bulges along it — shorten it, so the
        // legs leave straighter (the leg into the knot must stay clear; the leg being flown is never reshaped)
        if (this.knots.length - 1 > this.seg + 1) {
          const old = last.t.clone();
          last.t.setLength(Math.max(6, last.t.length() * 0.6));
          if (!this.legClear(this.knots.length - 2)) last.t.copy(old);
        }
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
    if (chord < 20) return false; // a stub leg under a long tangent loops — never flown // a stub leg under a long tangent loops — never flown
    // no doubling back: a leg that leaves against the tangent it inherits
    // (in plan — a drop can hide a reversal) bends through a near-cusp,
    // and the pace would sag in it; and no plunge: a leg never rises or
    // falls more than six tenths of its run
    const cx = c.p.x - last.p.x, cz = c.p.z - last.p.z, ch = Math.hypot(cx, cz);
    const th = Math.hypot(last.t.x, last.t.z);
    const dy = Math.abs(c.p.y - last.p.y);
    if (ch > dy && th > 1 && (last.t.x * cx + last.t.z * cz) < -0.2 * th * ch) return false; // (a mostly vertical leg may turn about)
    if (last.p.y - c.p.y > (c.phase === 'canyon' ? 0.8 : 0.6) * ch + 4) return false; // (a canyon leg dives steeper)
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
        // sized to the mean chord, but never much past the shorter one — a
        // long leg into a short one would otherwise overshoot the knot
        const len = Math.min(((last.k + k) / 2) * (prevChord + chord) / 2, 1.2 * Math.min(prevChord, chord));
        last.t.copy(through).setLength(len);
        if (!this.legClear(i - 1) || !this.legClear(i)) {
          last.t.setLength(len * 0.5); // a shorter re-aim bulges less
          if (!this.legClear(i - 1) || !this.legClear(i)) last.t.copy(old);
        }
      }
    }
    return true;
  }

  /** The skyline at a point: the top of the tallest thing right under it, read from the solids themselves (a
   *  cell's maximum would be a spike two lots away — the flight cruised at the spires' height and no street had
   *  room for a dive from there). */
  private skylineAt(x: number, z: number): number {
    for (let y = 214; y >= 30; y -= 8) if (this.grid.hit(x, y, z, FLY_PAD + 0.4)) return y + 8;
    return 30;
  }
  /** The skyline under a chord: the tallest top sampled along it. */
  private ceilingAlong(a: Vector3, b: Vector3): number {
    let top = 0;
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      top = Math.max(top, this.skylineAt(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t));
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

  /** A landmark worth circling: beside us or ahead, at a distance that
   *  makes a good radius — the orbit starts where the flight already is,
   *  so its first leg is a normal leg, and sinks toward its height as it
   *  goes round. */
  private pickOrbit(last: Vector3, heading: number): Orbit | null {
    let best: Poi | null = null, bestScore = 0;
    const hx = Math.sin(heading), hz = Math.cos(heading);
    for (const p of this.pois) {
      const d = Math.hypot(p.x - last.x, p.z - last.z);
      if (d < 48 || d > 130) continue;
      if ((hx * (p.x - last.x) + hz * (p.z - last.z)) / d < -0.2) continue; // not behind us
      // the whole circle must fit inside the fence
      if (Math.max(Math.abs(p.x), Math.abs(p.z)) + d > EXT - 40) continue;
      const score = p.w * (1 - d / 300) * (0.5 + this.rand());
      if (score > bestScore) { best = p; bestScore = score; }
    }
    if (!best) return null;
    const r = Math.hypot(best.x - last.x, best.z - last.z);
    // the skyline under the circle: the orbit flies above it (owner: the supertalls hemmed an orbit in)
    let top = 0;
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; top = Math.max(top, this.grid.ceilingAt(best.x + Math.sin(a) * r, best.z + Math.cos(a) * r)); }
    if (top > 170) return null;
    // turn the way we are already turning about it
    const cross = hx * (best.z - last.z) - hz * (best.x - last.x);
    const da = (cross > 0 ? 1 : -1) * 0.85;
    const a = Math.atan2(last.x - best.x, last.z - best.z);
    return { x: best.x, z: best.z, y: Math.max(last.y, top + 14), yTo: clamp(Math.max(best.y * 0.9 + 16, top + 14), 44, 200), r, a, da, focus: best };
  }

  private propose(last: Vector3, tan: Vector3, tries: number, forceY?: number): Proposal {
    const s = this.st;
    const r = this.rand;
    const streetDir = () => (s.axis === 'x' ? new Vector3(s.dir, 0, 0) : new Vector3(0, 0, s.dir));
    if (s.phase === 'orbit' && s.orbit) {
      const o = s.orbit;
      o.a += o.da;
      o.y += (o.yTo - o.y) * 0.3; // sinking (or rising) toward the landmark's height, a third at a time
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
      p.y = clamp(Math.max(Math.min(p.y, last.y + dist * (0.5 + 0.015 * tries)), last.y - dist * 0.5, ceil + 10), 34, 210); // (a leg refused again and again climbs steeper: hemmed in low, the way out is up)
      s.cool = Math.max(0, s.cool - 1);
      if (--s.left <= 0) {
        // what next: circle a landmark (now and then), run an avenue low
        // (when one is near), or — mostly — dive a street
        const a = s.retry > 0 && s.retry < 4 ? 1 : r(); // a refused dive is tried again elsewhere before anything else
        const orbit = a < 0.16 && s.cool === 0 && tries === 0 ? this.pickOrbit(p, s.heading) : null;
        if (orbit) {
          s.orbit = orbit; s.phase = 'orbit'; s.left = 3 + Math.floor(r() * 3); this.orbits += 1;
          // the circle runs through this very knot: the first leg is its first step
          orbit.a += orbit.da;
          orbit.y += (orbit.yTo - orbit.y) * 0.3;
          p.set(orbit.x + Math.sin(orbit.a) * orbit.r, orbit.y, orbit.z + Math.cos(orbit.a) * orbit.r);
          dir.set(Math.cos(orbit.a), 0, -Math.sin(orbit.a)).multiplyScalar(Math.sign(orbit.da));
          return { p, dir, dive: false, phase: 'orbit', focus: orbit.focus, k: 1.0 };
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
      const room = this.room(s.axis, s.street, along, s.dir);
      const perp = s.axis === 'x' ? last.z : last.x;
      const dist = s.dir * (along - (s.axis === 'x' ? last.x : last.z));
      // THE KNOT OVER THE STREET: an avenue flyover runs low from the start; a dive first ALIGNS with the street
      // at its own height, coming down no faster than half its run (the leg is validated like every other), and
      // only then plunges along the street's centre, where nothing stands but what roofs it — and the run the
      // whole dive needs (the plunge to the band, a leg in it, the climb out) must lie open ahead: no closed
      // segment, no span roofing the street, no skybridge over it, not the fence. A canyon under supertalls is
      // too deep to dive.
      const py = s.avenue ? 36 + r() * 10 : Math.max(42 + r() * 10, last.y - dist * 0.5);
      const need = s.avenue ? 120 : (py - 26) / 0.7 + 45 + 70;
      if (room < need || Math.abs(perp) > EXT || (!s.avenue && ceil > 150)) {
        s.phase = 'cruise'; s.left = 1; s.avenue = false; s.retry += 1; // one more cruise leg, then try a street again
        return this.propose(last, tan, tries, forceY);
      }
      p.y = py;
      const phase: Phase = s.avenue ? 'flyover' : 'dive';
      s.heading = s.axis === 'x' ? (s.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (s.dir > 0 ? 0 : Math.PI);
      if (!s.avenue && py > 52.01) { // still high: this leg aligns and brings the height down; the next comes back here lower
        const dir0 = streetDir(); dir0.y = -0.35;
        return { p, dir: dir0, dive: false, phase };
      }
      s.retry = 0;
      s.phase = 'canyon';
      s.left = s.avenue ? 3 + Math.floor(r() * 2) : Math.max(1, Math.min(2 + Math.floor(r() * 3), 1 + Math.floor((room - need) / 70)));
      const dir = streetDir(); dir.y = -0.45; // nosing down, already aligned with the street
      return { p, dir, dive: !s.avenue, phase };
    }
    if (s.phase === 'canyon') {
      const here = s.axis === 'x' ? last.x : last.z;
      if (this.room(s.axis, s.street, here, s.dir) < 115) { s.phase = 'climb'; return this.propose(last, tan, tries, forceY); } // a leg and the climb out must fit before the street closes
      const along = here + s.dir * (45 + r() * 25);
      if (Math.abs(along) > EXT - 110) { s.phase = 'climb'; return this.propose(last, tan, tries, forceY); } // the core ends: climb out while there is room
      // the dives stay above the street's life (owner: raise them), and a
      // canyon leg never falls more than half its run — the descent from the
      // dive knot is spread over the first legs
      const band = s.avenue ? 22 + r() * 12 : 20 + r() * 12;
      const y = Math.max(band, last.y - Math.abs(along - here) * 0.75); // steep, as a dive should be (the plunge rule allows a canyon leg this much)
      const lat = s.street + (r() - 0.5) * 1.4;
      if (y <= band + 0.01 && --s.left <= 0) s.phase = 'climb';
      return { p: s.axis === 'x' ? new Vector3(along, y, lat) : new Vector3(lat, y, along), dir: streetDir(), dive: false, phase: 'canyon' };
    }
    // climb: out of the canyon, back to the rooftops, still heading along
    // the street — in two legs when the rise is steeper than half the run
    const from = s.axis === 'x' ? last.x : last.z;
    const ahead = this.room(s.axis, s.street, from, s.dir); // the climb ends before the street closes
    const along = clamp(from + s.dir * Math.min(60 + r() * 30, Math.max(30, ahead - 8)), -(EXT - 40), EXT - 40);
    const run = Math.abs(along - from);
    let y = forceY ?? 64 + r() * 56;
    const split = y - last.y > run * 0.5 && Math.abs(along + s.dir * 80) < EXT - 40 && ahead > run + 90;
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
