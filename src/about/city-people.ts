/** PEOPLE — the city's pedestrians as lives, not dots (owner: NPCs going
 *  about their business, interacting). Everyone has an ACT: walking a
 *  pavement or an alley; stopping to look at something; standing in a knot
 *  of two or three, talking (knots dissolve and re-form — one leaves, and
 *  a walker from far off is sent along the pavement to take the place);
 *  browsing a market stall; crossing a street at the crosswalk when the
 *  cars have the red; vending from inside a stall; sitting on a step. In a
 *  market zone (a flea lot, the night market's median) people mill between
 *  the stalls instead of following a kerb. A third carry umbrellas, opened
 *  when it rains. Pure: no DOM, no renderer; the renderer draws each
 *  person's position, heading and animation frame. */
import { Stall, Street } from './city-plan';

export type Act = 'walk' | 'stand' | 'talk' | 'browse' | 'cross' | 'vend' | 'sit' | 'mill';
/** Animation frames in the sprite sheet: walk A/B, stand, sit. */
export const FRAME = { walkA: 0, walkB: 1, stand: 2, sit: 3 } as const;
export interface Person {
  x: number; y: number; z: number; yaw: number;
  act: Act; frame: number; tint: number; umbrella: boolean;
  /** The pavement being walked, the offset from its axis, the parameter along it, the pace. */
  st: Street | null; off: number; t: number; v: number;
  timer: number; phase: number;
  /** The knot being talked in, the knot being walked to, the stall being browsed or vended. */
  knot: Knot | null; goal: Knot | null; stall: Stall | null;
  /** The market zone being milled about in, and the heading in it. */
  zone: Zone | null; hx: number; hz: number;
  /** Crossing: the kerb offset being walked toward. */
  offTo: number;
}
interface Knot { x: number; z: number; st: Street; off: number; t: number; members: Person[]; want: number }
export interface Zone { x: number; z: number; w: number; d: number; stalls: Stall[] }
/** Whether the cars along the given axis have the red at the crossing at (x, z). */
export type CrossOK = (x: number, z: number, axis: 'x' | 'z') => boolean;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export class People {
  readonly people: Person[] = [];
  readonly knots: Knot[] = [];
  private readonly walkable: Street[];
  private readonly weights: number[];
  private readonly total: number;
  tick = 0;
  /** How wet the streets are (0..1) — with rain, the umbrellas open. */
  rain = 0;
  /** Crossings made, for the record. */
  crossings = 0;

  constructor(
    streets: Street[], zones: Zone[], stalls: Stall[], private readonly rand: () => number, n: number,
    private readonly crossOK: CrossOK = () => false, private readonly nodes: number[] = [],
  ) {
    this.walkable = streets.filter((s) => s.kind === 'road' || s.kind === 'alley' || s.kind === 'diagonal');
    this.weights = this.walkable.map((s) => (s.kind === 'alley' ? s.len * 3 : s.len));
    this.total = this.weights.reduce((a, b) => a + b, 0);
    const r = rand;
    for (const st of stalls) { // a vendor in every stall
      const p = this.person();
      p.act = 'vend'; p.stall = st; p.x = st.x; p.z = st.z + 0.3; p.yaw = r() < 0.5 ? 0 : Math.PI; p.frame = FRAME.stand;
    }
    for (let i = 0, knots = Math.max(8, Math.floor(n / 45)); i < knots; i++) { // knots of talk on the pavements
      const st = this.pickStreet();
      const t = 6 + r() * Math.max(1, st.len - 12);
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
        p.v = 0.012 + r() * 0.014;
      }
    }
    while (this.people.length < n) { // and the walkers
      const p = this.person();
      const st = this.pickStreet();
      this.walkOn(p, st, this.kerb(st), r() * st.len, r() < 0.5 ? 1 : -1);
      if (r() < 0.08) { p.act = 'stand'; p.timer = 100 + r() * 300; p.frame = FRAME.stand; }
      else if (r() < 0.05 && st.kind !== 'alley') { p.act = 'sit'; p.frame = FRAME.sit; p.timer = 400 + r() * 900; p.off *= 1.15; }
    }
    for (const p of this.people) this.place(p);
  }

  private person(): Person {
    const p: Person = {
      x: 0, y: 0, z: 0, yaw: 0, act: 'walk', frame: 0, tint: Math.floor(this.rand() * 8), umbrella: this.rand() < 0.35,
      st: null, off: 0, t: 0, v: 0, timer: 0, phase: Math.floor(this.rand() * 40), knot: null, goal: null, stall: null,
      zone: null, hx: 0, hz: 1, offTo: 0,
    };
    this.people.push(p);
    return p;
  }

  private pickStreet(): Street {
    let pick = this.rand() * this.total;
    for (let i = 0; i < this.walkable.length; i++) { pick -= this.weights[i]; if (pick <= 0) return this.walkable[i]; }
    return this.walkable[this.walkable.length - 1];
  }

  /** A pavement offset: a kerb side of a road, anywhere across an alley. */
  private kerb(st: Street): number {
    if (st.kind === 'alley') return (this.rand() - 0.5) * (st.width - 1.5);
    return (this.rand() < 0.5 ? 1 : -1) * (st.width / 2 - 1);
  }

  private walkOn(p: Person, st: Street, off: number, t: number, dir: 1 | -1): void {
    p.st = st; p.off = off; p.t = clamp(t, 0, st.len);
    p.v = (0.016 + this.rand() * 0.02) * dir;
    p.act = 'walk'; p.knot = null; p.goal = null; p.stall = null; p.zone = null;
    p.timer = 400 + this.rand() * 1800; // until the next pause
  }

  private join(p: Person, k: Knot): void {
    p.act = 'talk'; p.knot = k; p.goal = null; p.st = k.st; p.off = k.off; p.t = k.t; p.v = 0;
    k.members.push(p);
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

  /** The kerb point of the street being walked (the market people keep their own x, z). */
  private place(p: Person): void {
    if (p.act === 'mill' || p.act === 'browse' || p.act === 'vend' || p.act === 'talk') { p.y = p.st?.y ?? 0; return; }
    const st = p.st;
    if (!st) return;
    p.x = st.x0 + st.dx * p.t - st.dz * p.off;
    p.z = st.z0 + st.dz * p.t + st.dx * p.off;
    p.y = st.y;
  }

  /** Crossings along a road: the street centres it crosses, as its own parameter. */
  private nearestCrossing(st: Street, t: number): number | null {
    let best: number | null = null;
    for (const c of this.nodes) {
      const tc = st.dx ? (c - st.x0) / st.dx : (c - st.z0) / st.dz;
      if (tc < 4 || tc > st.len - 4) continue;
      if (best === null || Math.abs(tc - t) < Math.abs(best - t)) best = tc;
    }
    return best;
  }

  /** A knot keeps its number: when it thins, a walker far off is sent
   *  along its pavement to take the place. */
  private tendKnot(k: Knot): void {
    if (k.members.length >= k.want || this.rand() > 0.004) return;
    const far = this.people.find((q) => q.act === 'walk' && !q.goal && q.st !== k.st && Math.abs(q.x - k.x) + Math.abs(q.z - k.z) > 120);
    if (!far) return;
    const dir: 1 | -1 = this.rand() < 0.5 ? 1 : -1;
    this.walkOn(far, k.st, k.off, k.t - dir * 24, dir);
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
          if (p.goal) { // bound for a knot: join it on arrival, or give up if it filled
            const k = p.goal;
            if ((p.v > 0 && p.t >= k.t) || (p.v < 0 && p.t <= k.t)) {
              if (k.members.length < k.want) { this.join(p, k); break; }
              p.goal = null; p.timer = 300 + r() * 600;
            }
          }
          if (p.t > st.len || p.t < 0) { // the pavement ends: turn about, or take another street
            if (r() < 0.5) p.v = -p.v;
            else { const next = this.pickStreet(); this.walkOn(p, next, this.kerb(next), r() < 0.5 ? 0 : next.len, r() < 0.5 ? 1 : -1); }
            p.t = clamp(p.t, 0, p.st!.len);
            p.goal = null;
          }
          p.yaw = Math.atan2(p.st!.dx * Math.sign(p.v), p.st!.dz * Math.sign(p.v));
          p.frame = ((this.tick + p.phase) >> 3) & 1 ? FRAME.walkB : FRAME.walkA;
          if (--p.timer <= 0) {
            const a = r();
            const here = p.st!;
            if (a < 0.45) { p.act = 'stand'; p.timer = 90 + r() * 360; p.frame = FRAME.stand; p.yaw += (r() - 0.5) * 2; }
            else if (a < 0.7 && here.kind === 'road') { // cross at the crosswalk, when the cars have the red
              const node = this.nearestCrossing(here, p.t);
              const nx = here.dx ? here.x0 + here.dx * (node ?? 0) : here.x0, nz = here.dz ? here.z0 + here.dz * (node ?? 0) : here.z0;
              if (node !== null && Math.abs(node - p.t) < 9 && this.crossOK(nx, nz, here.dx ? 'x' : 'z')) {
                p.act = 'cross'; p.offTo = -p.off; p.t = node + (p.t < node ? -7.5 : 7.5); this.crossings += 1;
              } else p.timer = 200 + r() * 400;
            } else if (a < 0.85) { // a knot with room takes a passer-by
              const k = this.knots.find((kn) => kn.st === here && kn.members.length < kn.want && Math.abs(kn.t - p.t) < 14);
              if (k) this.join(p, k); else p.timer = 300 + r() * 600;
            } else p.timer = 300 + r() * 900;
          }
          break;
        }
        case 'stand': case 'sit': {
          if (--p.timer <= 0) { const st = p.st!; this.walkOn(p, st, p.act === 'sit' ? this.kerb(st) : p.off, p.t, r() < 0.5 ? 1 : -1); }
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
        case 'talk': {
          const k = p.knot!;
          const i = k.members.indexOf(p), n = Math.max(1, k.members.length);
          const a = (i / n) * Math.PI * 2;
          p.x = k.x + Math.sin(a) * 0.75; p.z = k.z + Math.cos(a) * 0.75;
          p.yaw = Math.atan2(k.x - p.x, k.z - p.z);
          p.frame = FRAME.stand;
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
            if (r() < 0.4) { p.act = 'browse'; p.stall = hit; p.timer = 150 + r() * 400; p.yaw = Math.atan2(hit.x - p.x, hit.z - p.z); p.frame = FRAME.stand; break; }
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
          p.frame = FRAME.stand;
          if (((this.tick + p.phase) >> 6) & 1) p.yaw += 0.01; // turning to a customer
          break;
        }
      }
      this.place(p);
    }
  }
}
