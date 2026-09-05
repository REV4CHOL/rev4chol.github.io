/** PEOPLE — the city's pedestrians as lives, not dots (owner: NPCs going
 *  about their business, interacting). Everyone has an ACT: walking a
 *  pavement or an alley; stopping to look at something; standing in a knot
 *  of two or three, talking (knots dissolve and re-form — one leaves, and
 *  a walker from far off is sent along the pavement to take the place);
 *  browsing a market stall; crossing a street at the crosswalk when the
 *  cars have the red; vending from inside a stall; sitting on a step. In a
 *  market zone (a flea lot, the night market's median) people mill between
 *  the stalls instead of following a kerb. Everyone is someone from the
 *  CAST — a kid, an elder with a cane, a courier, a suit, a punk, a cop, an
 *  android — each kind at its own pace (owner: a lot of variety). Pure: no
 *  DOM, no renderer; the renderer draws each person's position, heading,
 *  kind and animation frame. */
import { ARTERIAL, ARTERIAL_ROW, CANAL, Stall, Street } from './city-plan';

/** Walking, or paused, or talking in a knot, or browsing a stall, or crossing a road, or vending, or sitting,
 *  or milling in a market — or going in at a door (enter), gone a while (inside), coming out (exit). */
export type Act = 'walk' | 'stand' | 'talk' | 'browse' | 'cross' | 'vend' | 'sit' | 'mill' | 'enter' | 'inside' | 'exit' | 'wait';
/** The water's edge either side of the canal: no pavement crosses it (the bridges carry the road alone; their decks are
 *  flush with the quays, whose coping is walked). */
const QUAY = CANAL.w / 2 + 0.5;
/** A road's pavement stops short of the crossing street: the corner, where the next pavement begins. */
const CORNER = 6.2;
/** Animation frames in the sprite sheet: walk A/B, stand, sit, talk (a hand
 *  up), phone (lit, at the face), vend (arms on the counter), sit with a phone. */
export const FRAME = { walkA: 0, walkB: 1, stand: 2, sit: 3, talk: 4, phone: 5, vend: 6, sitPhone: 7 } as const;
/** The cast: who walks these streets, by weight, and their pace as a
 *  multiple of a walker's (the elders slow, the couriers quick). The
 *  renderer draws each kind its own way. */
export const CAST = [
  { name: 'civ', weight: 22, pace: 1 }, { name: 'coat', weight: 10, pace: 1 }, { name: 'dress', weight: 9, pace: 1 },
  { name: 'hood', weight: 8, pace: 1.05 }, { name: 'heavy', weight: 5, pace: 0.85 }, { name: 'kid', weight: 6, pace: 0.95 },
  { name: 'punk', weight: 4, pace: 1 }, { name: 'suit', weight: 6, pace: 1.12 }, { name: 'elder', weight: 5, pace: 0.55 },
  { name: 'cyber', weight: 6, pace: 1 }, { name: 'vendor', weight: 1, pace: 0.9 }, { name: 'courier', weight: 3, pace: 1.4 },
  { name: 'android', weight: 3, pace: 1 }, { name: 'robe', weight: 3, pace: 0.8 }, { name: 'worker', weight: 4, pace: 0.95 },
  { name: 'cop', weight: 2, pace: 0.9 },
] as const;
export type KindName = (typeof CAST)[number]['name'];
export const KIND = Object.fromEntries(CAST.map((c, i) => [c.name, i])) as Record<KindName, number>;
const CAST_TOTAL = CAST.reduce((a, c) => a + c.weight, 0);
export interface Person {
  x: number; y: number; z: number; yaw: number;
  act: Act; frame: number;
  /** Who this is (an index into CAST) and their pace, a multiple of a walker's. */
  kind: number; pace: number;
  /** The pavement being walked, the offset from its axis, the parameter along it, the pace. */
  st: Street | null; off: number; t: number; v: number;
  timer: number; phase: number;
  /** The knot being talked in, the knot being walked to, the stall being browsed or vended. */
  knot: Knot | null; goal: Knot | null; stall: Stall | null;
  /** The market zone being milled about in, and the heading in it. */
  zone: Zone | null; hx: number; hz: number;
  /** Crossing: the kerb offset being walked toward. */
  offTo: number;
  /** The cross street's carriageway being walked through (or waited for at its kerb), or the crosswalk of their own
   *  street being crossed: the traffic holds its lanes at that node while anyone is in it. */
  cross: Crossing | null;
}
interface Knot { x: number; z: number; st: Street; off: number; t: number; members: Person[]; want: number }
export interface Zone { x: number; z: number; w: number; d: number; stalls: Stall[] }
/** Where a pavement runs through another street's carriageway: its centre along the pavement's street, half its
 *  reach along it, the node, and the axes of the streets crossed there ('d' the boulevard). */
export interface Crossing { tc: number; half: number; nx: number; nz: number; axes: Axis[]; tNear: number; tFar: number }
export type Axis = 'x' | 'z' | 'd';
/** Whether the cars along the given axis have the red at the crossing at (x, z) — false where there is no light. */
export type CrossOK = (x: number, z: number, axis: Axis) => boolean;
export interface PeopleOpts {
  /** Something solid stands at (x, y, z) — a wall, a kiosk, a stall's leg: nobody walks through it. */
  solid?: (x: number, y: number, z: number) => boolean;
  /** No vehicle is on or bearing down on the crosswalk at (x, z): an unlit crossing may be walked. */
  roadClear?: (x: number, z: number) => boolean;
  /** The doors of the city (lit shopfronts, station entrances): the only places anyone goes in or comes out. */
  doors?: { x: number; z: number }[];
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export class People {
  readonly people: Person[] = [];
  readonly knots: Knot[] = [];
  private readonly walkable: Street[];
  private readonly weights: number[];
  private readonly total: number;
  tick = 0;
  /** Crossings made, for the record. */
  crossings = 0;

  /** Who is in which crosswalk this frame, by node and axis (see walkersIn). */
  private crossers = new Map<string, number>();
  private readonly solid?: (x: number, y: number, z: number) => boolean;
  private readonly roadClear?: (x: number, z: number) => boolean;
  /** Each pavement's crossings of other carriageways, by parameter; each road's doors, by parameter and side. */
  private readonly xings = new Map<Street, Crossing[]>();
  private readonly doors: Map<Street, { t: number; side: number }[]> | null;

  constructor(
    streets: Street[], zones: Zone[], stalls: Stall[], private readonly rand: () => number, n: number,
    private readonly crossOK: CrossOK = () => false, private readonly nodes: number[] = [], opts: PeopleOpts = {},
  ) {
    this.solid = opts.solid; this.roadClear = opts.roadClear;
    this.walkable = streets.filter((s) => s.kind === 'road' || s.kind === 'alley' || s.kind === 'diagonal' || s.kind === 'catwalk' || s.kind === 'arterial');
    // where each pavement runs through another carriageway (a walker waits at its kerb for the red, or for a gap)
    const ways = streets.filter((s) => s.kind === 'road' || s.kind === 'diagonal' || s.kind === 'arterial');
    for (const st of this.walkable) {
      if (st.kind !== 'road' && st.kind !== 'diagonal' && st.kind !== 'arterial') continue;
      const list: Crossing[] = [];
      for (const o of ways) {
        if (o === st) continue;
        const den = st.dx * o.dz - st.dz * o.dx;
        if (Math.abs(den) < 0.05) continue;
        const rx = o.x0 - st.x0, rz = o.z0 - st.z0;
        const tc = (rx * o.dz - rz * o.dx) / den, to = (rx * st.dz - rz * st.dx) / den;
        if (tc < 1 || tc > st.len - 1 || to < -0.5 || to > o.len + 0.5) continue;
        const half = (o.kind === 'diagonal' ? 4.9 : o.kind === 'arterial' ? o.width / 2 : 5) / Math.abs(den);
        const axis: Axis = o.kind === 'diagonal' ? 'd' : o.dx !== 0 ? 'x' : 'z';
        const near = list.find((c) => Math.abs(c.tc - tc) < 4); // a six-way crossing: one box, every street's cars
        if (near) { near.half = Math.max(near.half, half + Math.abs(near.tc - tc) / 2); near.tc = (near.tc + tc) / 2; if (!near.axes.includes(axis)) near.axes.push(axis); }
        else list.push({ tc, half, nx: st.x0 + st.dx * tc, nz: st.z0 + st.dz * tc, axes: [axis], tNear: 0, tFar: 0 });
      }
      if (list.length) this.xings.set(st, list.sort((a, b) => a.tc - b.tc));
    }
    if (opts.doors) {
      this.doors = new Map();
      for (const d of opts.doors) {
        for (const st of this.walkable) {
          if (st.kind !== 'road') continue;
          const t = (d.x - st.x0) * st.dx + (d.z - st.z0) * st.dz;
          if (t < 3 || t > st.len - 3) continue;
          const lat = -(d.x - st.x0) * st.dz + (d.z - st.z0) * st.dx;
          if (Math.abs(lat) < st.width / 2 - 1 || Math.abs(lat) > st.width / 2 + 2) continue;
          const l = this.doors.get(st) ?? [];
          l.push({ t, side: Math.sign(lat) });
          this.doors.set(st, l);
        }
      }
    } else this.doors = null;
    this.weights = this.walkable.map((s) => (s.kind === 'alley' ? s.len * 3 : s.kind === 'catwalk' ? s.len * 2 : s.kind === 'arterial' ? s.len * 1.5 : s.len));
    this.total = this.weights.reduce((a, b) => a + b, 0);
    const r = rand;
    for (const st of stalls) { // a vendor in every stall
      const p = this.person();
      p.kind = KIND.vendor; p.pace = 0.9;
      p.act = 'vend'; p.stall = st; p.x = st.x; p.z = st.z + 0.3; p.yaw = r() < 0.5 ? 0 : Math.PI; p.frame = FRAME.vend;
    }
    for (let i = 0, knots = Math.max(8, Math.floor(n / 45)); i < knots; i++) { // knots of talk on the pavements (never on the water)
      let st = this.pickStreet();
      let t = 6 + r() * Math.max(1, st.len - 12);
      while (this.overWater(st, t)) { st = this.pickStreet(); t = 6 + r() * Math.max(1, st.len - 12); }
      const off = this.kerb(st);
      const k: Knot = { x: st.x0 + st.dx * t - st.dz * off, z: st.z0 + st.dz * t + st.dx * off, st, off, t, members: [], want: 2 + Math.floor(r() * 2) };
      this.knots.push(k);
      for (let m = 0; m < k.want; m++) this.join(this.person(), k);
    }
    for (const zone of zones) { // the markets' crowds
      const count = Math.max(6, Math.floor(zone.w * zone.d / 28));
      for (let i = 0; i < count; i++) {
        const p = this.person();
        p.zone = zone; p.act = 'mill';
        this.placeInZone(p);
        const a = r() * Math.PI * 2;
        p.hx = Math.sin(a); p.hz = Math.cos(a); p.yaw = a;
        p.v = (0.012 + r() * 0.014) * p.pace;
      }
    }
    while (this.people.length < n) { // and the walkers
      const p = this.person();
      const st = this.pickStreet();
      this.walkOn(p, st, this.kerb(st), r() * st.len, r() < 0.5 ? 1 : -1);
      if (r() < 0.08) { p.act = 'stand'; p.timer = 100 + r() * 300; p.frame = this.idleFrame(); }
      else if (r() < 0.05 && st.kind !== 'alley' && st.kind !== 'catwalk') { p.act = 'sit'; p.frame = this.sitFrame(); p.timer = 400 + r() * 900; p.off = this.sitOff(p, st); }
    }
    for (const p of this.people) this.place(p);
  }

  private person(): Person {
    let pick = this.rand() * CAST_TOTAL, kind = 0;
    for (let i = 0; i < CAST.length; i++) { pick -= CAST[i].weight; if (pick <= 0) { kind = i; break; } }
    const p: Person = {
      x: 0, y: 0, z: 0, yaw: 0, act: 'walk', frame: 0, kind, pace: CAST[kind].pace * (0.85 + this.rand() * 0.3),
      st: null, off: 0, t: 0, v: 0, timer: 0, phase: Math.floor(this.rand() * 40), knot: null, goal: null, stall: null,
      zone: null, hx: 0, hz: 1, offTo: 0, cross: null,
    };
    this.people.push(p);
    return p;
  }

  private pickStreet(): Street {
    let pick = this.rand() * this.total;
    for (let i = 0; i < this.walkable.length; i++) { pick -= this.weights[i]; if (pick <= 0) return this.walkable[i]; }
    return this.walkable[this.walkable.length - 1];
  }

  /** The side of a quay road away from the water (its water-side pavement passes under every bridge deck: not walked), else 0. */
  private landSide(st: Street): number {
    return st.kind === 'road' && st.dx === 0 && Math.abs(Math.abs(st.x0) - (CANAL.w / 2 + 7)) < 0.6 ? -Math.sign(st.x0) : 0;
  }
  /** The door on this road, on this side, within a few steps of t — or, with no door list, anywhere (the tests' city). */
  private doorNear(st: Street, t: number, side: number): number | null {
    if (!this.doors) return t;
    const list = this.doors.get(st);
    if (!list) return null;
    let best: number | null = null;
    for (const d of list) if (d.side === side && Math.abs(d.t - t) < 3 && (best === null || Math.abs(d.t - t) < Math.abs(best - t))) best = d.t;
    return best;
  }
  /** The next cross street's carriageway along the way, when its near kerb is underfoot. */
  private crossingAhead(st: Street, t: number, v: number): Crossing | null {
    const list = this.xings.get(st);
    if (!list) return null;
    const dir = Math.sign(v) || 1;
    for (const c of list) {
      if (dir * (c.tc - t) <= 0) continue; // behind, or past the centre
      const tNear = c.tc - dir * (c.half + 0.3);
      if (dir * (tNear - t) > 0.05) continue; // not there yet
      return { ...c, tNear, tFar: c.tc + dir * (c.half + 0.3) };
    }
    return null;
  }
  /** The crossing may be walked: every street crossed has the red, or nothing is on or bearing down on the crosswalk. */
  private mayCross(c: Crossing): boolean {
    if (c.axes.every((a) => this.crossOK(c.nx, c.nz, a))) return true;
    return this.roadClear !== undefined && this.roadClear(c.nx, c.nz);
  }
  /** How many walkers are in the crosswalks of the street along `axis` at the node at (x, z) right now. */
  walkersIn(x: number, z: number, axis: Axis): number {
    return this.crossers.get(`${Math.round(x)}:${Math.round(z)}:${axis}`) ?? 0;
  }
  /** Where a street's walkers belong: the |offset| band of its pavement — a road's pavement inside its width (the lamp
   *  posts stand at the kerb), the boulevard's past its edge lines, the arterial's beyond its apron (16.9–17.7 from its
   *  axis: the lamps stand at 16.4, the building line at 18.5); an alley or a catwalk is walked anywhere across. */
  private band(s: Street): [number, number] {
    if (s.kind === 'alley') return [0, (s.width - 1.5) / 2];
    if (s.kind === 'catwalk') return [0, (s.width - 0.9) / 2];
    if (s.kind === 'diagonal') return [s.width / 2 + 0.4, s.width / 2 + 0.8];
    if (s.kind === 'arterial') return [ARTERIAL_ROW - ARTERIAL.walk + 0.8, ARTERIAL_ROW - 0.8];
    return [s.width / 2 - 1.7, s.width / 2 - 0.3];
  }
  /** A pavement offset: a kerb side of a road (the pavement's outer half), anywhere across an alley or a catwalk, the
   *  boulevard's or the arterial's pavement band. */
  private kerb(st: Street): number {
    const [lo, hi] = this.band(st);
    if (st.kind === 'alley' || st.kind === 'catwalk') return (this.rand() - 0.5) * 2 * hi;
    const side = this.landSide(st) || (this.rand() < 0.5 ? 1 : -1);
    if (st.kind === 'road') return side * (st.width / 2 - 1 + this.rand() * 0.7);
    return side * (lo + this.rand() * (hi - lo));
  }
  /** Where a sitter sits: against the wall, on the pavement (owner: they sat inside the wall). */
  private sitOff(p: Person, st: Street): number {
    const s = this.landSide(st) || Math.sign(p.off || 1);
    return st.kind === 'road' ? s * (st.width / 2 - 0.25) : st.kind === 'diagonal' ? s * (st.width / 2 + 0.9) : st.kind === 'arterial' ? s * (ARTERIAL_ROW - 0.4) : p.off;
  }
  /** An offset on a street from a lateral distance to its axis, kept where its walkers belong. */
  private offOn(s: Street, lat: number): number {
    const [lo, hi] = this.band(s);
    if (s.kind === 'alley' || s.kind === 'catwalk') return clamp(lat, -hi, hi);
    return (this.landSide(s) || Math.sign(lat || 1)) * clamp(Math.abs(lat), lo, hi);
  }

  /** The canal's water and its bridges, on an east–west road. */
  private overWater(st: Street, t: number): boolean {
    return st.kind === 'road' && st.dz === 0 && Math.abs(st.x0 + st.dx * t) < QUAY;
  }
  /** How far in from a road's end (`a` at t = 0, `b` at t = len) the pavement runs: the crossing street's road lies
   *  past it — or what the plan says lies there (a run ending on the arterial's axis stops at the arterial's pavement). */
  private endOf(st: Street, end: 'a' | 'b'): number {
    const pad = st.ends?.[end];
    if (pad !== undefined) return Math.min(pad, st.len / 2);
    return st.kind === 'road' || st.kind === 'diagonal' || st.kind === 'arterial' ? Math.min(CORNER, st.len / 2) : st.kind === 'catwalk' ? Math.min(0.6, st.len / 2) : 0;
  }
  /** The same kerb side the walker is on, a fresh offset (never across the road in a step). */
  private sameSide(p: Person, st: Street): number {
    const [lo, hi] = this.band(st);
    if (st.kind === 'alley' || st.kind === 'catwalk') return clamp(p.off, -hi, hi);
    const side = this.landSide(st) || Math.sign(p.off || 1);
    if (st.kind === 'road') return side * (st.width / 2 - 1 + this.rand() * 0.7);
    return side * (lo + this.rand() * (hi - lo));
  }

  private walkOn(p: Person, st: Street, off: number, t: number, dir: 1 | -1): void {
    const a = this.endOf(st, 'a'), b = this.endOf(st, 'b');
    p.st = st; p.off = off; p.t = clamp(t, a, st.len - b);
    if (this.solid) for (let k = 0; k < 6 && this.solid(st.x0 + st.dx * p.t - st.dz * p.off, 0.9, st.z0 + st.dz * p.t + st.dx * p.off); k++) p.t = clamp(p.t + dir * 2, a, st.len - b); // not inside a kiosk
    p.v = (0.016 + this.rand() * 0.02) * p.pace * dir;
    p.act = 'walk'; p.knot = null; p.goal = null; p.stall = null; p.zone = null; p.cross = null;
    p.timer = 400 + this.rand() * 1800; // until the next pause
  }

  /** Standing about: most just stand, a third look at their phone. */
  private idleFrame(): number { return this.rand() < 0.35 ? FRAME.phone : FRAME.stand; }
  private sitFrame(): number { return this.rand() < 0.4 ? FRAME.sitPhone : FRAME.sit; }

  private join(p: Person, k: Knot): void {
    p.act = 'talk'; p.knot = k; p.goal = null; p.st = k.st; p.off = k.off; p.t = k.t; p.v = 0;
    k.members.push(p);
    p.x = k.x; p.z = k.z; p.y = k.st.y; // in the knot from this frame (a member's place on its ring is a step away)
    p.timer = 600 + this.rand() * 1400;
    p.frame = FRAME.stand;
  }

  private placeInZone(p: Person): void {
    const z = p.zone!;
    for (let tries = 0; tries < 20; tries++) {
      const x = z.x + (this.rand() - 0.5) * (z.w - 2), zz = z.z + (this.rand() - 0.5) * (z.d - 2);
      if (!this.inStall(z, x, zz)) { p.x = x; p.z = zz; return; }
    }
    p.x = z.x; p.z = z.z;
  }

  private inStall(z: Zone, x: number, zz: number): Stall | null {
    for (const s of z.stalls) if (Math.abs(x - s.x) < 1.9 && Math.abs(zz - s.z) < 1.6) return s;
    return null;
  }

  /** The kerb point of the street being walked (the market people keep their own x, z); someone inside a building is out of sight. */
  private place(p: Person): void {
    if (p.act === 'mill' || p.act === 'browse' || p.act === 'vend' || p.act === 'talk') { p.y = p.st?.y ?? 0; return; }
    const st = p.st;
    if (!st) return;
    p.x = st.x0 + st.dx * p.t - st.dz * p.off;
    p.z = st.z0 + st.dz * p.t + st.dx * p.off;
    p.y = p.act === 'inside' ? -4 : st.y;
  }

  /** The pavement ends at the corner: round it onto the street that meets it here — its pavement is a step
   *  away, so the walker keeps their place (owner: no one vanishes) — or turn about. */
  private turnCorner(p: Person): void {
    const st = p.st!, r = this.rand;
    const t = clamp(p.t, 0, st.len);
    const x = st.x0 + st.dx * t - st.dz * p.off, z = st.z0 + st.dz * t + st.dx * p.off;
    const options: { s: Street; t: number; off: number }[] = [];
    for (const s of this.walkable) {
      if (s === st) continue;
      if (Math.abs(s.y - st.y) > 1.5) continue; // a raised walk meets only what stands at its height
      const u = (x - s.x0) * s.dx + (z - s.z0) * s.dz;
      if (u < this.endOf(s, 'a') || u > s.len - this.endOf(s, 'b')) continue;
      const lat = -(x - s.x0) * s.dz + (z - s.z0) * s.dx;
      const [lo, hi] = this.band(s);
      if (Math.abs(lat) > hi + 2.5 || Math.abs(lat) < lo - 2.5) continue; // its pavement is a step away, not its carriageway
      const off = this.offOn(s, lat);
      const nx = s.x0 + s.dx * u - s.dz * off, nz = s.z0 + s.dz * u + s.dx * off;
      if (Math.hypot(nx - x, nz - z) > 2.4) continue; // the next pavement must begin where this one ends
      options.push({ s, t: u, off });
    }
    if (options.length) {
      const o = options[Math.floor(r() * options.length)];
      this.walkOn(p, o.s, o.off, o.t, r() < 0.5 ? 1 : -1);
      return;
    }
    p.v = -p.v; p.t = clamp(p.t, this.endOf(st, 'a'), st.len - this.endOf(st, 'b')); p.goal = null;
  }

  /** Crossings along a road: the street centres it crosses, as its own parameter. */
  private nearestCrossing(st: Street, t: number): number | null {
    let best: number | null = null;
    for (const c of this.nodes) {
      if (Math.abs(c) < 30) continue; // the avenues take the streets' places there: no crossing street, no crosswalk
      const tc = st.dx ? (c - st.x0) / st.dx : (c - st.z0) / st.dz;
      if (tc < 4 || tc > st.len - 4) continue;
      if (best === null || Math.abs(tc - t) < Math.abs(best - t)) best = tc;
    }
    return best;
  }

  /** A knot keeps its number: when it thins, a walker already on its pavement, a way off, is sent along to
   *  take the place (owner: no one is moved across the city to fill it). */
  private tendKnot(k: Knot): void {
    if (k.members.length >= k.want || this.rand() > 0.004) return;
    const far = this.people.find((q) => q.act === 'walk' && !q.goal && q.st === k.st && Math.sign(q.off) === Math.sign(k.off)
      && Math.abs(q.t - k.t) > 8 && Math.abs(q.t - k.t) < 70);
    if (!far) return;
    far.v = Math.abs(far.v) * (k.t > far.t ? 1 : -1);
    far.goal = k;
    far.timer = 1e9; // no pausing on the way
  }

  /** One frame of everybody. */
  step(): void {
    this.tick += 1;
    const r = this.rand;
    for (const k of this.knots) this.tendKnot(k);
    for (const p of this.people) {
      switch (p.act) {
        case 'walk': {
          const st = p.st!;
          p.t += p.v;
          if (this.solid) { // never through a wall, a kiosk, a stall's leg (owner: they walked through buildings): step in toward the kerb, else turn about
            const x = st.x0 + st.dx * p.t - st.dz * p.off, z = st.z0 + st.dz * p.t + st.dx * p.off;
            if (this.solid(x, 0.9, z)) {
              const [lo, hi] = this.band(st), sg = Math.sign(p.off || 1);
              const tryOff = [sg * Math.max(lo, Math.abs(p.off) - 0.7), sg * Math.min(hi, Math.abs(p.off) + 0.7)] // toward the kerb (a vending machine at the wall), toward the wall (a leg at the kerb)
                .find((o) => Math.abs(Math.abs(o) - Math.abs(p.off)) > 0.05 && !this.solid(st.x0 + st.dx * p.t - st.dz * o, 0.9, st.z0 + st.dz * p.t + st.dx * o));
              if (tryOff !== undefined) p.off = tryOff;
              else { p.t -= p.v; p.v = -p.v; p.goal = null; }
            }
          }
          if (p.cross) { // through a cross street's carriageway: clear of it past its far kerb
            if ((p.v > 0 && p.t > p.cross.tFar) || (p.v < 0 && p.t < p.cross.tFar)) p.cross = null;
          } else {
            const c = this.crossingAhead(st, p.t, p.v);
            if (c) {
              if (this.mayCross(c)) p.cross = c;
              else { // wait at the kerb for the red, or for a gap (owner: they walked into the traffic)
                p.t = c.tNear; p.act = 'wait'; p.cross = c; p.timer = 10 + r() * 14; p.frame = FRAME.stand;
                p.yaw = Math.atan2(st.dx * Math.sign(p.v), st.dz * Math.sign(p.v));
                break;
              }
            }
          }
          if (p.goal) { // bound for a knot: join it on arrival, or give up if it filled
            const k = p.goal;
            if ((p.v > 0 && p.t >= k.t) || (p.v < 0 && p.t <= k.t)) {
              if (k.members.length < k.want) { this.join(p, k); break; }
              p.goal = null; p.timer = 300 + r() * 600;
            }
          }
          if (p.t > st.len - this.endOf(st, 'b') || p.t < this.endOf(st, 'a')) { this.turnCorner(p); break; } // the corner: round it
          p.yaw = Math.atan2(p.st!.dx * Math.sign(p.v), p.st!.dz * Math.sign(p.v));
          p.frame = ((this.tick + p.phase) >> 3) & 1 ? FRAME.walkB : FRAME.walkA;
          if (--p.timer <= 0) {
            const a = r();
            const here = p.st!;
            if (a < 0.1 && here.kind === 'road' && !this.overWater(here, p.t) && !p.cross) { // in at a door — a real one, on this side, a step away (owner: people vanished into blank walls): gone a while, then out again
              const door = this.doorNear(here, p.t, Math.sign(p.off || 1));
              if (door !== null) { p.act = 'enter'; p.t = door; p.offTo = Math.sign(p.off || 1) * (here.width / 2 + 0.7); p.timer = 300 + r() * 1500; }
              else p.timer = 200 + r() * 400;
            } else if (a < 0.45) { // a pause: a sit on the kerb (the elders often), or a stand
              if (here.kind !== 'alley' && here.kind !== 'catwalk' && r() < (CAST[p.kind].name === 'elder' ? 0.35 : 0.1)) { p.act = 'sit'; p.frame = this.sitFrame(); p.timer = 400 + r() * 900; p.off = this.sitOff(p, here); }
              else { p.act = 'stand'; p.timer = 90 + r() * 360; p.frame = this.idleFrame(); p.yaw += (r() - 0.5) * 2; }
            }
            else if (a < 0.7 && here.kind === 'road') { // cross at the crosswalk, when the cars have the red
              const node = this.nearestCrossing(here, p.t);
              const nx = here.dx ? here.x0 + here.dx * (node ?? 0) : here.x0, nz = here.dz ? here.z0 + here.dz * (node ?? 0) : here.z0;
              if (node !== null && Math.abs(Math.abs(node - p.t) - 7.5) < 2 && !p.cross && !this.landSide(here) && this.crossOK(nx, nz, here.dx ? 'x' : 'z')) { // at the crosswalk (a quay road is not crossed: its water side is not walked)
                p.act = 'cross'; p.offTo = -p.off; p.t = node + (p.t < node ? -7.5 : 7.5); this.crossings += 1;
                p.cross = { tc: node, half: 0, nx, nz, axes: [here.dx ? 'x' : 'z'], tNear: p.t, tFar: p.t }; // (the cars hold for them)
              } else p.timer = 200 + r() * 400;
            } else if (a < 0.85) { // a knot with room takes a passer-by
              const k = this.knots.find((kn) => kn.st === here && Math.sign(kn.off) === Math.sign(p.off) && kn.members.length < kn.want && Math.abs(kn.t - p.t) < 14);
              if (k) { p.goal = k; p.v = Math.abs(p.v) * (k.t > p.t ? 1 : -1); p.timer = 1e9; } // walk over and join it
              else p.timer = 300 + r() * 600;
            } else p.timer = 300 + r() * 900;
          }
          break;
        }
        case 'stand': case 'sit': {
          if (--p.timer <= 0) { const st = p.st!; this.walkOn(p, st, p.act === 'sit' ? this.sameSide(p, st) : p.off, p.t, r() < 0.5 ? 1 : -1); }
          break;
        }
        case 'wait': { // at the kerb: look again every so often
          if (--p.timer <= 0) {
            if (this.mayCross(p.cross!)) { p.act = 'walk'; p.timer = Math.max(p.timer, 200); }
            else p.timer = 10 + r() * 14;
          }
          break;
        }
        case 'cross': {
          const st = p.st!;
          const step = 0.03 * Math.sign(p.offTo - p.off);
          p.off += step;
          p.yaw = Math.atan2(-st.dz * Math.sign(step), st.dx * Math.sign(step));
          p.frame = ((this.tick + p.phase) >> 3) & 1 ? FRAME.walkB : FRAME.walkA;
          if (Math.abs(p.off - p.offTo) < 0.05) { const to = p.offTo; this.walkOn(p, st, to, p.t, r() < 0.5 ? 1 : -1); }
          break;
        }
        case 'enter': case 'exit': { // walking in at a door, or out of one: across the pavement, to the building line and back
          const st = p.st!;
          const step = 0.03 * Math.sign(p.offTo - p.off);
          p.off += step;
          p.yaw = Math.atan2(-st.dz * Math.sign(step), st.dx * Math.sign(step));
          p.frame = ((this.tick + p.phase) >> 3) & 1 ? FRAME.walkB : FRAME.walkA;
          if (Math.abs(p.off - p.offTo) < 0.05) {
            if (p.act === 'enter') { p.act = 'inside'; p.frame = FRAME.stand; }
            else this.walkOn(p, st, p.offTo, p.t, r() < 0.5 ? 1 : -1);
          }
          break;
        }
        case 'inside': {
          if (--p.timer <= 0) { p.act = 'exit'; p.offTo = Math.sign(p.off || 1) * (p.st!.width / 2 - 1 + r() * 0.7); }
          break;
        }
        case 'talk': {
          const k = p.knot!;
          const i = k.members.indexOf(p), n = Math.max(1, k.members.length);
          const a = (i / n) * Math.PI * 2;
          p.x = k.x + Math.sin(a) * 0.75; p.z = k.z + Math.cos(a) * 0.75;
          p.yaw = Math.atan2(k.x - p.x, k.z - p.z);
          p.frame = ((this.tick + p.phase * 3) >> 5) % 3 === 0 ? FRAME.talk : FRAME.stand; // a hand up now and then
          if (--p.timer <= 0) { // leave along the pavement
            k.members.splice(i, 1);
            this.walkOn(p, k.st, k.off, k.t, r() < 0.5 ? 1 : -1);
          }
          break;
        }
        case 'mill': {
          const z = p.zone!;
          const nx = p.x + p.hx * p.v, nz = p.z + p.hz * p.v;
          const hit = this.inStall(z, nx, nz);
          if (hit) {
            if (r() < 0.4) { p.act = 'browse'; p.stall = hit; p.timer = 150 + r() * 400; p.yaw = Math.atan2(hit.x - p.x, hit.z - p.z); p.frame = this.idleFrame(); break; }
            const a = Math.atan2(p.hx, p.hz) + (Math.PI / 2) * (r() < 0.5 ? 1 : -1);
            p.hx = Math.sin(a); p.hz = Math.cos(a);
          } else if (Math.abs(nx - z.x) > z.w / 2 - 1 || Math.abs(nz - z.z) > z.d / 2 - 1) {
            const a = Math.atan2(z.x - p.x, z.z - p.z) + (r() - 0.5) * 1.2;
            p.hx = Math.sin(a); p.hz = Math.cos(a);
          } else { p.x = nx; p.z = nz; }
          if (r() < 0.01) { const a = Math.atan2(p.hx, p.hz) + (r() - 0.5) * 1.5; p.hx = Math.sin(a); p.hz = Math.cos(a); }
          p.yaw = Math.atan2(p.hx, p.hz);
          p.frame = ((this.tick + p.phase) >> 3) & 1 ? FRAME.walkB : FRAME.walkA;
          break;
        }
        case 'browse': {
          if (--p.timer <= 0) { p.act = 'mill'; p.stall = null; const a = p.yaw + Math.PI + (r() - 0.5); p.hx = Math.sin(a); p.hz = Math.cos(a); }
          break;
        }
        case 'vend': {
          p.frame = FRAME.vend;
          if (((this.tick + p.phase) >> 6) & 1) p.yaw += 0.01; // turning to a customer
          break;
        }
      }
      this.place(p);
    }
    // who is in a crosswalk now, by node and axis: the traffic holds its lanes for them (walkersIn)
    this.crossers.clear();
    for (const p of this.people) {
      if (!p.cross || (p.act !== 'cross' && p.act !== 'walk')) continue;
      for (const a of p.cross.axes) { const key = `${Math.round(p.cross.nx)}:${Math.round(p.cross.nz)}:${a}`; this.crossers.set(key, (this.crossers.get(key) ?? 0) + 1); }
    }
  }
}
