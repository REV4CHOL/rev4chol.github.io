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
import { ARTERIAL, ARTERIAL_ROW, CANAL, Stall, Street, carriagewayAt } from './city-plan';

/** Walking, or paused, or talking in a knot, or browsing a stall, or crossing a road, or vending, or sitting,
 *  or milling in a market — or going in at a door (enter), gone a while (inside), coming out (exit). */
export type Act = 'walk' | 'stand' | 'talk' | 'browse' | 'cross' | 'vend' | 'sit' | 'mill' | 'enter' | 'inside' | 'exit' | 'wait' | 'perch';
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
  /** A waiter's spot at the kerb — its node's key, null if none — and the frames waited there. */
  spotKey: string | null; waited: number;
  /** The spot's place along the street (its offset is offTo): a waiter walks there, never jumps. */
  tTo: number;
}
interface Knot { x: number; z: number; st: Street; off: number; t: number; members: Person[]; want: number }
/** A place people mill about in: a market, the plaza, a stage's crowd — or a rooftop party, at `y`. */
export interface Zone { x: number; z: number; w: number; d: number; stalls: Stall[]; y?: number }
/** THE MARKET ZONES (owner: crowds standing in the middle of the traffic lanes): the stalls clustered within thirty of
 *  one another — but never across a carriageway (the aprons' stalls either side of the arterial clustered into one zone
 *  whose bounds spanned the road, and its crowd milled among the buses) — each cluster's bounds padded by three. */
export function marketZones(stalls: Stall[], streets: Street[]): Zone[] {
  const zones: Zone[] = [];
  const roadBetween = (a: Stall, b: Stall): boolean => {
    const n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 2));
    for (let k = 1; k < n; k++) { const u = k / n; if (carriagewayAt(streets, a.x + (b.x - a.x) * u, a.z + (b.z - a.z) * u) !== null) return true; }
    return false;
  };
  for (const st of stalls) {
    let z = zones.find((zn) => Math.abs(zn.x - st.x) < 30 && Math.abs(zn.z - st.z) < 30 && !zn.stalls.some((q) => roadBetween(q, st)));
    if (!z) { z = { x: st.x, z: st.z, w: 6, d: 6, stalls: [] }; zones.push(z); }
    z.stalls.push(st);
  }
  for (const z of zones) {
    const xs = z.stalls.map((q) => q.x), zs = z.stalls.map((q) => q.z);
    const x0 = Math.min(...xs) - 3, x1 = Math.max(...xs) + 3, z0 = Math.min(...zs) - 3, z1 = Math.max(...zs) + 3;
    z.x = (x0 + x1) / 2; z.z = (z0 + z1) / 2; z.w = x1 - x0; z.d = z1 - z0;
  }
  return zones;
}
/** Where a pavement runs through another street's carriageway: its centre along the pavement's street, half its
 *  reach along it, the node, and the axes of the streets crossed there ('d' the boulevard). */
export interface Crossing { tc: number; half: number; nx: number; nz: number; axes: Axis[]; tNear: number; tFar: number }
/** A pavement's crossing, with its two ways over, made once (crossingAhead hands them out; nobody changes one). */
type Xing = Crossing & { ways?: [Crossing, Crossing] };
export type Axis = 'x' | 'z' | 'd';
/** Whether the cars along the given axis have the red at the crossing at (x, z) — false where there is no light. */
export type CrossOK = (x: number, z: number, axis: Axis) => boolean;
/** What the pedestrian signal says for crossing a street at a node, for a crossing of so many frames (see Traffic.walk). */
export type WalkOK = (x: number, z: number, axis: Axis, frames: number) => 'walk' | 'flash' | 'dont' | 'unlit';
/** A crosser's pace over a walker's: they hurry across (the walk window is timed for it). */
export const HURRY = 1.5;
/** The slowest a crosser goes through a cross street's carriageway, per frame: a walker's base step, hurried — an elder
 *  hurries across like anyone (owner, 2026-10-11: timed at the slowest walker's own pace, a crossing outlasted its
 *  street's red and WALK never came). */
export const CROSS_STEP = 0.016 * HURRY;
/** Their own street's crosswalk is crossed at this step, whoever crosses (case 'cross'). */
export const OWN_STEP = 0.03 * HURRY;
/** How many frames a crossing of `units` takes at `step`, with a margin: the walk signal is asked for this long. */
export function crossFrames(units: number, step = CROSS_STEP): number { return Math.ceil(units / step) + 20; }
/** Frames a waiter waits at a kerb before turning back the way they came (owner: they waited forever): past any light's
 *  whole cycle, so only a crossing that never opens — an unlit one in an endless stream — runs them out of it. */
export const PATIENCE = 4800;
/** Waiters at a kerb stand this far apart, across the pavement and in rows behind (owner: they stood on top of each other). */
export const SPOT = 0.55;
/** Rows of waiters a kerb holds, at most: a walker who finds them full turns back. */
export const QUEUE = 8;
/** Nobody stops within this of someone already standing still. */
export const STEP_APART = 0.45;
export interface PeopleOpts {
  /** Something solid stands at (x, y, z) — a wall, a kiosk, a stall's leg: nobody walks through it. */
  solid?: (x: number, y: number, z: number) => boolean;
  /** No vehicle is on or bearing down on the crosswalk at (x, z): an unlit crossing may be walked. */
  roadClear?: (x: number, z: number) => boolean;
  /** The pedestrian signal at the lights: with it, a crossing starts only on WALK; without it, on the cars' red (crossOK). */
  walkOK?: WalkOK;
  /** The doors of the city (lit shopfronts, station entrances): the only places anyone goes in or comes out. */
  doors?: { x: number; z: number }[];
  /** Balcony perches: someone stands, sits, leans on the phone or talks here, facing out along yaw. */
  perches?: { x: number; y: number; z: number; yaw: number }[];
  /** A carriageway lies under (x, z): nobody mills or is put down there (owner: crowds in the traffic lanes). */
  onRoad?: (x: number, z: number) => boolean;
  /** The lights make room for a crossing at the node at (x, z) through the streets along `axes` at once, of `frames`
   *  (Traffic.roomToWalk): asked once for every crossing at the lights. */
  walkRoom?: (x: number, z: number, axes: Axis[], frames: number) => void;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
/** A crosswalk's key — its node's rounded centre and the axis crossed — as a number (built for every crosser, every frame). */
const crosserKey = (x: number, z: number, axis: Axis) => ((Math.round(x) + 8192) * 16384 + Math.round(z) + 8192) * 4 + (axis === 'x' ? 0 : axis === 'z' ? 1 : 2);

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
  private crossers = new Map<number, number>();
  /** The spots taken where walkers wait, by node — every kerb of a junction at once, since the corner's pavements
   *  meet there (takeSpot). */
  private readonly spots = new Map<string, { p: Person; x: number; z: number }[]>();
  private readonly solid?: (x: number, y: number, z: number) => boolean;
  private readonly roadClear?: (x: number, z: number) => boolean;
  private readonly onRoad?: (x: number, z: number) => boolean;
  private readonly walkOK?: WalkOK;
  /** Each pavement's crossings of other carriageways, by parameter; each road's doors, by parameter and side. */
  private readonly xings = new Map<Street, Xing[]>();
  private readonly doors: Map<Street, { t: number; side: number; off: number }[]> | null;

  constructor(
    streets: Street[], zones: Zone[], stalls: Stall[], private readonly rand: () => number, n: number,
    private readonly crossOK: CrossOK = () => false, private readonly nodes: number[] = [], opts: PeopleOpts = {},
  ) {
    this.solid = opts.solid; this.roadClear = opts.roadClear; this.walkOK = opts.walkOK; this.onRoad = opts.onRoad;
    this.walkable = streets.filter((s) => s.kind === 'road' || s.kind === 'alley' || s.kind === 'diagonal' || s.kind === 'catwalk' || s.kind === 'arterial' || s.kind === 'lane');
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
    // the lights make room for every crossing at them, a WALK in every cycle (owner: they waited forever at the lights)
    if (opts.walkRoom) for (const list of this.xings.values()) for (const c of list) opts.walkRoom(c.nx, c.nz, c.axes, crossFrames(2 * c.half + 1.2));
    if (opts.doors) {
      this.doors = new Map();
      for (const d of opts.doors) {
        for (const st of this.walkable) {
          if (st.kind !== 'road' && st.kind !== 'arterial' && st.kind !== 'lane') continue;
          const t = (d.x - st.x0) * st.dx + (d.z - st.z0) * st.dz;
          if (t < 3 || t > st.len - 3) continue;
          const lat = -(d.x - st.x0) * st.dz + (d.z - st.z0) * st.dx;
          const line = this.doorOff(st); // the building line (a door stands about it: a shopfront's at it, a station's stair head some way in)
          if (Math.abs(lat) < line - (st.kind === 'arterial' ? 6.5 : 1.7) || Math.abs(lat) > line + 2.0) continue;
          const l = this.doors.get(st) ?? [];
          l.push({ t, side: Math.sign(lat), off: Math.abs(lat) });
          this.doors.set(st, l);
        }
      }
    } else this.doors = null;
    this.weights = this.walkable.map((s) => (s.kind === 'alley' ? s.len * 4 : s.kind === 'catwalk' ? s.len * 2 : s.kind === 'arterial' ? s.len * 1.5 : s.kind === 'lane' ? s.len * 2 : s.len)); // (owner: the alleyways filled up)
    this.total = this.weights.reduce((a, b) => a + b, 0);
    const r = rand;
    for (const st of stalls) { // a vendor in every stall
      const p = this.person();
      p.kind = KIND.vendor; p.pace = 0.9;
      p.act = 'vend'; p.stall = st; p.x = st.x; p.z = st.z + 0.3; p.yaw = r() < 0.5 ? 0 : Math.PI; p.frame = FRAME.vend;
    }
    for (let i = 0, knots = Math.max(8, Math.floor(n / 32)); i < knots; i++) { // knots of talk on the pavements (never on the water)
      let st = this.pickStreet();
      const spot = (s: Street) => { const a = this.endOf(s, 'a'), b = this.endOf(s, 'b'); return a + r() * Math.max(0.5, s.len - a - b); }; // within the pavement's run (owner: a knot stood past a short catwalk's end)
      let t = spot(st);
      let off = this.kerb(st);
      const at = () => ({ x: st.x0 + st.dx * t - st.dz * off, z: st.z0 + st.dz * t + st.dx * off });
      // never on the water, never in a carriageway (owner: a knot on a pavement line stood where a cross street ran through
      // the junction — in the middle of its lanes), never inside something solid
      for (let tries = 0; tries < 40 && (this.overWater(st, t) || this.blocked(at().x, st.y, at().z)); tries++) { st = this.pickStreet(); t = spot(st); off = this.kerb(st); }
      const k: Knot = { ...at(), st, off, t, members: [], want: 2 + Math.floor(r() * 2) };
      this.knots.push(k);
      for (let m = 0; m < k.want; m++) this.join(this.person(), k);
    }
    for (const q of opts.perches ?? []) { // the balconies' people
      if (r() < 0.3) continue;
      const p = this.person();
      p.act = 'perch'; p.x = q.x; p.y = q.y; p.z = q.z; p.yaw = q.yaw + (r() - 0.5) * 0.5; p.frame = this.perchFrame(); p.timer = 200 + r() * 1200;
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
      this.place(p);
      const onRoad = this.onRoad?.(p.x, p.z) ?? false; // (in a crossing's mouth: walk on — nobody pauses in the traffic lanes)
      if (r() < 0.08 && !onRoad && !this.stillNear(p, p.x, p.z, p.y)) { p.act = 'stand'; p.timer = 100 + r() * 300; p.frame = this.idleFrame(); }
      else if (r() < 0.05 && !onRoad && st.kind !== 'alley' && st.kind !== 'catwalk' && this.maySit(p, st)) { p.act = 'sit'; p.frame = this.sitFrame(); p.timer = 400 + r() * 900; p.off = this.sitOff(p, st); }
    }
    for (const p of this.people) this.place(p);
  }

  private person(): Person {
    let pick = this.rand() * CAST_TOTAL, kind = 0;
    for (let i = 0; i < CAST.length; i++) { pick -= CAST[i].weight; if (pick <= 0) { kind = i; break; } }
    const p: Person = {
      x: 0, y: 0, z: 0, yaw: 0, act: 'walk', frame: 0, kind, pace: CAST[kind].pace * (0.85 + this.rand() * 0.3),
      st: null, off: 0, t: 0, v: 0, timer: 0, phase: Math.floor(this.rand() * 40), knot: null, goal: null, stall: null,
      zone: null, hx: 0, hz: 1, offTo: 0, cross: null, spotKey: null, waited: 0, tTo: 0,
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
  /** Where a door stands, from a street's axis: a road's building line, the arterial's. */
  private doorOff(st: Street): number { return st.kind === 'arterial' ? ARTERIAL_ROW - 0.4 : st.width / 2 + 0.7; }
  /** The door on this road, on this side, within a few steps of t (its parameter and how far out it stands) — or, with no
   *  door list, one right here at the building line (the tests' city). */
  private doorNear(st: Street, t: number, side: number): { t: number; off: number } | null {
    if (!this.doors) return { t, off: this.doorOff(st) };
    const list = this.doors.get(st);
    if (!list) return null;
    let best: { t: number; off: number } | null = null;
    for (const d of list) if (d.side === side && Math.abs(d.t - t) < 3 && (best === null || Math.abs(d.t - t) < Math.abs(best.t - t))) best = d;
    return best;
  }
  /** The next cross street's carriageway along the way, when its near kerb is within `reach` (underfoot, by default). */
  private crossingAhead(st: Street, t: number, v: number, reach = 0.05): Crossing | null {
    const list = this.xings.get(st);
    if (!list) return null;
    const dir = Math.sign(v) || 1;
    for (const c of list) {
      if (dir * (c.tc - t) <= 0) continue; // behind, or past the centre
      const tNear = c.tc - dir * (c.half + 0.3);
      if (dir * (tNear - t) > reach) continue; // not there yet
      c.ways ??= [-1, 1].map((d) => ({ tc: c.tc, half: c.half, nx: c.nx, nz: c.nz, axes: c.axes, tNear: c.tc - d * (c.half + 0.3), tFar: c.tc + d * (c.half + 0.3) })) as [Crossing, Crossing];
      return c.ways[dir > 0 ? 1 : 0];
    }
    return null;
  }
  /** What the lights say for starting the crossing from `t` (its kerb line, by default): WALK when every street crossed
   *  shows it for long enough to reach the far kerb from there; UNLIT at a node without lights — or, with no pedestrian
   *  signal, wherever the cars do not all have the red — where a gap decides; else STOP. */
  private lights(c: Crossing, t = c.tNear): 'walk' | 'stop' | 'unlit' {
    if (!this.walkOK) return c.axes.every((a) => this.crossOK(c.nx, c.nz, a)) ? 'walk' : 'unlit';
    const frames = crossFrames(Math.abs(c.tFar - t) + 0.6);
    let walk = true, unlit = true;
    for (const a of c.axes) { const s = this.walkOK(c.nx, c.nz, a, frames); if (s !== 'walk') walk = false; if (s !== 'unlit') unlit = false; }
    return walk ? 'walk' : unlit ? 'unlit' : 'stop';
  }
  /** The crossing may be started from `t`: WALK (lights), or a clear road where a gap decides. */
  private mayCross(c: Crossing, t = c.tNear): boolean {
    const s = this.lights(c, t);
    return s === 'walk' || (s === 'unlit' && this.roadClear !== undefined && this.roadClear(c.nx, c.nz));
  }
  /** Their own street's crosswalk at a node: WALK for its width at OWN_STEP (or, without a pedestrian signal, the cars' red). */
  private mayCrossOwn(nx: number, nz: number, axis: Axis, width: number): boolean {
    if (this.walkOK) return this.walkOK(nx, nz, axis, crossFrames(width - 0.6, OWN_STEP)) === 'walk';
    return this.crossOK(nx, nz, axis);
  }
  /** How many walkers are in the crosswalks of the street along `axis` at the node at (x, z) right now. */
  walkersIn(x: number, z: number, axis: Axis): number {
    return this.crossers.get(crosserKey(x, z, axis)) ?? 0;
  }
  /** What someone on a balcony does: leans and looks (stand), sits, is on the phone, sits with the phone. */
  private perchFrame(): number { const a = this.rand(); return a < 0.4 ? FRAME.stand : a < 0.6 ? FRAME.sit : a < 0.85 ? FRAME.phone : FRAME.sitPhone; }
  /** Where a street's walkers belong: the |offset| band of its pavement — a road's pavement inside its width (the lamp
   *  posts stand at the kerb), the boulevard's past its edge lines, the arterial's beyond its apron (16.9–17.7 from its
   *  axis: the lamps stand at 16.4, the building line at 18.5); an alley or a catwalk is walked anywhere across. */
  private band(s: Street): [number, number] {
    if (s.kind === 'alley') return [0, (s.width - 1.5) / 2];
    if (s.kind === 'catwalk') return [0, (s.width - 0.9) / 2];
    if (s.kind === 'diagonal') return [s.width / 2 + 0.4, s.width / 2 + 0.8];
    if (s.kind === 'lane') return [s.width / 2 - 0.75, s.width / 2 - 0.25]; // the sliver of pavement inside a lane's building line
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
  /** Someone already stands, sits or waits within a step of (x, z) at height y: nobody stops on top of them (owner: people
   *  stood morphed into each other). */
  private stillNear(p: Person, x: number, z: number, y: number): boolean {
    for (const q of this.people) {
      if (q === p || q.act === 'walk' || q.act === 'mill' || q.act === 'cross' || q.act === 'enter' || q.act === 'exit' || q.act === 'inside') continue;
      if (Math.abs(q.x - x) < STEP_APART && Math.abs(q.z - z) < STEP_APART && Math.abs(q.y - y) < 0.5 && Math.hypot(q.x - x, q.z - z) < STEP_APART) return true;
    }
    return false;
  }
  /** Their kerb-side seat on this street is free. */
  private maySit(p: Person, st: Street): boolean {
    const off = this.sitOff(p, st);
    return !this.stillNear(p, st.x0 + st.dx * p.t - st.dz * off, st.z0 + st.dz * p.t + st.dx * off, st.y);
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
    this.leaveSpot(p);
    const a = this.endOf(st, 'a'), b = this.endOf(st, 'b');
    p.st = st; p.off = off; p.t = clamp(t, a, st.len - b);
    if (this.solid) {
      const inside = () => this.solid!(st.x0 + st.dx * p.t - st.dz * p.off, 0.9, st.z0 + st.dz * p.t + st.dx * p.off);
      for (let k = 0; k < 6 && inside(); k++) p.t = clamp(p.t + dir * 2, a, st.len - b); // not inside a kiosk
      for (let k = 0; k < 16 && inside(); k++) p.t = clamp(a + this.rand() * Math.max(0, st.len - a - b), a, st.len - b); // a run through a wall (the stadium's base sits on the arterial's pavement): anywhere else along it
    }
    p.v = (0.016 + this.rand() * 0.02) * p.pace * dir;
    p.act = 'walk'; p.knot = null; p.goal = null; p.stall = null; p.zone = null; p.cross = null;
    p.timer = 400 + this.rand() * 1800; // until the next pause
  }

  /** A waiter's own spot at the kerb (owner: the waiters stood on top of each other): the front row across the pavement
   *  first, nearest the kerb line, then rows behind it along the pavement, SPOT apart — never within a step of another
   *  waiter's at the same junction (a corner's two pavements meet), never in a solid nor past one on the way there. False
   *  with every spot taken: the kerb is full, and the walker turns back instead. */
  private takeSpot(p: Person, st: Street, c: Crossing): boolean {
    this.leaveSpot(p);
    const dir = Math.sign(p.v) || 1, side = Math.sign(p.off) || 1;
    const key = `${Math.round(c.nx)}:${Math.round(c.nz)}`;
    const taken = this.spots.get(key) ?? [];
    const [lo, hi] = this.band(st);
    const across = Math.max(1, Math.floor((hi - lo - 0.3) / SPOT) + 1); // spots across the pavement
    const clear = (t: number, off: number): boolean => { // the straight walk there, a look every 0.3 (the walls' padding)
      if (!this.solid) return true;
      const n = Math.max(1, Math.ceil(Math.hypot(t - p.t, off - p.off) / 0.3));
      for (let i = 1; i <= n; i++) {
        const tt = p.t + ((t - p.t) * i) / n, oo = p.off + ((off - p.off) * i) / n;
        if (this.solid(st.x0 + st.dx * tt - st.dz * oo, 0.9, st.z0 + st.dz * tt + st.dx * oo)) return false;
      }
      return true;
    };
    for (let s = 0; s < across * QUEUE; s++) {
      const off = side * (across === 1 ? (lo + hi) / 2 : lo + 0.15 + (s % across) * ((hi - lo - 0.3) / (across - 1)));
      const t = c.tNear - dir * Math.floor(s / across) * SPOT;
      const x = st.x0 + st.dx * t - st.dz * off, z = st.z0 + st.dz * t + st.dx * off;
      if (taken.some((o) => Math.hypot(o.x - x, o.z - z) < SPOT * 0.8)) continue;
      if (!clear(t, off)) continue;
      taken.push({ p, x, z }); this.spots.set(key, taken);
      p.spotKey = key; p.offTo = off; p.tTo = t;
      return true;
    }
    return false;
  }
  private leaveSpot(p: Person): void {
    if (p.spotKey === null) return;
    const taken = this.spots.get(p.spotKey);
    if (taken) { const i = taken.findIndex((o) => o.p === p); if (i >= 0) taken.splice(i, 1); }
    p.spotKey = null;
  }

  /** Across their own street on the crosswalk at the node at `node` along it (the cars hold for them). */
  private crossOwn(p: Person, st: Street, node: number, nx: number, nz: number): void {
    this.leaveSpot(p);
    p.act = 'cross'; p.offTo = -p.off; p.t = node + (p.t < node ? -7.5 : 7.5); this.crossings += 1;
    p.cross = { tc: node, half: 0, nx, nz, axes: [st.dx ? 'x' : 'z'], tNear: p.t, tFar: p.t };
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

  /** A spot in the zone clear of its stalls, of any carriageway and of anything solid — or the zone's centre. */
  private placeInZone(p: Person): void {
    const z = p.zone!;
    for (let tries = 0; tries < 24; tries++) {
      const x = z.x + (this.rand() - 0.5) * (z.w - 2), zz = z.z + (this.rand() - 0.5) * (z.d - 2);
      if (!this.inStall(z, x, zz) && !this.blocked(x, z.y ?? 0, zz)) { p.x = x; p.z = zz; return; }
    }
    p.x = z.x; p.z = z.z;
  }
  /** Nowhere to stand: a carriageway under it, or something solid at chest height. */
  private blocked(x: number, y: number, z: number): boolean {
    return (this.onRoad?.(x, z) ?? false) || (this.solid?.(x, y + 0.9, z) ?? false);
  }

  private inStall(z: Zone, x: number, zz: number): Stall | null {
    for (const s of z.stalls) if (Math.abs(x - s.x) < 1.9 && Math.abs(zz - s.z) < 1.6) return s;
    return null;
  }

  /** The kerb point of the street being walked (the market people keep their own x, z); someone inside a building is out of sight. */
  private place(p: Person): void {
    if (p.act === 'perch') return; // where they were put, at their balcony's height
    if (p.act === 'mill' || p.act === 'browse') { p.y = p.zone?.y ?? 0; return; } // (a rooftop party mills at roof height)
    if (p.act === 'vend' || p.act === 'talk') { p.y = p.st?.y ?? 0; return; }
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
      if (this.solid && this.solid(nx, 0.9, nz)) continue; // and not inside a stair core or a kiosk
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
          p.t += p.cross ? Math.sign(p.v) * Math.max(Math.abs(p.v) * HURRY, CROSS_STEP) : p.v; // a crosser hurries across, never slower than CROSS_STEP (the walk window is timed for it)
          if (this.solid && ((this.tick + p.phase) & 3) === 0) { // never through a wall, a kiosk, a stall's leg (owner: they walked through buildings): step in toward the kerb, else turn about — looked for every fourth frame, a fifth of a step's reach inside the 0.3 the walls are padded by
            const x = st.x0 + st.dx * p.t - st.dz * p.off, z = st.z0 + st.dz * p.t + st.dx * p.off;
            const solid = this.solid;
            if (solid(x, 0.9, z)) {
              const [lo, hi] = this.band(st), sg = Math.sign(p.off || 1);
              const tryOff = [sg * Math.max(lo, Math.abs(p.off) - 0.7), sg * Math.min(hi, Math.abs(p.off) + 0.7), sg * Math.max(lo, Math.abs(p.off) - 1.2), sg * Math.min(hi, Math.abs(p.off) + 1.2)] // toward the kerb (a vending machine at the wall), toward the wall (a leg at the kerb)
                .find((o) => Math.abs(Math.abs(o) - Math.abs(p.off)) > 0.05 && !solid(st.x0 + st.dx * p.t - st.dz * o, 0.9, st.z0 + st.dz * p.t + st.dx * o));
              if (tryOff !== undefined) p.off = tryOff;
              else { p.t -= p.v; p.v = -p.v; p.goal = null; }
            }
          }
          if (p.cross) { // through a cross street's carriageway: clear of it past its far kerb
            if ((p.v > 0 && p.t > p.cross.tFar) || (p.v < 0 && p.t < p.cross.tFar)) p.cross = null;
          } else {
            const c = this.crossingAhead(st, p.t, p.v, QUEUE * SPOT); // seen from the back of its queue
            if (c) {
              const atKerb = (Math.sign(p.v) || 1) * (c.tNear - p.t) <= 0.05;
              let stop = false;
              if (atKerb) { if (this.mayCross(c, p.t)) p.cross = c; else stop = true; } // at the kerb: across, or wait (owner: they walked into the traffic)
              else if (((this.tick + p.phase) & 7) === 0) { // on the way, a look now and then: they fall in behind at a red, or behind those waiting at an unlit kerb
                const s = this.lights(c, p.t);
                stop = s === 'stop' || (s === 'unlit' && (this.spots.get(`${Math.round(c.nx)}:${Math.round(c.nz)}`)?.length ?? 0) > 0);
              }
              if (stop) {
                if (this.takeSpot(p, st, c)) { p.act = 'wait'; p.cross = c; p.timer = 10 + r() * 14; p.waited = 0; } // at a spot of their own, walked to
                else this.walkOn(p, st, p.off, p.t, p.v > 0 ? -1 : 1); // the kerb is full: back the way they came
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
            if (a < 0.1 && (here.kind === 'road' || here.kind === 'arterial' || here.kind === 'lane') && !this.overWater(here, p.t) && !p.cross) { // in at a door — a real one, on this side, a step away (owner: people vanished into blank walls): gone a while, then out again
              const door = this.doorNear(here, p.t, Math.sign(p.off || 1));
              if (door !== null) { p.act = 'enter'; p.t = door.t; p.offTo = Math.sign(p.off || 1) * door.off; p.timer = 300 + r() * 1500; }
              else p.timer = 200 + r() * 400;
            } else if (a < 0.45) { // a pause: a sit on the kerb (the elders often), or a stand
              if (here.kind !== 'alley' && here.kind !== 'catwalk' && r() < (CAST[p.kind].name === 'elder' ? 0.35 : 0.1)) { if (this.maySit(p, here)) { p.act = 'sit'; p.frame = this.sitFrame(); p.timer = 400 + r() * 900; p.off = this.sitOff(p, here); } else p.timer = 200 + r() * 400; }
              else if (!(this.onRoad?.(p.x, p.z) ?? false) && !this.stillNear(p, p.x, p.z, p.y)) { p.act = 'stand'; p.timer = 90 + r() * 360; p.frame = this.idleFrame(); p.yaw += (r() - 0.5) * 2; }
              else p.timer = 200 + r() * 400;
            }
            else if (a < 0.7 && here.kind === 'road') { // cross at the crosswalk, when the cars have the red
              const node = this.nearestCrossing(here, p.t);
              const nx = here.dx ? here.x0 + here.dx * (node ?? 0) : here.x0, nz = here.dz ? here.z0 + here.dz * (node ?? 0) : here.z0;
              if (node !== null && Math.abs(Math.abs(node - p.t) - 7.5) < 2 && !p.cross && !this.landSide(here) && this.mayCrossOwn(nx, nz, here.dx ? 'x' : 'z', here.width)) this.crossOwn(p, here, node, nx, nz); // at the crosswalk, on WALK (a quay road is not crossed: its water side is not walked)
              else p.timer = 200 + r() * 400;
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
        case 'perch': { // on a balcony: a new pose now and then, a glance along the street, a word to the neighbour
          if (--p.timer <= 0) {
            p.timer = 300 + r() * 1500;
            const mate = this.people.find((q) => q !== p && q.act === 'perch' && Math.abs(q.y - p.y) < 0.2 && Math.hypot(q.x - p.x, q.z - p.z) < 2.2);
            if (mate && r() < 0.5) { p.frame = FRAME.talk; p.yaw = Math.atan2(mate.x - p.x, mate.z - p.z); mate.frame = r() < 0.5 ? FRAME.talk : FRAME.stand; mate.yaw = Math.atan2(p.x - mate.x, p.z - mate.z); }
            else { p.frame = this.perchFrame(); p.yaw += (r() - 0.5) * 0.6; }
          } else if (p.frame === FRAME.talk && (this.tick + p.phase) % 64 < 8) p.frame = FRAME.stand; // a hand up now and then
          break;
        }
        case 'wait': { // at the kerb: to their own spot, then look again every so often, moving up as the queue clears —
          const st = p.st!; // and after a long while, turn back
          const dt = p.tTo - p.t, doff = p.offTo - p.off, d = Math.hypot(dt, doff);
          if (d > 0.02) { // stepping to the spot, at a walker's step
            const k = Math.min(d, 0.03) / d;
            p.t += dt * k; p.off += doff * k;
            p.yaw = Math.atan2(st.dx * dt - st.dz * doff, st.dz * dt + st.dx * doff);
            p.frame = ((this.tick + p.phase) >> 3) & 1 ? FRAME.walkB : FRAME.walkA;
          } else if (p.frame !== FRAME.stand) { // there: facing the crossing
            p.frame = FRAME.stand;
            p.yaw = Math.atan2(st.dx * Math.sign(p.v), st.dz * Math.sign(p.v));
          }
          p.waited += 1;
          if (--p.timer <= 0) {
            const c = p.cross!;
            if (this.mayCross(c, p.t)) { this.leaveSpot(p); p.act = 'walk'; p.timer = Math.max(p.timer, 200); }
            else if (st.kind === 'road' && r() < 0.012 && Math.abs(p.t - c.tNear) < 0.3 && this.nearestCrossing(st, p.t) === c.tc && !this.landSide(st)
              && this.mayCrossOwn(c.nx, c.nz, st.dx ? 'x' : 'z', st.width)) this.crossOwn(p, st, c.tc, c.nx, c.nz); // the front row: some take the WALK across their own street instead
            else if (p.waited > PATIENCE || !this.takeSpot(p, st, c)) this.walkOn(p, st, p.off, p.t, (Math.sign(p.v) || 1) > 0 ? -1 : 1); // back the way they came
            else p.timer = 10 + r() * 14; // (takeSpot: the frontmost spot free now — never further back than their own)
          }
          break;
        }
        case 'cross': {
          const st = p.st!;
          const step = 0.03 * HURRY * Math.sign(p.offTo - p.off); // briskly: the walk window is timed for it
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
          if (--p.timer <= 0) { p.act = 'exit'; p.offTo = this.sameSide(p, p.st!); } // back onto the pavement they came from
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
            if (r() < 0.4 && !this.stillNear(p, p.x, p.z, p.y)) { p.act = 'browse'; p.stall = hit; p.timer = 150 + r() * 400; p.yaw = Math.atan2(hit.x - p.x, hit.z - p.z); p.frame = this.idleFrame(); break; }
            const a = Math.atan2(p.hx, p.hz) + (Math.PI / 2) * (r() < 0.5 ? 1 : -1);
            p.hx = Math.sin(a); p.hz = Math.cos(a);
          } else if (Math.abs(nx - z.x) > z.w / 2 - 1 || Math.abs(nz - z.z) > z.d / 2 - 1) {
            const a = Math.atan2(z.x - p.x, z.z - p.z) + (r() - 0.5) * 1.2;
            p.hx = Math.sin(a); p.hz = Math.cos(a);
          } else if (this.blocked(nx, z.y ?? 0, nz)) { // the road's edge, a wall: turn about, a little askew
            const a = Math.atan2(p.hx, p.hz) + Math.PI + (r() - 0.5) * 1.0;
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
      for (const a of p.cross.axes) { const key = crosserKey(p.cross.nx, p.cross.nz, a); this.crossers.set(key, (this.crossers.get(key) ?? 0) + 1); }
    }
  }
}
