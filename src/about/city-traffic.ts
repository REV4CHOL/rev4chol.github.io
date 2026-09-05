/** TRAFFIC — the plan's carriageways as a LANE GRAPH, driven by a
 *  car-following model with traffic lights (owner decrees: vehicles never
 *  glitch through each other, never vanish at an intersection, and the
 *  streets are dense). Every road, the diagonal boulevard, the arterial
 *  under the viaduct, the elevated highway and its ramps are cut into LINKS
 *  between NODES (crossings, T's, ramp joints and merges, dead ends); each
 *  link carries lanes in each direction that stop at the box's near kerb
 *  — the other streets' right of way plus a kerb — and start again past its
 *  far one (a side street's lanes stop before the arterial's pavement; the
 *  arterial's before the side street's kerb); a vehicle
 *  runs its lane to the stop line, waits for its light (or for a gap when
 *  its turn crosses other traffic, or for the box to clear, or for room in
 *  the lane beyond), then crosses the box on an arc about the corner where
 *  its two lane lines meet — an outer-lane turn stays outside the inner
 *  lane's path, an inner-lane turn stays inside the outer's, straight on is
 *  a line — into a lane of the next link, chosen by weight: straight on
 *  mostly, a turn sometimes, an exit ramp now and then. Nothing wraps: a
 *  dead end (the highway's far ends, out in the fog) is a U-turn.
 *
 *  Following: a vehicle's speed is capped by the gap to whatever is ahead
 *  — the next vehicle in its lane, the stop line, the last vehicle still
 *  crossing the box toward its lane, the rearmost vehicle of the lane it is
 *  about to enter — so a queue settles bumper to bumper and never overlaps
 *  (the cap converges on the gap from above). Pure: no DOM, no renderer;
 *  tested. */
import { ARTERIAL_ROW, rampProfile, Street } from './city-plan';

export type VKind = 'car' | 'taxi' | 'bus' | 'truck' | 'moto';
/** The highway's parapets stand from here out to the deck's edge (7): no
 *  lane puts any vehicle past it (owner: cars rode through the outer
 *  barrier). Three lanes a side fit inside it with the widest vehicle. */
export const DECK_KERB = 8;
/** Lane centres from a street's axis: 2.4 apart, the widest vehicle (a bus, 2.3) fitting inside its lane. */
export const OFFSETS: Record<string, number[]> = { road: [1.35, 3.75], diagonal: [1.35, 3.75], highway: [1.4, 3.8, 6.2], ramp: [0], arterial: [3.0, 5.4] }; // (the arterial's median holds the deck's piers)
const SPEED: Record<string, number> = { highway: 1.9, ramp: 1.3, arterial: 1.25 };
export const GREEN = 300;
export const CLEAR = 120; // all red: whoever is in the box gets out
export const PHASE = GREEN + CLEAR; // one street's turn; a node cycles through as many phases as it has streets
export const CYCLE = 2 * PHASE;
const KERB = 1.5; // the stop line sits this far before the crossing street's kerb
const STREET_BOX = 7 + KERB; // a plain street's box: the cycle is timed for a path through it
const G0 = 1.6; // bumper to bumper, a queue settles here
const K = 0.12; // the following gain: the equilibrium gap is G0 + v / K
const ACC = 0.0035;
const LOOK = 18; // a yielding turn waits for anything this close to the box
/** len, w, h, base speed, spread — at a person's scale (owner: the vehicles were toys beside the walkers): a car
 *  a head below a walker's height and two and a half walkers long, a bus two heads over. */
export const SPEC: Record<VKind, [number, number, number, number, number]> = {
  car: [4.4, 1.8, 1.35, 0.1, 0.06], taxi: [4.4, 1.8, 1.35, 0.12, 0.05], bus: [10, 2.3, 3.0, 0.085, 0.01],
  truck: [7.6, 2.2, 2.8, 0.09, 0.02], moto: [2.2, 0.7, 1.1, 0.15, 0.08],
};

export interface Node {
  id: number; x: number; z: number; y: number;
  ports: { link: Link; end: 0 | 1 }[];
  streets: Street[];
  /** The lights' cycle at this node: each street's green and its whole phase (green + all-red), scaled to how far the
   *  box reaches (a side street crossing the arterial's right of way drives 40 units through the box: its cycle is
   *  longer, as a boulevard's is). */
  signal: { offset: number; green: number; phase: number } | null;
  transit: Car[];
  /** Half the box: lanes stop this far before the node's centre and resume this far past it. */
  box: number;
}
export interface Link { id: number; street: Street; t0: number; t1: number; len: number; a: Node; b: Node; lanes: [Lane[], Lane[]]; speed: number }
export interface Exit {
  to: Lane; weight: number; crossing: boolean; straight: boolean;
  /** The highway's far end: the vehicle is carried to the other end in a step (it drove on past the fog; another came). */
  portal?: boolean;
  x0: number; y0: number; z0: number; cx: number; cz: number; x1: number; y1: number; z1: number; S: number;
}
export interface Lane {
  link: Link; dir: 1 | -1; index: number; offset: number;
  /** The street parameter where this lane's run starts (it runs `len` in `dir`). */
  t0: number; len: number;
  cars: Car[]; group: number; end: Node; exits: Exit[];
}
export interface Car {
  kind: VKind; len: number; w: number; h: number; v: number; vmax: number;
  lane: Lane | null; s: number; transit: Transit | null; exit: Exit | null; brake: boolean;
  x: number; y: number; z: number; yaw: number; pitch: number; phase: number; hops: number;
  /** The frame this vehicle last moved in — a handoff never moves it twice. */
  moved: number;
  /** The frame this vehicle last went through a portal (a step across the map, by design). */
  warped: number;
  /** Frames spent waiting at a stop line for a gap: a long wait accepts a shorter one (owner: a T onto the arterial
   *  never saw an 18-unit gap in the dense hour and its cars stood for ever). */
  waited: number;
}
interface Transit { node: Node; from: Lane; ex: Exit; s: number }

const P = { x: 0, y: 0, z: 0 };
const Q = { x: 0, y: 0, z: 0 };
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** A point on a street at parameter t, `o` units along its left normal —
 *  at the street's elevation (a ramp's run slopes on the plan's profile; the
 *  canal's bridges are flush with the streets). */
export function streetPoint(st: Street, t: number, o: number, out: { x: number; y: number; z: number }): void {
  out.x = st.x0 + st.dx * t - st.dz * o;
  out.z = st.z0 + st.dz * t + st.dx * o;
  out.y = st.y1 === undefined ? st.y : st.y + (st.y1 - st.y) * rampProfile(clamp(t / st.len, 0, 1));
}
/** Half a street's right of way: what another street's lanes stop short of at a node it shares with it. */
const rowOf = (st: Street): number => (st.kind === 'arterial' ? ARTERIAL_ROW : st.width / 2);

function lanePoint(lane: Lane, s: number, out: { x: number; y: number; z: number }): void {
  streetPoint(lane.link.street, lane.t0 + lane.dir * s, lane.offset * lane.dir, out);
}

export class Traffic {
  readonly nodes: Node[] = [];
  readonly links: Link[] = [];
  readonly lanes: Lane[] = [];
  readonly cars: Car[] = [];
  tick = 0;
  /** Vehicles that crossed a stop line on red (never, by construction). */
  violations = 0;
  /** Lane-to-lane handoffs through the nodes — how much of the graph is lived in. */
  hops = 0;

  constructor(streets: Street[], private readonly rand: () => number) {
    const ways = streets.filter((s) => s.kind === 'road' || s.kind === 'highway' || s.kind === 'diagonal' || s.kind === 'ramp' || s.kind === 'arterial');
    const surface = (s: Street) => s.kind === 'road' || s.kind === 'diagonal' || s.kind === 'arterial';
    const cuts: { t: number; node: Node }[][] = ways.map(() => []);
    const cells = new Map<string, Node[]>();
    const nodeAt = (x: number, z: number, y: number): Node => {
      const kx = Math.floor(x / 8), kz = Math.floor(z / 8);
      for (let ix = kx - 1; ix <= kx + 1; ix++) {
        for (let iz = kz - 1; iz <= kz + 1; iz++) {
          const list = cells.get(`${ix}:${iz}`);
          if (list) for (const n of list) if (Math.hypot(n.x - x, n.z - z) < 1.2 && Math.abs(n.y - y) < 3) return n;
        }
      }
      const n: Node = { id: this.nodes.length, x, z, y, ports: [], streets: [], signal: null, transit: [], box: KERB };
      this.nodes.push(n);
      const k = `${kx}:${kz}`;
      const list = cells.get(k);
      if (list) list.push(n); else cells.set(k, [n]);
      return n;
    };
    const cutAt = (i: number, t: number, node?: Node) => {
      const s = ways[i];
      const tt = clamp(t, 0, s.len);
      if (!node) { streetPoint(s, tt, 0, P); node = nodeAt(P.x, P.z, P.y); }
      cuts[i].push({ t: tt, node });
      return node;
    };
    ways.forEach((s, i) => { if (s.kind !== 'ramp') { cutAt(i, 0); cutAt(i, s.len); } }); // a ramp's ends are its joins
    // crossings between surface streets; the highway is elevated (roads pass
    // under it), the ramps join by their ends
    for (let i = 0; i < ways.length; i++) {
      const a = ways[i];
      if (!surface(a)) continue;
      for (let j = i + 1; j < ways.length; j++) {
        const b = ways[j];
        if (!surface(b)) continue;
        const den = a.dx * b.dz - a.dz * b.dx;
        if (Math.abs(den) < 1e-6) continue;
        const rx = b.x0 - a.x0, rz = b.z0 - a.z0;
        const ta = (rx * b.dz - rz * b.dx) / den, tb = (rx * a.dz - rz * a.dx) / den;
        if (ta < -0.5 || ta > a.len + 0.5 || tb < -0.5 || tb > b.len + 0.5) continue;
        const n = cutAt(i, ta);
        cutAt(j, tb, n);
      }
    }
    // a ramp is a chain of pieces: a piece's end meeting another piece's end is a JOINT (one node for both); a
    // loose end at deck height hangs off the highway's edge lane (a taper), a loose end at grade merges into the
    // arterial's kerb lane (a slip) — the node sits on the carriageway's axis, the arc across the box does the merge
    ways.forEach((r, i) => {
      if (r.kind !== 'ramp') return;
      for (const end of [0, 1] as const) {
        const t = end ? r.len : 0;
        const y = end ? (r.y1 ?? r.y) : r.y;
        const x = r.x0 + r.dx * t, z = r.z0 + r.dz * t;
        const joint = ways.some((w, j) => j !== i && w.kind === 'ramp' && [0, w.len].some((tw) => Math.hypot(w.x0 + w.dx * tw - x, w.z0 + w.dz * tw - z) < 0.6));
        if (joint) { cutAt(i, t); continue; }
        const deck = y > 1;
        let best = -1, bestT = 0, bestD = deck ? 10 : 12;
        ways.forEach((w, j) => {
          if (w.kind === 'ramp' || deck !== (w.kind === 'highway')) return;
          if (deck && Math.abs(w.y - y) > 1.5) return;
          const t2 = (x - w.x0) * w.dx + (z - w.z0) * w.dz;
          if (t2 < 0 || t2 > w.len) return;
          const d = Math.hypot(w.x0 + w.dx * t2 - x, w.z0 + w.dz * t2 - z);
          if (d < bestD) { bestD = d; best = j; bestT = t2; }
        });
        if (best < 0) { cutAt(i, t); continue; } // dangling — never, by the plan's placement
        const n = cutAt(best, bestT);
        cutAt(i, t, n);
      }
    });
    // links between consecutive cuts along each way
    ways.forEach((st, i) => {
      const list = cuts[i].sort((p, q) => p.t - q.t);
      let prev = list[0];
      for (let k = 1; k < list.length; k++) {
        const c = list[k];
        if (c.t - prev.t < 1 || c.node === prev.node) continue;
        const link: Link = {
          id: this.links.length, street: st, t0: prev.t, t1: c.t, len: c.t - prev.t, a: prev.node, b: c.node,
          lanes: [[], []], speed: SPEED[st.kind] ?? 1,
        };
        this.links.push(link);
        for (const [n, end] of [[link.a, 0], [link.b, 1]] as [Node, 0 | 1][]) {
          n.ports.push({ link, end });
          if (!n.streets.includes(st)) n.streets.push(st);
        }
        prev = c;
      }
    });
    // the box at every node is the widest right of way plus a kerb (a street's own lanes stop short of the OTHER
    // streets' right of way: boxFor — a ramp runs inside the arterial's right of way, so its slip stops at the
    // carriageway, not the pavement); lights where two streets cross on the ground (a ramp's joint, mount and merge
    // yield by gap), their cycle scaled to the box's reach
    const boxFor = (n: Node, st: Street) => KERB + n.streets.reduce((m, s) => (s === st ? m : Math.max(m, st.kind === 'ramp' && s.kind === 'arterial' ? s.width / 2 : rowOf(s))), n.streets.length > 1 ? 0 : rowOf(st));
    for (const n of this.nodes) {
      n.box = n.streets.reduce((m, s) => Math.max(m, rowOf(s)), 0) + KERB;
      // lights only where two streets CROSS; a T-junction runs on priority — the through road flows, the ending
      // road yields (owner: the city jammed solid — the rim roads, a T at every block, stopped for two thirds of
      // every cycle and became the sink every straight-driving vehicle ended in)
      const lit = n.streets.length >= 2 && n.ports.length >= 4 && !n.streets.some((s) => s.kind === 'highway' || s.kind === 'ramp');
      if (lit) {
        const reach = n.streets.reduce((m, s) => Math.max(m, boxFor(n, s)), 0); // the longest approach's box: half the longest path through
        const k = Math.min(3, Math.max(1, reach / (STREET_BOX)));
        n.signal = { offset: Math.floor(this.rand() * CYCLE), green: Math.round(GREEN * k), phase: Math.round(PHASE * k) };
      }
    }
    // lanes: each direction of each link, trimmed to the boxes at its ends — the other streets' right of way there
    for (const link of this.links) {
      const st = link.street;
      let ta = boxFor(link.a, st), tb = boxFor(link.b, st);
      if (link.len - ta - tb < 2) { const f = (link.len - 2) / (ta + tb); ta *= f; tb *= f; }
      const offs = OFFSETS[st.kind] ?? [1.7];
      for (const dir of (st.oneWay ? [1] : [1, -1]) as (1 | -1)[]) {
        offs.forEach((offset, index) => {
          const lane: Lane = {
            link, dir, index, offset, t0: dir > 0 ? link.t0 + ta : link.t1 - tb, len: link.len - ta - tb,
            cars: [], group: 0, end: dir > 0 ? link.b : link.a, exits: [],
          };
          link.lanes[dir > 0 ? 0 : 1].push(lane);
          this.lanes.push(lane);
        });
      }
    }
    for (const lane of this.lanes) this.wire(lane);
  }

  private groupOf(n: Node, st: Street): number { return Math.max(0, n.streets.indexOf(st)); }

  /** A lane's exits at its end node: every outgoing lane of every other link
   *  there (the same link only as a U-turn at a dead end), with the arc
   *  across the box, a weight, and whether the turn crosses other traffic. */
  private wire(lane: Lane): void {
    const n = lane.end, L = lane.link, st = L.street;
    lane.group = this.groupOf(n, st);
    const ux = st.dx * lane.dir, uz = st.dz * lane.dir; // our heading
    const nx = -uz, nz = ux; // the side we drive on
    lanePoint(lane, lane.len, P);
    const outermost = lane.index === L.lanes[lane.dir > 0 ? 0 : 1].length - 1;
    const add = (link: Link, dirOut: 1 | -1) => {
      const w = link.street;
      const wx = w.dx * dirOut, wz = w.dz * dirOut;
      const dot = ux * wx + uz * wz;
      const straight = dot > 0.9;
      const uturn = dot < -0.9 && link === L;
      if (dot < -0.5 && !uturn) return; // no doubling back through the box
      if (w.kind === 'ramp' && st.kind !== 'ramp' && !outermost) return; // only the edge lane leaves for a ramp (the highway's, the arterial's)
      if (w.kind === 'ramp' && st.kind === 'ramp' && !straight) return; // a chain carries on (its pieces meet within 9°)
      const lanes = link.lanes[dirOut > 0 ? 0 : 1];
      if (!lanes.length) return;
      const crossing = !straight && !uturn && (wx * nx + wz * nz) < -0.3;
      // lane discipline, so no two paths of one green cross: a turn across
      // the oncoming lanes only from the inside lane, a near-side turn only
      // from the outside lane, straight on from any; a ramp joins the edge lane.
      // At a CORNER (two streets, both ending here — the severances leave a few) every lane turns, inner to inner and
      // outer to outer, nested (owner: the outer lane's only exit was a U-turn whose loop swept through the inner lane's turn)
      const corner = n.streets.length === 2 && n.ports.length === 2;
      if (!straight && !uturn && !corner) { if (crossing ? lane.index !== 0 : !outermost) return; }
      const to = st.kind === 'ramp' && w.kind !== 'ramp' ? lanes[lanes.length - 1] : lanes[Math.min(lane.index, lanes.length - 1)]; // a ramp lands on the edge lane
      lanePoint(to, 0, Q);
      // at a T the through road is no highway: carrying on and turning in weigh about the same, so the rim roads
      // drain back into the grid instead of collecting every straight-driving vehicle in the city
      const tee = n.ports.length === 3 && st.kind === 'road';
      // (the arterial is the through road under the viaduct: its traffic mostly stays on it, a third of its kerb lane takes an on-ramp)
      const art = st.kind === 'arterial'; // the through road under the viaduct: most of its traffic stays on it
      const weight = uturn ? 0.001 : w.kind === 'ramp' ? (st.kind === 'ramp' ? 10 : st.kind === 'highway' ? 1.2 : 4) : straight ? (tee ? 2 : w === st ? (art ? 12 : 6) : 3) : crossing ? (art ? 0.6 : 1) : (art ? 0.9 : 1.5);
      let cx = (P.x + Q.x) / 2, cz = (P.z + Q.z) / 2;
      if (uturn) { // a loop out past the dead end, wider from the outer lane, so the lanes' U-turns nest instead of crossing
        const k = 1 + Math.abs(lane.offset) * 1.6;
        cx += ux * k; cz += uz * k;
      }
      if (!straight && !uturn) { // the corner where the two lane lines meet
        const den = ux * wz - uz * wx;
        if (Math.abs(den) > 0.2) {
          const k = ((Q.x - P.x) * wz - (Q.z - P.z) * wx) / den;
          if (k > 0 && k < 30) { cx = P.x + ux * k; cz = P.z + uz * k; }
        }
      }
      let S = 0, lx = P.x, lz = P.z;
      if (Math.hypot(Q.x - P.x, Q.z - P.z) >= 0.4) {
        for (let k = 1; k <= 8; k++) {
          const u = k / 8, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
          const x = a * P.x + b * cx + c * Q.x, z = a * P.z + b * cz + c * Q.z;
          S += Math.hypot(x - lx, z - lz); lx = x; lz = z;
        }
      }
      lane.exits.push({ to, weight, crossing, straight, x0: P.x, y0: P.y, z0: P.z, cx, cz, x1: Q.x, y1: Q.y, z1: Q.z, S });
    };
    for (const p of n.ports) {
      const dirOut: 1 | -1 = p.end === 0 ? 1 : -1;
      if (p.link.street.oneWay && dirOut < 0) continue;
      if (p.link === L) continue;
      add(p.link, dirOut);
    }
    if (!lane.exits.length) {
      if (st.kind === 'highway' || st.kind === 'arterial') this.portal(lane); // the highway and the arterial run on past the fog: nothing turns about on them
      else if (!st.oneWay) add(L, lane.dir > 0 ? -1 : 1); // a dead end: turn around
    }
  }

  /** The highway's (or the arterial's) far end, out in the fog (owner: the cars must drive on past the fog of war
   *  and never return): the lane hands its vehicles to the same lane at the street's other end in one step, as if
   *  they had driven on and others had come in. */
  private portal(lane: Lane): void {
    const st = lane.link.street;
    const links = this.links.filter((l) => l.street === st).sort((a, b) => a.t0 - b.t0);
    const entry = lane.dir > 0 ? links[0] : links[links.length - 1];
    if (!entry) return;
    const lanes = entry.lanes[lane.dir > 0 ? 0 : 1];
    const to = lanes[Math.min(lane.index, lanes.length - 1)];
    if (!to || to === lane) return;
    lanePoint(lane, lane.len, P); lanePoint(to, 0, Q);
    lane.exits.push({ to, weight: 1, crossing: false, straight: true, portal: true, x0: P.x, y0: P.y, z0: P.z, cx: P.x, cz: P.z, x1: Q.x, y1: Q.y, z1: Q.z, S: 0 });
  }

  /** Each street at a lit node gets its own phase in turn: green, then an
   *  all-red to clear the box. */
  green(n: Node, group: number, tick = this.tick): boolean {
    if (!n.signal) return true;
    const { offset, green, phase } = n.signal;
    const c = (tick + offset) % (n.streets.length * phase);
    return Math.floor(c / phase) === group && c % phase < green;
  }

  /** Fill the lanes: `n` vehicles spread by `weight(lane)`, spaced so no
   *  two start overlapping; the mix leans to trucks on the highway. */
  populate(n: number, weight: (lane: Lane) => number): void {
    const r = this.rand;
    const ws = this.lanes.map(weight);
    const total = ws.reduce((a, b) => a + b, 0);
    for (let i = 0; i < n; i++) {
      let pick = r() * total;
      let lane = this.lanes[this.lanes.length - 1];
      for (let k = 0; k < ws.length; k++) { pick -= ws[k]; if (pick <= 0) { lane = this.lanes[k]; break; } }
      const hw = lane.link.street.kind === 'highway';
      const a = r();
      const kind: VKind = hw
        ? (a < 0.42 ? 'car' : a < 0.55 ? 'taxi' : a < 0.82 ? 'truck' : a < 0.9 ? 'bus' : 'moto')
        : (a < 0.5 ? 'car' : a < 0.66 ? 'taxi' : a < 0.73 ? 'bus' : a < 0.78 ? 'truck' : 'moto');
      const [len, w, h, v0, spread] = SPEC[kind];
      const car: Car = {
        kind, len, w, h, v: 0, vmax: v0 + r() * spread, lane: null, s: 0, transit: null, exit: null, brake: false,
        x: 0, y: 0, z: 0, yaw: 0, pitch: 0, phase: r() * 7, hops: 0, moved: 0, warped: -1, waited: 0,
      };
      let placed = false;
      const m = 1 + len / 2;
      if (lane.len < 2 * m + 1) continue;
      for (let tries = 0; tries < 12 && !placed; tries++) {
        const s = m + r() * (lane.len - 2 * m);
        if (lane.cars.every((o) => Math.abs(o.s - s) >= (o.len + len) / 2 + 1.5)) {
          car.s = s; car.v = car.vmax * lane.link.speed * 0.6;
          this.insert(lane, car);
          placed = true;
        }
      }
      if (!placed) continue;
      car.exit = this.choose(lane);
      this.cars.push(car);
      this.place(car);
    }
  }

  private insert(lane: Lane, car: Car): void {
    car.lane = lane; car.transit = null;
    let k = lane.cars.length;
    while (k > 0 && lane.cars[k - 1].s > car.s) k -= 1;
    lane.cars.splice(k, 0, car);
  }

  private choose(lane: Lane): Exit | null {
    if (!lane.exits.length) return null;
    let total = 0;
    for (const e of lane.exits) total += e.weight;
    let pick = this.rand() * total;
    for (const e of lane.exits) { pick -= e.weight; if (pick <= 0) return e; }
    return lane.exits[lane.exits.length - 1];
  }

  /** One frame of everybody. */
  step(): void {
    this.tick += 1;
    const tick = this.tick;
    for (const lane of this.lanes) {
      const cars = lane.cars;
      for (let i = cars.length - 1; i >= 0; i--) {
        const c = cars[i];
        if (c.moved === tick) continue;
        c.moved = tick;
        let gap: number;
        if (i < cars.length - 1) { const L = cars[i + 1]; gap = L.s - L.len / 2 - c.s - c.len / 2; }
        else gap = this.frontGap(c, lane, tick);
        this.drive(c, gap, lane.link.speed);
        c.s += c.v;
      }
      while (cars.length && cars[cars.length - 1].s >= lane.len) this.leave(cars.pop()!, lane, tick);
    }
    for (const n of this.nodes) if (n.transit.length) this.cross(n);
    for (const c of this.cars) this.place(c);
  }

  /** What the front vehicle of a lane has ahead of it: the stop line when
   *  it must wait — red, the box still busy from the other group, its turn
   *  yielding — else whatever is first along its path past the line. */
  private frontGap(c: Car, lane: Lane, tick: number): number {
    const ahead = lane.len - c.s - c.len / 2; // bumper to the stop line
    const n = lane.end;
    if (!c.exit) c.exit = this.choose(lane);
    const ex = c.exit;
    if (!ex) return ahead;
    let gap = 1e9;
    const room = this.entryRoom(ex, n); // from the stop line, along the path, to the first rear bumper
    if (room < 1e8) gap = ahead + room - c.len / 2;
    // committed once the nose is over the line — unless the lane is too short to have stopped in (a ramp's foot a
    // few units from a crossing leaves lanes of two or three units: a vehicle lands in one already over the line
    // and used to sail through red, turners and full lanes alike)
    if (ahead > 0.3 || lane.len < c.len + G0 + 0.3) {
      let wait = n.signal !== null && (!this.green(n, lane.group, tick) || this.boxBusy(n, lane.group));
      if (!wait && ex.crossing) wait = this.yieldBusy(lane, c.waited > 600 ? LOOK * 0.45 : LOOK); // patience: after ten seconds at the line a shorter gap will do
      // DON'T BLOCK THE BOX (owner: the city jammed solid, then nothing moved — vehicles entered the boxes
      // without room to clear them, stalled mid-crossing, and every stalled box held its cross street):
      // no room past the box for the whole vehicle → hold at the line
      if (!wait && ex.S >= 0.4 && room < ex.S + c.len + G0) {
        // a driver facing a full lane takes another exit if one has room (the highway's edge lane used to park
        // behind exiters waiting on a full ramp); else hold
        const alt = this.detour(c, lane, n, ex);
        if (alt) { c.exit = alt; return this.frontGap(c, lane, tick); }
        wait = true;
      }
      // a turn across the oncoming holds through the green for a gap the dense hour never gives; it may complete at
      // the start of its own all-red — the oncoming is held, the box is watched by everyone who follows
      if (wait && ex.crossing && n.signal && this.lateTurn(n, lane.group, tick) && !this.boxBusy(n, lane.group) && !this.yieldBusy(lane)) wait = false;
      // someone is turning across this path: they went first; this one holds until they are through
      if (!wait && !ex.crossing) wait = this.turnerCrossing(n, lane);
      if (wait) gap = Math.min(gap, ahead);
      c.waited = wait && c.v < 0.005 ? c.waited + 1 : 0;
    }
    return gap;
  }

  /** Distance from the stop line, along the exit's path, to the rear bumper
   *  of the nearest vehicle already on it: crossing the box toward the same
   *  lane, or waiting at the start of that lane. */
  private entryRoom(ex: Exit, n: Node): number {
    let room = 1e9;
    for (const t of n.transit) {
      if (!t.transit || t.transit.ex.to !== ex.to) continue;
      room = Math.min(room, t.transit.s - t.len / 2);
    }
    const r = ex.to.cars[0];
    if (r) room = Math.min(room, ex.S + r.s - r.len / 2);
    return room;
  }

  /** Anything of the OTHER signal group still inside the box — crossing it,
   *  or not yet clear of it on the way out; the all-red is a courtesy, this
   *  is the rule. */
  private boxBusy(n: Node, group: number): boolean {
    for (const t of n.transit) if (t.transit && t.transit.from.group !== group) return true;
    for (const p of n.ports) {
      if (this.groupOf(n, p.link.street) === group) continue;
      for (const lanes of p.link.lanes) {
        for (const l of lanes) {
          if (l.end === n) continue;
          const r = l.cars[0];
          if (r && r.s < r.len / 2 + 0.3) return true;
        }
      }
    }
    return false;
  }

  /** A turn across other traffic waits for a gap: nothing on any other link
   *  about to enter the box (a light holds the other group back — those are
   *  skipped), nothing crossing it, nothing still leaving it. Two turners
   *  facing each other: the lower link goes first. */
  private yieldBusy(lane: Lane, look = LOOK): boolean {
    const n = lane.end, L = lane.link;
    for (const t of n.transit) {
      if (!t.transit || t.transit.from.link === L) continue;
      if (n.signal && this.groupOf(n, t.transit.from.link.street) !== lane.group) continue;
      return true;
    }
    for (const p of n.ports) {
      if (p.link === L) continue;
      if (n.signal && this.groupOf(n, p.link.street) !== lane.group) continue;
      for (const lanes of p.link.lanes) {
        for (const l of lanes) {
          if (l.end === n) {
            const f = l.cars[l.cars.length - 1];
            if (!f || f.s <= l.len - look) continue;
            // a stopped vehicle holds at its line (it never enters a box it cannot clear) — not a gap-breaker;
            // two turners facing each other: the lower link goes first
            if (f.v < 0.005 && (!f.exit?.crossing || L.id < l.link.id)) continue;
            return true;
          } else {
            const r = l.cars[0];
            if (r && r.s < r.len / 2 + 0.3) return true;
          }
        }
      }
    }
    return false;
  }

  /** Another exit of the lane with room past the box, by weight — or null. */
  private detour(c: Car, lane: Lane, n: Node, not: Exit): Exit | null {
    let total = 0;
    const ok: Exit[] = [];
    for (const e of lane.exits) {
      if (e === not || e.weight < 0.01) continue;
      if (e.S >= 0.4 && this.entryRoom(e, n) < e.S + c.len + G0) continue;
      ok.push(e); total += e.weight;
    }
    if (!ok.length) return null;
    let pick = this.rand() * total;
    for (const e of ok) { pick -= e.weight; if (pick <= 0) return e; }
    return ok[ok.length - 1];
  }

  /** The first stretch of a group's own all-red: a waiting turn may complete in it. */
  lateTurn(n: Node, group: number, tick = this.tick): boolean {
    if (!n.signal) return false;
    const { offset, green, phase } = n.signal;
    const c = (tick + offset) % (n.streets.length * phase);
    return Math.floor(c / phase) === group && c % phase >= green && c % phase < green + 70;
  }

  /** A turn across other traffic is under way in the box, from another link: it went first. */
  private turnerCrossing(n: Node, lane: Lane): boolean {
    for (const t of n.transit) if (t.transit && t.transit.ex.crossing && t.transit.from.link !== lane.link) return true;
    return false;
  }

  private drive(c: Car, gap: number, speed: number): void {
    const vm = c.vmax * speed;
    let v = Math.min(vm, c.v + ACC);
    const cap = Math.max(0, (gap - G0) * K);
    if (cap < v) v = cap;
    c.brake = v < c.v - 0.0012;
    c.v = v;
  }

  /** The front vehicle crossed the stop line: into the box (or straight
   *  into the next lane when the path is a point). */
  private leave(c: Car, lane: Lane, tick: number): void {
    const ex = c.exit ?? this.choose(lane);
    const n = lane.end;
    if (!ex) { c.s = lane.len - 0.01; lane.cars.push(c); return; }
    if (n.signal && !this.green(n, lane.group, tick) && !(ex.crossing && this.lateTurn(n, lane.group, tick)) && c.s - c.v + c.len / 2 < lane.len - 0.5) this.violations += 1;
    const over = c.s - lane.len;
    c.lane = null;
    this.hops += 1; c.hops += 1;
    if (ex.S < 0.4) { if (ex.portal) c.warped = tick; c.s = over; this.insert(ex.to, c); c.exit = this.choose(ex.to); return; }
    c.transit = { node: n, from: lane, ex, s: over };
    c.exit = ex;
    n.transit.push(c);
  }

  private cross(n: Node): void {
    const list = n.transit;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      const t = c.transit!;
      if (c.moved === this.tick) continue;
      c.moved = this.tick;
      let gap = 1e9;
      for (let k = i - 1; k >= 0; k--) { // the vehicle ahead on the same path — or one that left the same lane and is still
        // at the box's mouth, where the two paths have not yet parted (a turner slowing into its arc, a straight follower
        // on its heels: they used to drive through each other)
        const o = list[k];
        if (!o.transit) continue;
        if (o.transit.ex.to === t.ex.to) {
          gap = Math.min(gap, (t.ex.S - t.s) - (o.transit.ex.S - o.transit.s) - (o.len + c.len) / 2);
          break;
        }
        if (o.transit.from === t.from && o.transit.s < 8) gap = Math.min(gap, o.transit.s - t.s - (o.len + c.len) / 2);
      }
      if (gap > 1e8) {
        const r = t.ex.to.cars[0];
        if (r) gap = (t.ex.S - t.s) + r.s - r.len / 2 - c.len / 2;
      }
      this.drive(c, gap, t.ex.to.link.speed * (t.ex.straight ? 1 : 0.7));
      t.s += c.v;
    }
    for (let i = list.length - 1; i >= 0; i--) {
      const c = list[i];
      const t = c.transit!;
      if (t.s < t.ex.S) continue;
      list.splice(i, 1);
      c.s = t.s - t.ex.S;
      this.insert(t.ex.to, c);
      c.exit = this.choose(t.ex.to);
    }
  }

  private place(c: Car): void {
    if (c.lane) {
      lanePoint(c.lane, c.s, P);
      lanePoint(c.lane, c.s + 0.6, Q);
    } else if (c.transit) {
      const t = c.transit, e = t.ex;
      const bez = (u: number, out: { x: number; y: number; z: number }) => {
        const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, cc = u * u;
        out.x = a * e.x0 + b * e.cx + cc * e.x1; out.z = a * e.z0 + b * e.cz + cc * e.z1;
        out.y = e.y0 + (e.y1 - e.y0) * u;
      };
      const u = clamp(t.s / Math.max(0.4, e.S), 0, 1);
      bez(u, P); bez(Math.min(1, u + 0.08), Q);
    } else return;
    c.x = P.x; c.y = P.y; c.z = P.z;
    const dx = Q.x - P.x, dz = Q.z - P.z, dy = Q.y - P.y;
    const dh = Math.hypot(dx, dz);
    if (dh > 1e-4) { c.yaw = Math.atan2(dx, dz); c.pitch = Math.atan2(dy, dh); }
  }
}
