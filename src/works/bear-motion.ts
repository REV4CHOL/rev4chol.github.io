/** THE CUB'S MIND (owner, 2026-10-20: "watching over the panes and being cute. Be sure to give the bear idle
 *  animations. Users can also pet this bear when clicking on him").
 *
 *  What he does, moment to moment, as a pose for works/bear-view.ts to put on his rig:
 *  - he breathes, rocks a little where he sits, flicks an ear, wiggles a foot, tilts his head the way a cub does;
 *  - he watches: the film awake under the pointer, or the pointer itself; with nothing to watch he looks about, and
 *    now and then at you;
 *  - left alone long enough, he nods off (his head drops, the breathing slows, Zs float up), and starts awake when
 *    someone moves;
 *  - petted (a press on him), he squishes, shuts his eyes happy, blushes and gives a heart; stroked (a drag across
 *    him), he leans into it and stays happy; petted fast, he hops for joy, paws up;
 *  - he looks round when the chapter changes, and waves bye when a film is opened.
 *  CALM (the visitor's MOTION switch): he sits still and does not follow the pointer; petting still makes him happy.
 *  Pure and seeded: the same inputs at the same times give the same cub, so the tests can watch him. */

export interface ArmPose { lift: number; swing: number }
export interface Pose {
  /** the whole cub: squash (− squashed), hop (up, in his units), rock (roll), lean (pitch), all at his seat */
  squash: number; hop: number; rock: number; lean: number;
  /** the belly's breath, 0 → 1 */
  breath: number;
  head: { yaw: number; pitch: number; roll: number };
  ears: [number, number];
  arms: [ArmPose, ArmPose];
  feet: [number, number];
  /** eyes shut happy and cheeks blushing, 0 → 1 */
  happy: number;
  /** nodded off, 0 → 1 */
  dozy: number;
}
export type CubEvent = { kind: 'heart'; n: number } | { kind: 'z' } | { kind: 'squeak'; big: boolean } | { kind: 'hello' };
export type Reaction = 'flip' | 'bye' | 'hello';

/** Where his head may turn (radians): yaw + turns him toward the floor, away from you; pitch + looks down. Narrow on
 *  purpose: his skin is the three-quarter photograph, and turned much past it his face would stretch. */
export const LOOK = { yawMin: -0.26, yawMax: 0.22, pitchMin: -0.2, pitchMax: 0.26 };
/** His paws lift only a little (a paw raised high would open his side, which no photograph saw). */
export const PAW_LIFT = 0.34;
/** How long he waits with nothing happening before he nods off, and how long the nodding off takes (s). */
export const DOZE_AFTER = 28, DOZE_IN = 3.5;
/** A press that comes this soon after the last counts toward a joyful flurry (s), and this many make one. */
export const FLURRY_GAP = 0.9, FLURRY = 4;

/** mulberry32: a small seeded generator, so a cub's quirks repeat for the tests. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
/** A flick: a quick kick that rings down (an ear, a foot, a squish). */
const ring = (dt: number, amp: number, freq: number, decay: number) => (dt < 0 || dt > decay * 6 ? 0 : amp * Math.exp(-dt / decay) * Math.sin(dt * freq));
/** A smooth bump up and back down over `len` seconds. */
const bump = (dt: number, len: number) => (dt < 0 || dt > len ? 0 : Math.sin((Math.PI * dt) / len) ** 2);

export class CubBrain {
  calm = false;
  private rnd: () => number;
  private t = 0;
  // where he looks: the wish, and the head as it follows
  private want: { yaw: number; pitch: number } | null = null;
  private wander = { yaw: 0.12, pitch: 0.04 };
  private head = { yaw: 0.12, pitch: 0.04, roll: 0 };
  private nextWander = 2;
  private tilt = { at: -99, len: 0, roll: 0 };
  private nextTilt = 6;
  private ears: [number, number] = [-99, -99];
  private nextEar: [number, number] = [3, 5];
  private foot: [number, number] = [-99, -99];
  private nextFoot = 8;
  private lastStir = 0;
  private dozy = 0;
  private startle = -99;
  private nextZ = 0;
  private happyUntil = -99;
  private happy = 0;
  private squishAt = -99;
  private pets: number[] = [];
  private joyAt = -99;
  private stroking = false;
  private strokeLean = 0;
  private nextStrokeHeart = 0;
  private waveAt = -99;
  private waveArm = 1;
  private perkAt = -99;
  private events: CubEvent[] = [];

  constructor(seed = 0x7ed) {
    this.rnd = seeded(seed);
  }

  /** What he should watch: an angle off his rest facing (yaw, pitch), or null for nothing in particular. */
  look(target: { yaw: number; pitch: number } | null): void {
    this.want = target;
  }

  /** Someone moved: he stays awake (and wakes, if he had nodded off). */
  stir(t: number): void {
    if (this.dozy > 0.5) this.startle = t;
    this.lastStir = t;
  }

  /** A press on him. */
  pet(t: number): void {
    this.stir(t);
    this.pets = this.pets.filter((p) => t - p < FLURRY_GAP * FLURRY);
    const quick = this.pets.length > 0 && t - this.pets[this.pets.length - 1] < FLURRY_GAP;
    this.pets = quick ? [...this.pets, t] : [t];
    this.happyUntil = t + 1.5;
    this.squishAt = t;
    const joy = this.pets.length >= FLURRY && t - this.joyAt > 1.2;
    if (joy) { this.joyAt = t; this.pets = []; }
    this.events.push({ kind: 'heart', n: joy ? 3 : 1 }, { kind: 'squeak', big: joy });
  }

  /** A stroke across him: on while the finger or the mouse drags over him, with the drag's sideways speed (−1 → 1). */
  stroke(t: number, on: boolean, side = 0): void {
    this.stir(t);
    if (on && !this.stroking) this.nextStrokeHeart = t + 0.25;
    this.stroking = on;
    this.strokeLean = clamp(side, -1, 1);
    if (on) this.happyUntil = Math.max(this.happyUntil, t + 0.6);
  }

  react(kind: Reaction, t: number): void {
    this.stir(t);
    if (kind === 'flip') this.perkAt = t;
    if (kind === 'bye' || kind === 'hello') { this.waveAt = t; this.waveArm = 1; }
    if (kind === 'hello') this.events.push({ kind: 'hello' });
  }

  /** The cub at time t (seconds), advanced from the last call. */
  step(t: number): Pose {
    const dt = clamp(t - this.t, 0, 0.1);
    this.t = t;
    const still = this.calm;
    // dozing: after a long quiet, he nods off; a stir wakes him at once
    const quiet = t - this.lastStir;
    const sleepy = !still && quiet > DOZE_AFTER && !this.stroking;
    this.dozy = sleepy ? Math.min(1, this.dozy + dt / DOZE_IN) : Math.max(0, this.dozy - dt / 0.35);
    if (this.dozy > 0.9 && t > this.nextZ) { this.events.push({ kind: 'z' }); this.nextZ = t + 1.7; }
    // the happy face: up quickly, down slowly
    const wantHappy = t < this.happyUntil || this.stroking ? 1 : 0;
    this.happy += (wantHappy - this.happy) * (1 - Math.exp(-dt / (wantHappy ? 0.08 : 0.35)));
    if (this.stroking && t > this.nextStrokeHeart) { this.events.push({ kind: 'heart', n: 1 }); this.nextStrokeHeart = t + 0.7; }

    // where he looks
    if (t > this.nextWander) {
      const atYou = this.rnd() < 0.22;
      this.wander = atYou ? { yaw: -0.2, pitch: -0.02 } : { yaw: -0.12 + this.rnd() * 0.32, pitch: -0.14 + this.rnd() * 0.3 };
      this.nextWander = t + 2.4 + this.rnd() * 3.6;
    }
    const aim = this.want ?? this.wander;
    let ty = clamp(aim.yaw, LOOK.yawMin, LOOK.yawMax), tp = clamp(aim.pitch, LOOK.pitchMin, LOOK.pitchMax);
    if (still) { ty = 0.1; tp = 0.04; }
    tp += this.dozy * 0.36;
    // a cub's head tilt, now and then (and leaning into a stroke)
    if (t > this.nextTilt) {
      this.tilt = { at: t, len: 1.1 + this.rnd() * 1.4, roll: (this.rnd() < 0.5 ? -1 : 1) * (0.12 + this.rnd() * 0.1) };
      this.nextTilt = t + 6 + this.rnd() * 8;
    }
    let tr = still ? 0 : this.tilt.roll * bump(t - this.tilt.at, this.tilt.len);
    tr += this.happy * 0.16 + (this.stroking ? this.strokeLean * 0.14 : 0);
    const ease = (cur: number, to: number, tau: number) => cur + (to - cur) * (1 - Math.exp(-dt / tau));
    this.head.yaw = ease(this.head.yaw, ty, still ? 0.001 : 0.32);
    this.head.pitch = ease(this.head.pitch, tp, still ? 0.001 : 0.32 + this.dozy * 0.8);
    this.head.roll = ease(this.head.roll, tr, still ? 0.12 : 0.25);
    // the startle on waking: a quick shake of the head
    const shake = still ? 0 : ring(t - this.startle, 0.13, 26, 0.18);

    // ears: a flick each, now and then; both perk at a chapter change; both lie back while happy
    for (const k of [0, 1] as const) {
      if (t > this.nextEar[k]) { this.ears[k] = t; this.nextEar[k] = t + 3 + this.rnd() * 6.5; }
    }
    const perk = still ? 0 : 0.22 * bump(t - this.perkAt, 0.7) + ring(t - this.startle, 0.25, 30, 0.12);
    const earPose = [0, 1].map((k) => (still ? 0 : ring(t - this.ears[k], 0.3, 34, 0.09)) + perk - this.happy * 0.14 - this.dozy * 0.12) as [number, number];

    // the feet: one wiggles now and then
    if (t > this.nextFoot) { const k = this.rnd() < 0.5 ? 0 : 1; this.foot[k] = t; this.nextFoot = t + 6 + this.rnd() * 9; }
    const feet = [0, 1].map((k) => (still ? 0 : ring(t - this.foot[k], 0.16, 16, 0.35))) as [number, number];

    // the body: breath, rock, the squish of a pet, the hop of joy
    const breathRate = 1 / (3.6 + this.dozy * 1.6);
    const breath = still ? 0.5 : 0.5 + 0.5 * Math.sin(2 * Math.PI * t * breathRate);
    const rock = still ? 0 : 0.022 * Math.sin((2 * Math.PI * t) / 7.3) * (1 - this.dozy * 0.6) + (this.stroking ? this.strokeLean * 0.03 : 0);
    const lean = still ? 0 : 0.012 * Math.sin((2 * Math.PI * t) / 5.1 + 1) + this.dozy * 0.04;
    const squash = still ? 0 : -ring(t - this.squishAt + 0.012, 0.075, 19, 0.16);
    const joyT = t - this.joyAt;
    const hop = still ? 0 : 0.055 * (bump(joyT, 0.42) + 0.6 * bump(joyT - 0.46, 0.36));

    // the arms: a gentle swing; up for joy; a wave
    const joyArms = still ? 0 : PAW_LIFT * Math.max(bump(joyT, 0.5), bump(joyT - 0.46, 0.42));
    const waveT = t - this.waveAt;
    const waving = still || waveT < 0 || waveT > 1.6 ? 0 : Math.min(1, waveT / 0.2, (1.6 - waveT) / 0.25);
    const arms = [0, 1].map((k) => {
      const swing = still ? 0 : 0.045 * Math.sin((2 * Math.PI * t) / 4.1 + k * 1.7);
      const wave = k === this.waveArm ? waving : 0;
      return {
        lift: joyArms + wave * PAW_LIFT * 0.85 + this.happy * 0.06,
        swing: swing + wave * 0.2 * Math.sin(waveT * 13),
      };
    }) as [ArmPose, ArmPose];

    return {
      squash, hop, rock, lean, breath,
      head: { yaw: this.head.yaw + shake, pitch: this.head.pitch, roll: this.head.roll },
      ears: earPose, arms, feet, happy: this.happy, dozy: this.dozy,
    };
  }

  /** What happened since the last call (hearts, Zs, squeaks), for the view to show and sound. */
  drain(): CubEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}
